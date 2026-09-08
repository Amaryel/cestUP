import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser, UserRole, UserStatus } from '../types';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  getSavedCurrentUser,
  saveCurrentUserSession,
  getLocalUsers,
  saveLocalUser,
  findLocalUserByIdentifier,
  updateLocalUserRoleAndStatus,
  updateLocalUserProfile,
  deleteLocalUser,
  isMasterSuperAdmin,
  MASTER_ADMIN_EMAIL,
  MASTER_ADMIN_USERNAME,
} from '../lib/supabase';

interface AuthContextType {
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseOnline: boolean;
  isMasterAdmin: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    username: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; user?: AppUser }>;
  logout: () => Promise<void>;
  updateUserRoleAndStatus: (
    userId: string,
    role?: UserRole,
    status?: UserStatus,
    companyId?: string,
    companyName?: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateCurrentUserProfile: (params: {
    username?: string;
    password?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  createUserByAdmin: (params: {
    email: string;
    username: string;
    password: string;
    role: UserRole;
    status: UserStatus;
    companyId?: string;
    companyName?: string;
  }) => Promise<{ success: boolean; error?: string; user?: AppUser }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  registeredUsers: AppUser[];
  refreshUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseOnline, setIsSupabaseOnline] = useState<boolean>(false);
  const [registeredUsers, setRegisteredUsers] = useState<AppUser[]>([]);

  const loadRegisteredUsers = async () => {
    const locals = getLocalUsers();
    const configured = isSupabaseConfigured();

    if (configured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && profiles && profiles.length > 0) {
            const mappedSupabase: AppUser[] = profiles.map((p) => {
              const isMaster = isMasterSuperAdmin(p.email) || isMasterSuperAdmin(p.username);
              return {
                id: p.id,
                email: p.email,
                username: p.username || p.email.split('@')[0],
                role: isMaster ? 'superadmin' : (p.role as UserRole) || 'operator',
                status: isMaster ? 'active' : (p.status as UserStatus) || 'active',
                companyId: p.company_id || undefined,
                createdAt: p.created_at || new Date().toISOString(),
                isMasterSuperAdmin: isMaster,
              };
            });

            // Merge with local users (ensuring no duplicates)
            const mergedMap = new Map<string, AppUser>();
            mappedSupabase.forEach((u) => mergedMap.set(u.id, u));
            locals.forEach((u) => {
              if (!mergedMap.has(u.id)) {
                const isMaster = isMasterSuperAdmin(u.email) || isMasterSuperAdmin(u.username);
                mergedMap.set(u.id, {
                  id: u.id,
                  email: u.email,
                  username: u.username,
                  role: isMaster ? 'superadmin' : u.role,
                  status: isMaster ? 'active' : u.status,
                  companyId: u.companyId,
                  companyName: u.companyName,
                  createdAt: u.createdAt,
                  isMasterSuperAdmin: isMaster,
                });
              }
            });

            const merged = Array.from(mergedMap.values());
            setRegisteredUsers(merged);
            return;
          }
        } catch (err) {
          console.warn('Erro ao carregar usuários do Supabase:', err);
        }
      }
    }

    const mapped: AppUser[] = locals.map((u) => {
      const isMaster = isMasterSuperAdmin(u.email) || isMasterSuperAdmin(u.username);
      return {
        id: u.id,
        email: u.email,
        username: u.username,
        role: isMaster ? 'superadmin' : u.role,
        status: isMaster ? 'active' : u.status,
        companyId: u.companyId,
        companyName: u.companyName,
        createdAt: u.createdAt,
        isMasterSuperAdmin: isMaster,
      };
    });
    setRegisteredUsers(mapped);
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      const configured = isSupabaseConfigured();
      setIsSupabaseOnline(configured);

      // Check saved user session
      const savedUser = getSavedCurrentUser();
      await loadRegisteredUsers();

      if (configured) {
        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            const { data } = await supabase.auth.getSession();
            if (data.session?.user) {
              const su = data.session.user;
              const isMaster = isMasterSuperAdmin(su.email) || isMasterSuperAdmin(su.user_metadata?.username);
              let role: UserRole = isMaster ? 'superadmin' : (su.user_metadata?.role as UserRole) || 'operator';
              let status: UserStatus = isMaster ? 'active' : (su.user_metadata?.status as UserStatus) || 'active';
              let username = su.user_metadata?.username || su.email?.split('@')[0] || 'Usuário';

              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', su.id)
                .single();

              if (profile) {
                role = isMaster ? 'superadmin' : (profile.role as UserRole) || role;
                status = isMaster ? 'active' : (profile.status as UserStatus) || status;
                username = profile.username || username;
              }

              // If user is blocked, force sign out
              if (status === 'blocked') {
                await supabase.auth.signOut();
                setCurrentUser(null);
                saveCurrentUserSession(null);
                setIsLoading(false);
                return;
              }

              const appUser: AppUser = {
                id: su.id,
                email: su.email || '',
                username,
                role,
                status,
                createdAt: su.created_at || new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
                isMasterSuperAdmin: isMaster,
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
        // Re-check status
        const localRecord = findLocalUserByIdentifier(savedUser.email);
        if (localRecord && localRecord.status === 'blocked') {
          setCurrentUser(null);
          saveCurrentUserSession(null);
        } else {
          setCurrentUser(savedUser);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password) {
      return { success: false, error: 'Informe seu e-mail/usuário e a senha de acesso.' };
    }

    const isEmail = cleanIdentifier.includes('@');
    const localUser = findLocalUserByIdentifier(cleanIdentifier);
    const configured = isSupabaseConfigured();

    // Check blocked status in local database first
    if (localUser && localUser.status === 'blocked') {
      return {
        success: false,
        error: 'Sua conta está bloqueada pelo Superadmin. Entre em contato com amaryelcc@gmail.com para liberação.',
      };
    }

    if (localUser && localUser.status === 'pending') {
      return {
        success: false,
        error: 'Seu cadastro ainda está pendente de liberação pelo Superadmin.',
      };
    }

    // Target email to authenticate with Supabase Auth
    let targetEmail = isEmail ? cleanIdentifier.toLowerCase() : localUser?.email || '';

    if (configured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        // If login by username, search profiles table for matching username if targetEmail is empty
        if (!targetEmail && !isEmail) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .ilike('username', cleanIdentifier)
              .single();

            if (profile) {
              targetEmail = profile.email;
              if (profile.status === 'blocked') {
                return {
                  success: false,
                  error: 'Sua conta está bloqueada pelo Superadmin. Entre em contato com amaryelcc@gmail.com.',
                };
              }
            }
          } catch (err) {
            console.warn('Busca de perfil por username:', err);
          }
        }

        if (targetEmail) {
          try {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: targetEmail,
              password,
            });

            if (!error && data.user) {
              const su = data.user;
              const isMaster = isMasterSuperAdmin(su.email) || isMasterSuperAdmin(cleanIdentifier);
              let role: UserRole = isMaster ? 'superadmin' : (su.user_metadata?.role as UserRole) || 'operator';
              let status: UserStatus = isMaster ? 'active' : (su.user_metadata?.status as UserStatus) || 'active';
              let username = su.user_metadata?.username || su.email?.split('@')[0] || cleanIdentifier;

              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', su.id)
                .single();

              if (profile) {
                role = isMaster ? 'superadmin' : (profile.role as UserRole) || role;
                status = isMaster ? 'active' : (profile.status as UserStatus) || status;
                username = profile.username || username;
              }

              if (status === 'blocked') {
                await supabase.auth.signOut();
                return {
                  success: false,
                  error: 'Acesso bloqueado pelo Superadmin. Entre em contato com amaryelcc@gmail.com.',
                };
              }

              const appUser: AppUser = {
                id: su.id,
                email: su.email || targetEmail,
                username,
                role,
                status,
                createdAt: su.created_at || new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
                isMasterSuperAdmin: isMaster,
              };

              setCurrentUser(appUser);
              saveCurrentUserSession(appUser);
              await loadRegisteredUsers();
              return { success: true };
            }
          } catch (err: any) {
            console.warn('Erro auth Supabase, tentando autenticação integrada local:', err);
          }
        }
      }
    }

    // Local authentication fallback / hybrid verification
    if (!localUser) {
      // Special initial root superadmin bootstrap check
      if (
        cleanIdentifier.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ||
        cleanIdentifier.toLowerCase() === MASTER_ADMIN_USERNAME.toLowerCase()
      ) {
        if (password === 'admin123' || password.length >= 6) {
          const masterUser: AppUser = {
            id: 'usr_master_amaryelcc',
            email: MASTER_ADMIN_EMAIL,
            username: MASTER_ADMIN_USERNAME,
            role: 'superadmin',
            status: 'active',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            isMasterSuperAdmin: true,
          };
          saveLocalUser({
            id: masterUser.id,
            email: masterUser.email,
            username: masterUser.username,
            passwordHash: password,
            role: 'superadmin',
            status: 'active',
            createdAt: masterUser.createdAt,
          });
          setCurrentUser(masterUser);
          saveCurrentUserSession(masterUser);
          await loadRegisteredUsers();
          return { success: true };
        }
      }

      return {
        success: false,
        error: 'Usuário ou e-mail não encontrado. Verifique a digitação ou cadastre-se.',
      };
    }

    if (localUser.passwordHash !== password) {
      return { success: false, error: 'Senha incorreta para este usuário/e-mail.' };
    }

    const isMaster = isMasterSuperAdmin(localUser.email) || isMasterSuperAdmin(localUser.username);
    const appUser: AppUser = {
      id: localUser.id,
      email: localUser.email,
      username: localUser.username,
      role: isMaster ? 'superadmin' : localUser.role,
      status: isMaster ? 'active' : localUser.status,
      createdAt: localUser.createdAt,
      lastLoginAt: new Date().toISOString(),
      isMasterSuperAdmin: isMaster,
    };

    setCurrentUser(appUser);
    saveCurrentUserSession(appUser);
    await loadRegisteredUsers();
    return { success: true };
  };

  const register = async (
    email: string,
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: AppUser }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    if (!cleanEmail || !cleanUsername || !password) {
      return { success: false, error: 'Preencha todos os campos obrigatórios (usuário, e-mail e senha).' };
    }

    if (password.length < 6) {
      return { success: false, error: 'A senha deve conter no mínimo 6 caracteres.' };
    }

    // MANDATORY RULE: Only amaryelcc@gmail.com or username amaryelcc is Superadmin!
    const isMaster = isMasterSuperAdmin(cleanEmail) || isMasterSuperAdmin(cleanUsername);
    const assignedRole: UserRole = isMaster ? 'superadmin' : 'operator';
    const assignedStatus: UserStatus = 'active';

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
                status: assignedStatus,
              },
            },
          });

          if (!error && data.user) {
            const su = data.user;

            // Upsert directly into public.profiles for certainty
            try {
              await supabase.from('profiles').upsert({
                id: su.id,
                username: cleanUsername,
                email: cleanEmail,
                role: assignedRole,
                status: assignedStatus,
                updated_at: new Date().toISOString(),
              });
            } catch (pErr) {
              console.warn('Perfil sync warning:', pErr);
            }

            const appUser: AppUser = {
              id: su.id,
              email: su.email || cleanEmail,
              username: cleanUsername,
              role: assignedRole,
              status: assignedStatus,
              createdAt: su.created_at || new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
              isMasterSuperAdmin: isMaster,
            };

            // Keep in local cache
            saveLocalUser({
              id: su.id,
              email: cleanEmail,
              username: cleanUsername,
              passwordHash: password,
              role: assignedRole,
              status: assignedStatus,
              createdAt: appUser.createdAt,
            });

            setCurrentUser(appUser);
            saveCurrentUserSession(appUser);
            await loadRegisteredUsers();
            return { success: true, user: appUser };
          }
        } catch (err: any) {
          console.warn('Erro cadastro Supabase, prosseguindo com armazenamento local:', err);
        }
      }
    }

    // Local registration
    const existing = findLocalUserByIdentifier(cleanEmail) || findLocalUserByIdentifier(cleanUsername);
    if (existing && existing.email.toLowerCase() === cleanEmail && !isMaster) {
      return { success: false, error: 'Este e-mail já está cadastrado no sistema.' };
    }

    const newId = isMaster ? 'usr_master_amaryelcc' : 'usr_' + Date.now();
    const newUserRecord = {
      id: newId,
      email: cleanEmail,
      username: cleanUsername,
      passwordHash: password,
      role: assignedRole,
      status: assignedStatus,
      createdAt: new Date().toISOString(),
    };

    saveLocalUser(newUserRecord);

    const appUser: AppUser = {
      id: newId,
      email: cleanEmail,
      username: cleanUsername,
      role: assignedRole,
      status: assignedStatus,
      createdAt: newUserRecord.createdAt,
      lastLoginAt: new Date().toISOString(),
      isMasterSuperAdmin: isMaster,
    };

    setCurrentUser(appUser);
    saveCurrentUserSession(appUser);
    await loadRegisteredUsers();

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

  const updateUserRoleAndStatus = async (
    userId: string,
    role?: UserRole,
    status?: UserStatus,
    companyId?: string,
    companyName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Check if current user is superadmin
    if (currentUser?.role !== 'superadmin') {
      return { success: false, error: 'Somente o Superadmin pode alterar permissões e status de usuários.' };
    }

    // Target user check
    const targetUser = registeredUsers.find((u) => u.id === userId);
    if (targetUser && (isMasterSuperAdmin(targetUser.email) || isMasterSuperAdmin(targetUser.username))) {
      if (role !== 'superadmin' || status === 'blocked') {
        return {
          success: false,
          error: 'A conta raiz do Superadmin (amaryelcc) é protegida e não pode ser rebaixada ou bloqueada.',
        };
      }
    }

    const configured = isSupabaseConfigured();
    if (configured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const updates: any = { updated_at: new Date().toISOString() };
          if (role) updates.role = role;
          if (status) updates.status = status;
          if (companyId !== undefined) updates.company_id = companyId || null;

          await supabase.from('profiles').update(updates).eq('id', userId);
        } catch (err) {
          console.warn('Erro ao atualizar papel/status no Supabase:', err);
        }
      }
    }

    updateLocalUserRoleAndStatus(userId, role, status, companyId, companyName);

    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              role: role || prev.role,
              status: status || prev.status,
              companyId: companyId !== undefined ? companyId : prev.companyId,
              companyName: companyName !== undefined ? companyName : prev.companyName,
            }
          : null
      );
    }

    await loadRegisteredUsers();
    return { success: true };
  };

  const updateCurrentUserProfile = async (params: {
    username?: string;
    password?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Nenhum usuário logado.' };
    }

    const newUsername = params.username?.trim();
    if (newUsername && newUsername.length < 3) {
      return { success: false, error: 'O nome de usuário deve ter pelo menos 3 caracteres.' };
    }

    const configured = isSupabaseConfigured();
    if (configured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          if (newUsername) {
            await supabase.from('profiles').update({ username: newUsername }).eq('id', currentUser.id);
            await supabase.auth.updateUser({ data: { username: newUsername } });
          }
          if (params.password) {
            await supabase.auth.updateUser({ password: params.password });
          }
        } catch (err: any) {
          console.warn('Erro ao atualizar perfil no Supabase:', err);
        }
      }
    }

    updateLocalUserProfile(currentUser.id, {
      username: newUsername,
      password: params.password,
    });

    setCurrentUser((prev) => (prev ? { ...prev, username: newUsername || prev.username } : null));
    await loadRegisteredUsers();
    return { success: true };
  };

  const createUserByAdmin = async (params: {
    email: string;
    username: string;
    password: string;
    role: UserRole;
    status: UserStatus;
    companyId?: string;
    companyName?: string;
  }): Promise<{ success: boolean; error?: string; user?: AppUser }> => {
    if (currentUser?.role !== 'superadmin') {
      return { success: false, error: 'Apenas o Superadmin pode cadastrar novos usuários internamente.' };
    }

    const cleanEmail = params.email.trim().toLowerCase();
    const cleanUsername = params.username.trim();

    if (!cleanEmail || !cleanUsername || !params.password) {
      return { success: false, error: 'Preencha todos os dados do novo usuário.' };
    }

    const isMaster = isMasterSuperAdmin(cleanEmail) || isMasterSuperAdmin(cleanUsername);
    const assignedRole: UserRole = isMaster ? 'superadmin' : params.role;
    const assignedStatus: UserStatus = isMaster ? 'active' : params.status;

    const newId = 'usr_' + Date.now();
    const newUserRecord = {
      id: newId,
      email: cleanEmail,
      username: cleanUsername,
      passwordHash: params.password,
      role: assignedRole,
      status: assignedStatus,
      companyId: params.companyId,
      companyName: params.companyName,
      createdAt: new Date().toISOString(),
    };

    saveLocalUser(newUserRecord);

    const configured = isSupabaseConfigured();
    if (configured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.from('profiles').upsert({
            id: newId,
            username: cleanUsername,
            email: cleanEmail,
            role: assignedRole,
            status: assignedStatus,
            company_id: params.companyId || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } catch (err) {
          console.warn('Erro ao inserir perfil no Supabase:', err);
        }
      }
    }

    await loadRegisteredUsers();

    const created: AppUser = {
      id: newId,
      email: cleanEmail,
      username: cleanUsername,
      role: assignedRole,
      status: assignedStatus,
      companyId: params.companyId,
      companyName: params.companyName,
      createdAt: newUserRecord.createdAt,
      isMasterSuperAdmin: isMaster,
    };

    return { success: true, user: created };
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser?.role !== 'superadmin') {
      return { success: false, error: 'Somente o Superadmin pode excluir usuários.' };
    }

    const targetUser = registeredUsers.find((u) => u.id === userId);
    if (targetUser && (isMasterSuperAdmin(targetUser.email) || isMasterSuperAdmin(targetUser.username))) {
      return { success: false, error: 'A conta raiz do Superadmin (amaryelcc) não pode ser excluída.' };
    }

    if (currentUser.id === userId) {
      return { success: false, error: 'Você não pode excluir sua própria conta enquanto estiver logado.' };
    }

    const configured = isSupabaseConfigured();
    if (configured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.from('profiles').delete().eq('id', userId);
        } catch (err) {
          console.warn('Erro ao deletar perfil no Supabase:', err);
        }
      }
    }

    deleteLocalUser(userId);
    await loadRegisteredUsers();
    return { success: true };
  };

  const refreshUsers = () => {
    loadRegisteredUsers();
  };

  const isMasterAdmin = Boolean(
    currentUser && (isMasterSuperAdmin(currentUser.email) || isMasterSuperAdmin(currentUser.username))
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: Boolean(currentUser),
        isLoading,
        isSupabaseOnline,
        isMasterAdmin,
        login,
        register,
        logout,
        updateUserRoleAndStatus,
        updateCurrentUserProfile,
        createUserByAdmin,
        deleteUser,
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
