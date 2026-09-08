import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser, UserRole } from '../types';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  getSavedCurrentUser,
  saveCurrentUserSession,
  getLocalUsers,
  saveLocalUser,
  updateLocalUserRole,
} from '../lib/supabase';

interface AuthContextType {
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseOnline: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    username: string,
    password: string,
    role?: UserRole
  ) => Promise<{ success: boolean; error?: string; user?: AppUser }>;
  logout: () => Promise<void>;
  updateRole: (userId: string, newRole: UserRole) => Promise<boolean>;
  registeredUsers: AppUser[];
  refreshUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseOnline, setIsSupabaseOnline] = useState<boolean>(false);
  const [registeredUsers, setRegisteredUsers] = useState<AppUser[]>([]);

  const loadRegisteredUsers = () => {
    const locals = getLocalUsers();
    const mapped: AppUser[] = locals.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
    }));
    setRegisteredUsers(mapped);
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      const configured = isSupabaseConfigured();
      setIsSupabaseOnline(configured);

      // Check for saved local or Supabase session
      const savedUser = getSavedCurrentUser();
      loadRegisteredUsers();

      if (configured) {
        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            const { data } = await supabase.auth.getSession();
            if (data.session?.user) {
              const su = data.session.user;
              // Try to fetch profile from public.profiles
              let role: UserRole = (su.user_metadata?.role as UserRole) || 'superadmin';
              let username = su.user_metadata?.username || su.email?.split('@')[0] || 'Usuário';

              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', su.id)
                .single();

              if (profile) {
                role = profile.role as UserRole;
                username = profile.username || username;
              }

              const appUser: AppUser = {
                id: su.id,
                email: su.email || '',
                username,
                role,
                createdAt: su.created_at || new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
              };

              setCurrentUser(appUser);
              saveCurrentUserSession(appUser);
              setIsLoading(false);
              return;
            }
          } catch (err) {
            console.warn('Erro ao restaurar sessão do Supabase:', err);
          }
        }
      }

      // Fallback: restore saved session if valid
      if (savedUser) {
        setCurrentUser(savedUser);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const configured = isSupabaseConfigured();

    if (configured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (error) {
            return { success: false, error: error.message };
          }

          if (data.user) {
            const su = data.user;
            let role: UserRole = (su.user_metadata?.role as UserRole) || 'superadmin';
            let username = su.user_metadata?.username || su.email?.split('@')[0] || 'Usuário';

            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', su.id)
              .single();

            if (profile) {
              role = profile.role as UserRole;
              username = profile.username || username;
            }

            const appUser: AppUser = {
              id: su.id,
              email: su.email || cleanEmail,
              username,
              role,
              createdAt: su.created_at || new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };

            setCurrentUser(appUser);
            saveCurrentUserSession(appUser);
            loadRegisteredUsers();
            return { success: true };
          }
        } catch (err: any) {
          return { success: false, error: err?.message || 'Falha na autenticação do Supabase' };
        }
      }
    }

    // Local authentication fallback
    const localUsers = getLocalUsers();
    const found = localUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!found) {
      // If no users registered yet, auto-suggest or alert
      if (localUsers.length === 0) {
        return {
          success: false,
          error: 'Nenhum usuário cadastrado ainda. Use a aba "Criar Cadastro Inicial" para cadastrar o Superadmin.',
        };
      }
      return { success: false, error: 'E-mail ou senha incorretos.' };
    }

    if (found.passwordHash !== password) {
      return { success: false, error: 'Senha incorreta para este usuário.' };
    }

    const appUser: AppUser = {
      id: found.id,
      email: found.email,
      username: found.username,
      role: found.role,
      createdAt: found.createdAt,
      lastLoginAt: new Date().toISOString(),
    };

    setCurrentUser(appUser);
    saveCurrentUserSession(appUser);
    loadRegisteredUsers();
    return { success: true };
  };

  const register = async (
    email: string,
    username: string,
    password: string,
    desiredRole?: UserRole
  ): Promise<{ success: boolean; error?: string; user?: AppUser }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    if (!cleanEmail || !cleanUsername || !password) {
      return { success: false, error: 'Preencha todos os campos obrigatórios (e-mail, usuário e senha).' };
    }

    if (password.length < 6) {
      return { success: false, error: 'A senha deve conter no mínimo 6 caracteres.' };
    }

    // Determine initial role: First user is automatically 'superadmin'
    const existingLocals = getLocalUsers();
    const isFirstUser = existingLocals.length === 0;
    const assignedRole: UserRole = desiredRole || (isFirstUser ? 'superadmin' : 'superadmin');

    const configured = isSupabaseConfigured();

    if (configured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                username: cleanUsername,
                role: assignedRole,
              },
            },
          });

          if (error) {
            return { success: false, error: error.message };
          }

          if (data.user) {
            const su = data.user;
            const appUser: AppUser = {
              id: su.id,
              email: su.email || cleanEmail,
              username: cleanUsername,
              role: assignedRole,
              createdAt: su.created_at || new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };

            // Also keep local fallback record
            saveLocalUser({
              id: su.id,
              email: cleanEmail,
              username: cleanUsername,
              passwordHash: password,
              role: assignedRole,
              createdAt: appUser.createdAt,
            });

            setCurrentUser(appUser);
            saveCurrentUserSession(appUser);
            loadRegisteredUsers();
            return { success: true, user: appUser };
          }
        } catch (err: any) {
          return { success: false, error: err?.message || 'Falha ao cadastrar no Supabase' };
        }
      }
    }

    // Local registration
    const existing = existingLocals.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, error: 'Este e-mail já está cadastrado no sistema.' };
    }

    const newId = 'usr_' + Date.now();
    const newUserRecord = {
      id: newId,
      email: cleanEmail,
      username: cleanUsername,
      passwordHash: password,
      role: assignedRole,
      createdAt: new Date().toISOString(),
    };

    saveLocalUser(newUserRecord);

    const appUser: AppUser = {
      id: newId,
      email: cleanEmail,
      username: cleanUsername,
      role: assignedRole,
      createdAt: newUserRecord.createdAt,
      lastLoginAt: new Date().toISOString(),
    };

    setCurrentUser(appUser);
    saveCurrentUserSession(appUser);
    loadRegisteredUsers();

    return { success: true, user: appUser };
  };

  const logout = async () => {
    const configured = isSupabaseConfigured();
    if (configured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.warn('Erro no signOut do Supabase:', err);
        }
      }
    }

    setCurrentUser(null);
    saveCurrentUserSession(null);
  };

  const updateRole = async (userId: string, newRole: UserRole): Promise<boolean> => {
    const configured = isSupabaseConfigured();
    if (configured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        } catch (err) {
          console.warn('Erro ao atualizar papel no Supabase:', err);
        }
      }
    }

    const success = updateLocalUserRole(userId, newRole);
    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, role: newRole } : null));
    }
    loadRegisteredUsers();
    return success;
  };

  const refreshUsers = () => {
    loadRegisteredUsers();
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: Boolean(currentUser),
        isLoading,
        isSupabaseOnline,
        login,
        register,
        logout,
        updateRole,
        registeredUsers,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
