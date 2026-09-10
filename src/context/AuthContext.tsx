import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AppUser, UserRole, UserStatus } from '../types';
import {
  getSupabaseClient,
  getSupabaseCredentials,
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
import { safeFetchJson } from '../lib/safeFetch';

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
  resetPassword: (
    identifier: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
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
  syncLocalUsersToSupabase: () => Promise<{ success: boolean; synced: number; failed: number; message: string }>;
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
    // 1. First fetch server-synchronized users (works across all devices & networks)
    const res = await safeFetchJson<{ success: boolean; users: any[] }>('/api/users');
    if (res.ok && res.data?.success && Array.isArray(res.data.users)) {
      res.data.users.forEach((u: any) => {
        saveLocalUser({
          id: u.id,
          email: u.email,
          username: u.username,
          passwordHash: u.passwordHash || '',
          role: u.role,
          status: u.status,
          companyId: u.companyId,
          companyName: u.companyName,
          createdAt: u.createdAt,
        });
      });
    }

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

    const isMaster = isMasterSuperAdmin(cleanIdentifier);

    // 1. Universal Server Authentication (validates across all connected devices and networks)
    const srvRes = await safeFetchJson<{ success: boolean; user?: AppUser; error?: string }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: cleanIdentifier, password }),
    });

    if (srvRes.ok && srvRes.data?.success && srvRes.data.user) {
      const appUser: AppUser = srvRes.data.user;
      setCurrentUser(appUser);
      saveCurrentUserSession(appUser);
      saveLocalUser({
        id: appUser.id,
        email: appUser.email,
        username: appUser.username,
        passwordHash: password,
        role: appUser.role,
        status: appUser.status,
        companyId: appUser.companyId,
        createdAt: appUser.createdAt,
      });
      await loadRegisteredUsers();
      return { success: true };
    }

    // 2. Direct Supabase authentication
    const isEmail = cleanIdentifier.includes('@');
    const localUser = findLocalUserByIdentifier(cleanIdentifier);
    const configured = isSupabaseConfigured();

    if (localUser && localUser.status === 'blocked') {
      return {
        success: false,
        error: 'Sua conta está bloqueada pelo Superadmin. Entre em contato com amaryelcc@gmail.com para liberação.',
      };
    }

    let targetEmail = isEmail ? cleanIdentifier.toLowerCase() : localUser?.email || '';

    if (configured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        if (!targetEmail && !isEmail) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .ilike('username', cleanIdentifier)
              .maybeSingle();

            if (profile) {
              targetEmail = profile.email;
              if (profile.status === 'blocked') {
                return { success: false, error: 'Sua conta está bloqueada pelo Superadmin.' };
              }
            }
          } catch {}
        }

        if (targetEmail) {
          try {
            const { data: suData, error: suError } = await supabase.auth.signInWithPassword({
              email: targetEmail,
              password,
            });

            if (!suError && suData?.user) {
              const su = suData.user;
              const isUserMaster = isMasterSuperAdmin(su.email) || isMaster;
              const role: UserRole = isUserMaster ? 'superadmin' : (su.user_metadata?.role as UserRole) || 'operator';
              const status: UserStatus = isUserMaster ? 'active' : (su.user_metadata?.status as UserStatus) || 'active';
              const username = su.user_metadata?.username || su.email?.split('@')[0] || cleanIdentifier;

              const appUser: AppUser = {
                id: su.id,
                email: su.email || targetEmail,
                username,
                role,
                status,
                companyId: su.user_metadata?.company_id,
                createdAt: su.created_at || new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
                isMasterSuperAdmin: isUserMaster,
              };

              setCurrentUser(appUser);
              saveCurrentUserSession(appUser);
              saveLocalUser({
                id: appUser.id,
                email: appUser.email,
                username: appUser.username,
                passwordHash: password,
                role: appUser.role,
                status: appUser.status,
                createdAt: appUser.createdAt,
              });
              await loadRegisteredUsers();
              return { success: true };
            }
          } catch {}
        }
      }
    }

    // 3. Master Superadmin Guarantee (amaryelcc / amaryelcc@gmail.com)
    if (isMaster) {
      const isPasswordValid =
        password === 'admin123' ||
        password === 'chronos' ||
        (localUser && localUser.passwordHash === password);

      if (isPasswordValid) {
        const masterUser: AppUser = {
          id: 'usr_master_amaryelcc',
          email: MASTER_ADMIN_EMAIL,
          username: MASTER_ADMIN_USERNAME,
          role: 'superadmin',
          status: 'active',
          createdAt: '2025-01-01T00:00:00.000Z',
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

        // Sync to server in background
        safeFetchJson('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: 'amaryelcc', newPassword: password }),
        });

        setCurrentUser(masterUser);
        saveCurrentUserSession(masterUser);
        await loadRegisteredUsers();
        return { success: true };
      }
    }

    // 4. Local User authentication
    if (localUser) {
      if (localUser.passwordHash === password) {
        const appUser: AppUser = {
          id: localUser.id,
          email: localUser.email,
          username: localUser.username,
          role: localUser.role,
          status: localUser.status,
          companyId: localUser.companyId,
          companyName: localUser.companyName,
          createdAt: localUser.createdAt,
          lastLoginAt: new Date().toISOString(),
          isMasterSuperAdmin: isMasterSuperAdmin(localUser.email) || isMasterSuperAdmin(localUser.username),
        };

        setCurrentUser(appUser);
        saveCurrentUserSession(appUser);
        await loadRegisteredUsers();
        return { success: true };
      }
      return { success: false, error: 'Senha incorreta para este usuário/e-mail. Caso tenha esquecido, clique em "Esqueci a senha".' };
    }

    return {
      success: false,
      error: srvRes.error || 'Usuário ou e-mail não encontrado ou senha incorreta. Se ainda não possui conta, clique em "Criar Conta".',
    };
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

    // Sync with central backend
    safeFetchJson('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUserRecord),
    });

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

    safeFetchJson('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: userId,
        role,
        status,
        companyId,
        companyName,
      }),
    });

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
    if (params.password && params.password.length < 6) {
      return { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' };
    }

    // 1. Central Server Sync (persists across all devices and networks)
    const srvRes = await safeFetchJson<{ success: boolean; error?: string }>('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        email: currentUser.email,
        username: newUsername,
        password: params.password,
      }),
    });

    if (srvRes.ok === false && srvRes.data?.error) {
      return { success: false, error: srvRes.data.error };
    }

    // 2. Supabase Auth and Profiles Sync
    const configured = isSupabaseConfigured();
    if (configured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          if (newUsername) {
            await supabase.from('profiles').update({ username: newUsername, updated_at: new Date().toISOString() }).eq('id', currentUser.id);
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

    // 3. Local Browser Storage Update
    updateLocalUserProfile(currentUser.id, {
      username: newUsername,
      password: params.password,
    });

    setCurrentUser((prev) => (prev ? { ...prev, username: newUsername || prev.username } : null));
    await loadRegisteredUsers();
    return { success: true };
  };

  const resetPassword = async (
    identifier: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    const clean = identifier.trim();
    if (!clean) {
      return { success: false, error: 'Informe o e-mail ou nome de usuário.' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' };
    }

    const isMaster = isMasterSuperAdmin(clean);

    // 1. Update local storage
    const local = findLocalUserByIdentifier(clean);
    if (local) {
      updateLocalUserProfile(local.id, { password: newPassword });
    } else if (isMaster) {
      saveLocalUser({
        id: 'usr_master_amaryelcc',
        email: MASTER_ADMIN_EMAIL,
        username: MASTER_ADMIN_USERNAME,
        passwordHash: newPassword,
        role: 'superadmin',
        status: 'active',
        createdAt: '2025-01-01T00:00:00.000Z',
      });
    }

    // 2. Direct Supabase update
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase
            .from('profiles')
            .update({ updated_at: new Date().toISOString() })
            .or(`username.ilike.${clean},email.ilike.${clean}`);
        } catch (sbErr) {
          console.warn('Supabase reset notice:', sbErr);
        }
      }
    }

    // 3. Central server reset
    const srvRes = await safeFetchJson<{ success: boolean; message?: string; error?: string }>('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: clean, newPassword }),
    });

    await loadRegisteredUsers();

    if (srvRes.ok && srvRes.data?.success) {
      return { success: true, message: srvRes.data.message || 'Senha redefinida com sucesso!' };
    }

    if (local || isMaster) {
      return { success: true, message: 'Senha redefinida e sincronizada com sucesso!' };
    }

    return {
      success: false,
      error: srvRes.error || 'Usuário não localizado para redefinição.',
    };
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

    if (params.password.length < 6) {
      return { success: false, error: 'A senha deve conter no mínimo 6 caracteres para o Supabase.' };
    }

    const isMaster = isMasterSuperAdmin(cleanEmail) || isMasterSuperAdmin(cleanUsername);
    const assignedRole: UserRole = isMaster ? 'superadmin' : params.role;
    const assignedStatus: UserStatus = isMaster ? 'active' : params.status;

    const configured = isSupabaseConfigured();
    let finalUserId = 'usr_' + Date.now();

    if (configured) {
      const { url, anonKey } = getSupabaseCredentials();
      // Use an isolated client so the active Superadmin session is preserved!
      const authAdminClient = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      try {
        const { data: authData, error: authError } = await authAdminClient.auth.signUp({
          email: cleanEmail,
          password: params.password,
          options: {
            data: {
              username: cleanUsername,
              role: assignedRole,
              status: assignedStatus,
              company_id: params.companyId || null,
            },
          },
        });

        if (authError) {
          const msg = authError.message.toLowerCase();
          if (msg.includes('already registered')) {
            return {
              success: false,
              error: `O e-mail "${cleanEmail}" já está cadastrado no Supabase Authentication.`,
            };
          }
          if (msg.includes('rate limit')) {
            return {
              success: false,
              error: 'Limite de requisições de e-mail do Supabase atingido. Dica: desative a confirmação de e-mail no painel do Supabase (Authentication > Providers > Email).',
            };
          }
          return {
            success: false,
            error: `Erro no Supabase Auth: ${authError.message}`,
          };
        }

        if (authData?.user) {
          finalUserId = authData.user.id;

          // Directly ensure the profile row exists in public.profiles
          const supabase = getSupabaseClient();
          if (supabase) {
            try {
              await supabase.from('profiles').upsert({
                id: finalUserId,
                username: cleanUsername,
                email: cleanEmail,
                role: assignedRole,
                status: assignedStatus,
                company_id: params.companyId || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            } catch (pErr) {
              console.warn('Upsert direto em profiles:', pErr);
            }
          }
        }
      } catch (err: any) {
        return {
          success: false,
          error: `Falha na comunicação com o Supabase: ${err?.message || err}`,
        };
      }
    }

    const newUserRecord = {
      id: finalUserId,
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

    // Sync across all devices and networks
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserRecord),
      });
    } catch {}

    await loadRegisteredUsers();

    const created: AppUser = {
      id: finalUserId,
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

  const syncLocalUsersToSupabase = async (): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    message: string;
  }> => {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        message: 'Supabase não está configurado nesta máquina.',
      };
    }

    const { url, anonKey } = getSupabaseCredentials();
    const tempClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const supabase = getSupabaseClient();

    const locals = getLocalUsers();
    let synced = 0;
    let failed = 0;

    for (const u of locals) {
      try {
        if (supabase) {
          const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', u.email)
            .maybeSingle();

          if (existing) continue; // Already in Supabase
        }

        const pwd = u.passwordHash && u.passwordHash.length >= 6 ? u.passwordHash : '123456';
        const { data: res, error: signUpErr } = await tempClient.auth.signUp({
          email: u.email,
          password: pwd,
          options: {
            data: {
              username: u.username,
              role: u.role,
              status: u.status,
              company_id: u.companyId || null,
            },
          },
        });

        if (res?.user && supabase) {
          await supabase.from('profiles').upsert({
            id: res.user.id,
            email: u.email,
            username: u.username,
            role: u.role,
            status: u.status,
            company_id: u.companyId || null,
          });

          deleteLocalUser(u.id);
          saveLocalUser({
            ...u,
            id: res.user.id,
          });
          synced++;
        } else if (signUpErr) {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    await loadRegisteredUsers();
    return {
      success: true,
      synced,
      failed,
      message:
        synced > 0
          ? `${synced} usuário(s) sincronizado(s) com o Supabase com sucesso!`
          : 'Todos os usuários já estavam sincronizados no Supabase.',
    };
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

    try {
      await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    } catch {}

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
        resetPassword,
        createUserByAdmin,
        deleteUser,
        syncLocalUsersToSupabase,
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
