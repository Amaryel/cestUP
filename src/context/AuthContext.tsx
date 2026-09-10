import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AppUser, UserRole, UserStatus } from '../types';
import {
  getSupabaseClient,
  getSupabaseCredentials,
  isSupabaseConfigured,
  isMasterSuperAdmin,
  MASTER_ADMIN_EMAIL,
  MASTER_ADMIN_USERNAME,
} from '../lib/supabase';
import { logger } from '../lib/logger';

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
    currentPassword?: string;
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
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseOnline, setIsSupabaseOnline] = useState<boolean>(false);
  const [registeredUsers, setRegisteredUsers] = useState<AppUser[]>([]);

  // Fetch all profiles from Supabase database
  const loadRegisteredUsers = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && profiles) {
        const mapped: AppUser[] = profiles.map((p) => {
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
        setRegisteredUsers(mapped);
      }
    } catch (err: any) {
      console.warn('Erro ao carregar usuários do Supabase:', err);
    }
  };

  // Helper to load user profile directly from Supabase profiles table
  const fetchUserProfile = async (userId: string, userEmail: string, userMetadata?: any): Promise<AppUser> => {
    const supabase = getSupabaseClient();
    const isMaster = isMasterSuperAdmin(userEmail) || isMasterSuperAdmin(userMetadata?.username);
    let role: UserRole = isMaster ? 'superadmin' : (userMetadata?.role as UserRole) || 'operator';
    let status: UserStatus = isMaster ? 'active' : (userMetadata?.status as UserStatus) || 'active';
    let username = userMetadata?.username || userEmail.split('@')[0] || 'Usuário';
    let companyId = userMetadata?.company_id || undefined;

    if (supabase) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!error && profile) {
          role = isMaster ? 'superadmin' : (profile.role as UserRole) || role;
          status = isMaster ? 'active' : (profile.status as UserStatus) || status;
          username = profile.username || username;
          companyId = profile.company_id || companyId;
        } else if (!profile) {
          // Ensure profile row exists in public.profiles
          await supabase.from('profiles').upsert({
            id: userId,
            email: userEmail,
            username,
            role,
            status,
            company_id: companyId || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('Erro ao sincronizar perfil do Supabase:', err);
      }
    }

    return {
      id: userId,
      email: userEmail,
      username,
      role,
      status,
      companyId,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isMasterSuperAdmin: isMaster,
    };
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      setIsLoading(true);
      const configured = isSupabaseConfigured();
      setIsSupabaseOnline(configured);

      const supabase = getSupabaseClient();
      if (!supabase) {
        if (isMounted) {
          setCurrentUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        // Retrieve current active session from Supabase Auth
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) {
          logger.log({
            operation: 'AUTH',
            table: 'auth.users',
            success: false,
            errorMessage: 'Erro ao obter sessão Supabase: ' + sessionErr.message,
          });
          if (isMounted) {
            setCurrentUser(null);
            setIsLoading(false);
          }
          return;
        }

        if (sessionData.session?.user) {
          const su = sessionData.session.user;
          const appUser = await fetchUserProfile(su.id, su.email || '', su.user_metadata);

          if (appUser.status === 'blocked') {
            await supabase.auth.signOut();
            if (isMounted) {
              setCurrentUser(null);
              setIsLoading(false);
            }
            return;
          }

          if (isMounted) {
            setCurrentUser(appUser);
          }
        } else {
          if (isMounted) {
            setCurrentUser(null);
          }
        }
      } catch (err: any) {
        console.warn('Erro na inicialização de autenticação Supabase:', err);
        if (isMounted) setCurrentUser(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          loadRegisteredUsers();
        }
      }
    };

    initAuth();

    // Listen for auth state changes directly from Supabase
    const supabase = getSupabaseClient();
    let authListenerSubscription: { unsubscribe: () => void } | null = null;

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setCurrentUser(null);
        } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
          const su = session.user;
          const appUser = await fetchUserProfile(su.id, su.email || '', su.user_metadata);
          if (appUser.status !== 'blocked') {
            setCurrentUser(appUser);
          } else {
            await supabase.auth.signOut();
            setCurrentUser(null);
          }
        }
      });
      authListenerSubscription = subscription;
    }

    return () => {
      isMounted = false;
      if (authListenerSubscription) {
        authListenerSubscription.unsubscribe();
      }
    };
  }, []);

  const login = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password) {
      return { success: false, error: 'Informe seu e-mail ou nome de usuário e a senha.' };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Servidor Supabase indisponível ou não configurado.' };
    }

    const isEmail = cleanIdentifier.includes('@');
    let targetEmail = isEmail ? cleanIdentifier.toLowerCase() : '';

    // If login with username, query Supabase profiles to resolve exact email and verify status
    if (!isEmail) {
      try {
        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('email, status, username')
          .ilike('username', cleanIdentifier)
          .maybeSingle();

        if (profErr) {
          return { success: false, error: 'Erro ao consultar perfil: ' + profErr.message };
        }

        if (!profile || !profile.email) {
          return { success: false, error: `Usuário "${cleanIdentifier}" não encontrado no sistema.` };
        }

        if (profile.status === 'blocked') {
          return { success: false, error: 'Sua conta está bloqueada pelo Administrador do sistema.' };
        }

        targetEmail = profile.email.toLowerCase();
      } catch (err: any) {
        return { success: false, error: 'Falha ao buscar usuário: ' + (err?.message || err) };
      }
    }

    // Authenticate directly with Supabase Auth
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (authError) {
        logger.log({
          operation: 'AUTH',
          table: 'auth.users',
          success: false,
          details: `Tentativa de login falhou para ${targetEmail}`,
          errorMessage: authError.message,
        });

        const msg = authError.message.toLowerCase();
        if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
          return {
            success: false,
            error: 'E-mail/usuário ou senha incorretos. Se este for o seu primeiro acesso ao sistema, clique na aba "Criar Novo Cadastro" acima para definir sua senha inicial.',
          };
        }
        return { success: false, error: `Erro de autenticação: ${authError.message}` };
      }

      if (!authData.user) {
        return { success: false, error: 'Usuário não retornado pelo Supabase.' };
      }

      const su = authData.user;
      const appUser = await fetchUserProfile(su.id, su.email || targetEmail, su.user_metadata);

      if (appUser.status === 'blocked') {
        await supabase.auth.signOut();
        return { success: false, error: 'Sua conta foi suspensa ou bloqueada pelo Administrador.' };
      }

      setCurrentUser(appUser);
      await loadRegisteredUsers();

      logger.log({
        operation: 'AUTH',
        table: 'auth.users',
        recordId: appUser.id,
        userId: appUser.id,
        companyId: appUser.companyId,
        success: true,
        details: `Login efetuado com sucesso via Supabase Auth (${appUser.email})`,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Falha na conexão com Supabase Auth: ' + (err?.message || err) };
    }
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

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Servidor Supabase não configurado.' };
    }

    // Check if username is already taken in Supabase profiles
    try {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id, username, email')
        .or(`username.ilike.${cleanUsername},email.ilike.${cleanEmail}`)
        .maybeSingle();

      if (existingUser) {
        if (existingUser.username.toLowerCase() === cleanUsername.toLowerCase()) {
          return { success: false, error: `O nome de usuário "${cleanUsername}" já está em uso.` };
        }
        if (existingUser.email.toLowerCase() === cleanEmail.toLowerCase()) {
          return { success: false, error: `O e-mail "${cleanEmail}" já está cadastrado.` };
        }
      }
    } catch (err) {
      console.warn('Verificação de perfil existente:', err);
    }

    const isMaster = isMasterSuperAdmin(cleanEmail) || isMasterSuperAdmin(cleanUsername);
    const assignedRole: UserRole = isMaster ? 'superadmin' : 'operator';
    const assignedStatus: UserStatus = 'active';

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
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

      if (authError) {
        logger.log({
          operation: 'AUTH',
          table: 'auth.users',
          success: false,
          details: `Cadastro falhou para ${cleanEmail}`,
          errorMessage: authError.message,
        });
        return { success: false, error: `Erro no cadastro Supabase: ${authError.message}` };
      }

      if (!authData.user) {
        return { success: false, error: 'Não foi possível concluir o registro do usuário.' };
      }

      const su = authData.user;

      // Upsert profile in Supabase profiles table
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: su.id,
        email: cleanEmail,
        username: cleanUsername,
        role: assignedRole,
        status: assignedStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (profErr) {
        console.warn('Aviso ao registrar perfil:', profErr.message);
      }

      const appUser: AppUser = {
        id: su.id,
        email: cleanEmail,
        username: cleanUsername,
        role: assignedRole,
        status: assignedStatus,
        createdAt: su.created_at || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        isMasterSuperAdmin: isMaster,
      };

      setCurrentUser(appUser);
      await loadRegisteredUsers();

      logger.log({
        operation: 'INSERT',
        table: 'profiles',
        recordId: appUser.id,
        userId: appUser.id,
        success: true,
        details: `Novo usuário registrado e persistido no Supabase: ${cleanEmail}`,
      });

      return { success: true, user: appUser };
    } catch (err: any) {
      return { success: false, error: 'Falha no cadastro: ' + (err?.message || err) };
    }
  };

  const logout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Erro ao sair do Supabase:', err);
      }
    }
    setCurrentUser(null);
  };

  const updateUserRoleAndStatus = async (
    userId: string,
    role?: UserRole,
    status?: UserStatus,
    companyId?: string,
    companyName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (currentUser?.role !== 'superadmin') {
      return { success: false, error: 'Somente o Superadmin pode alterar permissões e status de usuários.' };
    }

    const targetUser = registeredUsers.find((u) => u.id === userId);
    if (targetUser && (isMasterSuperAdmin(targetUser.email) || isMasterSuperAdmin(targetUser.username))) {
      if (role !== 'superadmin' || status === 'blocked') {
        return {
          success: false,
          error: 'A conta raiz do Superadmin (amaryelcc) é protegida e não pode ser rebaixada ou bloqueada.',
        };
      }
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Supabase indisponível.' };
    }

    try {
      const updates: any = { updated_at: new Date().toISOString() };
      if (role) updates.role = role;
      if (status) updates.status = status;
      if (companyId !== undefined) updates.company_id = companyId || null;

      const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
      if (error) {
        return { success: false, error: 'Erro ao atualizar perfil no Supabase: ' + error.message };
      }

      if (currentUser && currentUser.id === userId) {
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                role: role || prev.role,
                status: status || prev.status,
                companyId: companyId !== undefined ? companyId : prev.companyId,
              }
            : null
        );
      }

      await loadRegisteredUsers();

      logger.log({
        operation: 'UPDATE',
        table: 'profiles',
        recordId: userId,
        companyId,
        success: true,
        details: `Perfil de usuário ${userId} atualizado (Role: ${role}, Status: ${status})`,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao atualizar usuário.' };
    }
  };

  const updateCurrentUserProfile = async (params: {
    username?: string;
    currentPassword?: string;
    password?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Nenhum usuário logado.' };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Supabase indisponível.' };
    }

    const newUsername = params.username?.trim();
    if (newUsername && newUsername.length < 3) {
      return { success: false, error: 'O nome de usuário deve ter pelo menos 3 caracteres.' };
    }

    // 1. If password change requested: validate current password with Supabase Auth first
    if (params.password) {
      if (params.password.length < 6) {
        return { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' };
      }

      if (params.currentPassword) {
        const { error: verifyErr } = await supabase.auth.signInWithPassword({
          email: currentUser.email,
          password: params.currentPassword,
        });

        if (verifyErr) {
          return {
            success: false,
            error: 'A senha atual informada está incorreta. Digite sua senha atual para confirmar a alteração.',
          };
        }
      }

      // Update password directly in Supabase Auth
      const { error: updatePwdErr } = await supabase.auth.updateUser({
        password: params.password,
      });

      if (updatePwdErr) {
        return {
          success: false,
          error: `Erro ao atualizar senha no Supabase Auth: ${updatePwdErr.message}`,
        };
      }

      logger.log({
        operation: 'AUTH',
        table: 'auth.users',
        recordId: currentUser.id,
        userId: currentUser.id,
        success: true,
        details: `Senha de ${currentUser.email} alterada com sucesso diretamente no Supabase Auth.`,
      });
    }

    // 2. If username change requested: update Supabase profiles and user metadata
    if (newUsername && newUsername !== currentUser.username) {
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ username: newUsername, updated_at: new Date().toISOString() })
        .eq('id', currentUser.id);

      if (profErr) {
        return { success: false, error: 'Erro ao atualizar nome de usuário: ' + profErr.message };
      }

      await supabase.auth.updateUser({
        data: { username: newUsername },
      });

      setCurrentUser((prev) => (prev ? { ...prev, username: newUsername } : null));

      logger.log({
        operation: 'UPDATE',
        table: 'profiles',
        recordId: currentUser.id,
        userId: currentUser.id,
        success: true,
        details: `Nome de usuário atualizado para "${newUsername}"`,
      });
    }

    await loadRegisteredUsers();
    return { success: true };
  };

  const resetPassword = async (
    identifier: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    const clean = identifier.trim();
    if (!clean) {
      return { success: false, error: 'Informe o e-mail cadastrado.' };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Supabase indisponível.' };
    }

    let targetEmail = clean.includes('@') ? clean.toLowerCase() : '';
    if (!targetEmail) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('email')
        .ilike('username', clean)
        .maybeSingle();

      if (prof?.email) {
        targetEmail = prof.email.toLowerCase();
      }
    }

    if (!targetEmail) {
      return { success: false, error: 'Usuário ou e-mail não localizado.' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: window.location.origin,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: `Instruções de redefinição de senha foram enviadas para o e-mail ${targetEmail}.`,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao solicitar redefinição de senha.' };
    }
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
      return { success: false, error: 'A senha deve conter no mínimo 6 caracteres.' };
    }

    const isMaster = isMasterSuperAdmin(cleanEmail) || isMasterSuperAdmin(cleanUsername);
    const assignedRole: UserRole = isMaster ? 'superadmin' : params.role;
    const assignedStatus: UserStatus = isMaster ? 'active' : params.status;

    const { url, anonKey } = getSupabaseCredentials();
    // Isolated client so the active Superadmin session is preserved in current tab
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
        return { success: false, error: `Erro no Supabase Auth: ${authError.message}` };
      }

      if (!authData.user) {
        return { success: false, error: 'Falha ao criar usuário no Supabase.' };
      }

      const userId = authData.user.id;
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('profiles').upsert({
          id: userId,
          username: cleanUsername,
          email: cleanEmail,
          role: assignedRole,
          status: assignedStatus,
          company_id: params.companyId || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      const created: AppUser = {
        id: userId,
        email: cleanEmail,
        username: cleanUsername,
        role: assignedRole,
        status: assignedStatus,
        companyId: params.companyId,
        createdAt: new Date().toISOString(),
        isMasterSuperAdmin: isMaster,
      };

      await loadRegisteredUsers();

      logger.log({
        operation: 'INSERT',
        table: 'profiles',
        recordId: userId,
        companyId: params.companyId,
        success: true,
        details: `Novo usuário criado pelo Superadmin: ${cleanEmail} (Role: ${assignedRole})`,
      });

      return { success: true, user: created };
    } catch (err: any) {
      return { success: false, error: 'Falha ao criar usuário: ' + (err?.message || err) };
    }
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

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Supabase indisponível.' };
    }

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) {
        return { success: false, error: 'Erro ao deletar perfil no Supabase: ' + error.message };
      }

      await loadRegisteredUsers();

      logger.log({
        operation: 'DELETE',
        table: 'profiles',
        recordId: userId,
        success: true,
        details: `Usuário ${userId} removido de profiles.`,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao excluir usuário.' };
    }
  };

  const syncLocalUsersToSupabase = async (): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    message: string;
  }> => {
    await loadRegisteredUsers();
    return {
      success: true,
      synced: 0,
      failed: 0,
      message: 'Todos os usuários estão sincronizados diretamente com o Supabase.',
    };
  };

  const refreshUsers = async () => {
    await loadRegisteredUsers();
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
