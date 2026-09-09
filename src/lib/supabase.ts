import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppUser, UserRole, UserStatus } from '../types';

// Storage keys for Supabase & local auth persistence
const SUPABASE_CONFIG_KEY = 'cestup_supabase_config_v1';
const LOCAL_USER_KEY = 'cestup_auth_user_v1';
const LOCAL_USERS_LIST_KEY = 'cestup_registered_users_v1';

// Master root superadmin identifiers (Only this user is default Superadmin)
export const MASTER_ADMIN_EMAIL = 'amaryelcc@gmail.com';
export const MASTER_ADMIN_USERNAME = 'amaryelcc';

export const isMasterSuperAdmin = (emailOrUsername?: string | null): boolean => {
  if (!emailOrUsername) return false;
  const clean = emailOrUsername.trim().toLowerCase();
  return clean === MASTER_ADMIN_EMAIL.toLowerCase() || clean === MASTER_ADMIN_USERNAME.toLowerCase();
};

export interface LocalUserRecord {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  companyId?: string;
  companyName?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export const DEFAULT_SUPABASE_URL = 'https://shyxhfxamrldvoojeuuj.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_O8wJLtznzImzsMY00Y6BPg_qJsTFCy4';

export const normalizeSupabaseUrl = (url?: string): string => {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
};

// Read from env or local storage configuration or default embedded config
export const getSupabaseCredentials = () => {
  // 1. Auto-detect from URL params for seamless cross-machine setup (e.g. ?sb_url=...&sb_key=...)
  if (typeof window !== 'undefined' && window.location) {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlParam = searchParams.get('sb_url') || searchParams.get('supabase_url');
      const keyParam = searchParams.get('sb_key') || searchParams.get('supabase_key');
      if (urlParam && keyParam && urlParam.startsWith('http')) {
        saveCustomSupabaseCredentials(urlParam, keyParam);
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
        return { url: normalizeSupabaseUrl(urlParam), anonKey: keyParam.trim(), source: 'url' as const };
      }
    } catch {}
  }

  // 2. Local storage configuration
  try {
    const saved = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey && parsed.url.startsWith('http')) {
        return { url: normalizeSupabaseUrl(parsed.url), anonKey: parsed.anonKey.trim(), source: 'local' as const };
      }
    }
  } catch {}

  // 3. Environment variables
  const env = (import.meta as any)?.env || {};
  const envUrl = (env.VITE_SUPABASE_URL as string) || '';
  const envKey = (env.VITE_SUPABASE_ANON_KEY as string) || '';

  if (envUrl && envKey && !envUrl.includes('your-project') && envUrl.startsWith('http')) {
    return { url: normalizeSupabaseUrl(envUrl), anonKey: envKey.trim(), source: 'env' as const };
  }

  // Built-in automatic fallback (zero configuration required)
  return { 
    url: normalizeSupabaseUrl(DEFAULT_SUPABASE_URL), 
    anonKey: DEFAULT_SUPABASE_ANON_KEY, 
    source: 'auto' as const 
  };
};

export const isSupabaseConfigured = (): boolean => {
  return true;
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey || !url.startsWith('http') || url.includes('your-project')) return null;

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.warn('Falha ao inicializar cliente Supabase:', err);
      return null;
    }
  }
  return supabaseInstance;
};

export const saveCustomSupabaseCredentials = (url: string, anonKey: string) => {
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
  supabaseInstance = null; // force re-instantiation
};

export const clearCustomSupabaseCredentials = () => {
  localStorage.removeItem(SUPABASE_CONFIG_KEY);
  supabaseInstance = null;
};

/**
 * Generates an access link that automatically configures Supabase when opened on any other machine.
 */
export const getShareableConnectionLink = (): string => {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey || !url.startsWith('http')) return '';
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin + window.location.pathname;
  return `${origin}?sb_url=${encodeURIComponent(url)}&sb_key=${encodeURIComponent(anonKey)}`;
};

/**
 * Tests connection to a Supabase project by verifying auth endpoint reachability.
 */
export const testSupabaseConnection = async (
  url: string,
  anonKey: string
): Promise<{ success: boolean; error?: string; latencyMs?: number }> => {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();

  if (!cleanUrl || !cleanKey) {
    return { success: false, error: 'URL e Chave Anon são obrigatórias.' };
  }
  if (!cleanUrl.startsWith('http')) {
    return { success: false, error: 'A URL do Supabase deve iniciar com https://' };
  }

  const start = Date.now();
  try {
    const testClient = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await testClient.auth.getSession();
    const latencyMs = Date.now() - start;

    if (error && !error.message?.includes('session')) {
      return { success: false, error: error.message };
    }
    return { success: true, latencyMs };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao conectar com o servidor Supabase.' };
  }
};

// ==========================================
// LOCAL USERS REPOSITORY (Fallback & Hybrid)
// ==========================================

// Seed default Master Superadmin if not exists yet
const initializeDefaultMasterUser = () => {
  try {
    const data = localStorage.getItem(LOCAL_USERS_LIST_KEY);
    let users: LocalUserRecord[] = data ? JSON.parse(data) : [];
    
    const masterExists = users.some(
      (u) => u.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() || u.username.toLowerCase() === MASTER_ADMIN_USERNAME.toLowerCase()
    );

    if (!masterExists) {
      const masterUser: LocalUserRecord = {
        id: 'usr_master_amaryelcc',
        email: MASTER_ADMIN_EMAIL,
        username: MASTER_ADMIN_USERNAME,
        passwordHash: 'admin123', // initial default password, user can change in profile
        role: 'superadmin',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      users.unshift(masterUser);
      localStorage.setItem(LOCAL_USERS_LIST_KEY, JSON.stringify(users));
    }
  } catch {}
};

initializeDefaultMasterUser();

export const getLocalUsers = (): LocalUserRecord[] => {
  try {
    const data = localStorage.getItem(LOCAL_USERS_LIST_KEY);
    if (data) {
      const parsed: LocalUserRecord[] = JSON.parse(data);
      // Ensure master admin is always superadmin and active
      return parsed.map((u) => {
        if (isMasterSuperAdmin(u.email) || isMasterSuperAdmin(u.username)) {
          return { ...u, role: 'superadmin', status: 'active' };
        }
        return {
          ...u,
          status: u.status || 'active',
          role: u.role || 'operator',
        };
      });
    }
  } catch {}
  return [];
};

export const saveLocalUser = (user: LocalUserRecord) => {
  const users = getLocalUsers();
  const isMaster = isMasterSuperAdmin(user.email) || isMasterSuperAdmin(user.username);
  const sanitizedUser: LocalUserRecord = {
    ...user,
    role: isMaster ? 'superadmin' : user.role || 'operator',
    status: isMaster ? 'active' : user.status || 'active',
  };

  const existingIndex = users.findIndex(
    (u) =>
      u.email.toLowerCase() === user.email.toLowerCase() ||
      u.username.toLowerCase() === user.username.toLowerCase() ||
      u.id === user.id
  );

  if (existingIndex >= 0) {
    users[existingIndex] = { ...users[existingIndex], ...sanitizedUser };
  } else {
    users.push(sanitizedUser);
  }
  localStorage.setItem(LOCAL_USERS_LIST_KEY, JSON.stringify(users));
};

export const findLocalUserByIdentifier = (identifier: string): LocalUserRecord | undefined => {
  const clean = identifier.trim().toLowerCase();
  const users = getLocalUsers();
  return users.find((u) => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean);
};

export const updateLocalUserRoleAndStatus = (
  userId: string,
  newRole?: UserRole,
  newStatus?: UserStatus,
  companyId?: string,
  companyName?: string
): boolean => {
  const users = getLocalUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index >= 0) {
    const targetUser = users[index];
    
    // Protection: Master admin can never be demoted or blocked
    if (isMasterSuperAdmin(targetUser.email) || isMasterSuperAdmin(targetUser.username)) {
      users[index].role = 'superadmin';
      users[index].status = 'active';
    } else {
      if (newRole) users[index].role = newRole;
      if (newStatus) users[index].status = newStatus;
    }

    if (companyId !== undefined) {
      users[index].companyId = companyId;
      users[index].companyName = companyName || '';
    }

    localStorage.setItem(LOCAL_USERS_LIST_KEY, JSON.stringify(users));

    // Also update current active user session if matches
    const current = getSavedCurrentUser();
    if (current && current.id === userId) {
      const updated: AppUser = {
        ...current,
        role: users[index].role,
        status: users[index].status,
        companyId: users[index].companyId,
        companyName: users[index].companyName,
      };
      saveCurrentUserSession(updated);
    }
    return true;
  }
  return false;
};

export const deleteLocalUser = (userId: string): boolean => {
  const users = getLocalUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return false;

  // Master admin cannot be deleted
  if (isMasterSuperAdmin(target.email) || isMasterSuperAdmin(target.username)) {
    return false;
  }

  const filtered = users.filter((u) => u.id !== userId);
  localStorage.setItem(LOCAL_USERS_LIST_KEY, JSON.stringify(filtered));
  return true;
};

export const updateLocalUserProfile = (
  userId: string,
  params: { username?: string; email?: string; password?: string }
): boolean => {
  const users = getLocalUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index >= 0) {
    if (params.username) users[index].username = params.username.trim();
    if (params.email) users[index].email = params.email.trim().toLowerCase();
    if (params.password) users[index].passwordHash = params.password;

    localStorage.setItem(LOCAL_USERS_LIST_KEY, JSON.stringify(users));

    const current = getSavedCurrentUser();
    if (current && current.id === userId) {
      saveCurrentUserSession({
        ...current,
        username: users[index].username,
        email: users[index].email,
      });
    }
    return true;
  }
  return false;
};

export const getSavedCurrentUser = (): AppUser | null => {
  try {
    const data = localStorage.getItem(LOCAL_USER_KEY);
    if (data) {
      const user: AppUser = JSON.parse(data);
      const isMaster = isMasterSuperAdmin(user.email) || isMasterSuperAdmin(user.username);
      return {
        ...user,
        role: isMaster ? 'superadmin' : user.role || 'operator',
        status: isMaster ? 'active' : user.status || 'active',
        isMasterSuperAdmin: isMaster,
      };
    }
  } catch {}
  return null;
};

export const saveCurrentUserSession = (user: AppUser | null) => {
  if (user) {
    const isMaster = isMasterSuperAdmin(user.email) || isMasterSuperAdmin(user.username);
    const enriched: AppUser = {
      ...user,
      role: isMaster ? 'superadmin' : user.role,
      status: isMaster ? 'active' : user.status || 'active',
      isMasterSuperAdmin: isMaster,
    };
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(enriched));
  } else {
    localStorage.removeItem(LOCAL_USER_KEY);
  }
};

// ==========================================
// SUPABASE SQL SCHEMA GENERATOR SCRIPT (MULTIBANCO / MULTI-EMPRESA)
// ==========================================
export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- SCHEMA SUPABASE DEFINITIVO: CESTUP (Gestão de Cestas Básicas)
-- Compatível com identificadores de texto (prod-*, cust-*, comp-*) e UUIDs
-- Permissões totais liberadas para anon e authenticated sem bloqueio RLS
-- ==============================================================================

-- 1. Habilitar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Limpar tabelas antigas vazias com CASCADE para eliminar tipos UUID obsoletos
-- (Resolve definitivamente o erro: "invalid input syntax for type uuid")
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TABLE IF EXISTS public.stock_movements CASCADE;
DROP TABLE IF EXISTS public.purchases CASCADE;
DROP TABLE IF EXISTS public.sale_installments CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.basket_templates CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. Tabela de Empresas (Multibanco / Multi-empresa)
CREATE TABLE public.companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT NOT NULL DEFAULT '', -- CNPJ
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  pix_key TEXT DEFAULT '',
  pix_key_type TEXT DEFAULT 'CNPJ',
  default_basket_price NUMERIC NOT NULL DEFAULT 340.00,
  alert_days_notice INTEGER NOT NULL DEFAULT 7,
  whatsapp_message_overdue TEXT DEFAULT '',
  whatsapp_message_due_today TEXT DEFAULT '',
  whatsapp_message_upcoming TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Perfis de Usuários (com papéis, status e vínculo de empresa)
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  status TEXT NOT NULL DEFAULT 'active',
  company_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Clientes
CREATE TABLE public.customers (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  document TEXT DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  neighborhood TEXT DEFAULT '',
  city TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Produtos / Insumos de Cestas
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Geral',
  unit TEXT NOT NULL DEFAULT 'un',
  package_type TEXT DEFAULT 'fardo',
  units_per_package NUMERIC DEFAULT 1,
  package_cost NUMERIC DEFAULT 0,
  stock NUMERIC NOT NULL DEFAULT 0,
  current_stock NUMERIC DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 10,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  current_cost NUMERIC DEFAULT 0,
  reference_price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Modelos de Cestas (Templates)
CREATE TABLE public.basket_templates (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  default_sale_price NUMERIC NOT NULL DEFAULT 340.00,
  is_default BOOLEAN DEFAULT false,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Vendas de Cestas
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  sale_number TEXT NOT NULL DEFAULT '',
  customer_id TEXT,
  customer_name TEXT NOT NULL DEFAULT '',
  basket_name TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  total_sale_value NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  profit_margin_pct NUMERIC NOT NULL DEFAULT 0,
  payment_plan TEXT NOT NULL DEFAULT 'cash',
  installments_count INTEGER NOT NULL DEFAULT 1,
  delivery_date DATE,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabela de Parcelas / Contas a Receber
CREATE TABLE IF NOT EXISTS public.sale_installments (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  sale_id TEXT,
  customer_id TEXT,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT DEFAULT '',
  customer_whatsapp TEXT DEFAULT '',
  installment_number INTEGER NOT NULL DEFAULT 1,
  total_installments INTEGER NOT NULL DEFAULT 1,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending',
  paid_amount NUMERIC,
  payment_date TIMESTAMPTZ,
  payment_method TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabela de Compras (Entrada de Insumos)
CREATE TABLE IF NOT EXISTS public.purchases (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  purchase_number TEXT NOT NULL DEFAULT '',
  supplier TEXT NOT NULL DEFAULT '',
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tabela de Movimentações de Estoque
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  product_id TEXT,
  product_name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'manual_entry',
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'un',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL DEFAULT '',
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. DESABILITAR RLS OU CONCEDER ACESSO TOTAL PARA ANON E AUTHENTICATED
-- Isso garante que as operações de leitura e sincronização nunca falhem com erro 42501
-- ==============================================================================
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.basket_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_installments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements DISABLE ROW LEVEL SECURITY;

-- Políticas de backup se RLS for reativado
DROP POLICY IF EXISTS "Acesso público companies" ON public.companies;
CREATE POLICY "Acesso público companies" ON public.companies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público profiles" ON public.profiles;
CREATE POLICY "Acesso público profiles" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público customers" ON public.customers;
CREATE POLICY "Acesso público customers" ON public.customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público products" ON public.products;
CREATE POLICY "Acesso público products" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público basket_templates" ON public.basket_templates;
CREATE POLICY "Acesso público basket_templates" ON public.basket_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público sales" ON public.sales;
CREATE POLICY "Acesso público sales" ON public.sales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público sale_installments" ON public.sale_installments;
CREATE POLICY "Acesso público sale_installments" ON public.sale_installments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público purchases" ON public.purchases;
CREATE POLICY "Acesso público purchases" ON public.purchases FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público stock_movements" ON public.stock_movements;
CREATE POLICY "Acesso público stock_movements" ON public.stock_movements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 12. Inserir Superadmin inicial na tabela de perfis
INSERT INTO public.profiles (id, username, email, role, status)
VALUES ('usr_master_amaryelcc', 'amaryelcc', 'amaryelcc@gmail.com', 'superadmin', 'active')
ON CONFLICT (id) DO UPDATE SET
  role = 'superadmin',
  status = 'active';

-- 13. Função Segura para Criar Perfil quando Usuário se Cadastra no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  assigned_status TEXT;
  user_email TEXT;
  user_username TEXT;
BEGIN
  user_email := LOWER(COALESCE(NEW.email, ''));
  user_username := LOWER(COALESCE(NEW.raw_user_meta_data->>'username', split_part(user_email, '@', 1)));

  IF user_email = 'amaryelcc@gmail.com' OR user_username = 'amaryelcc' THEN
    assigned_role := 'superadmin';
  ELSE
    assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'operator');
  END IF;

  assigned_status := COALESCE(NEW.raw_user_meta_data->>'status', 'active');

  BEGIN
    INSERT INTO public.profiles (id, username, email, role, status, company_id)
    VALUES (
      NEW.id::text,
      user_username,
      user_email,
      assigned_role,
      assigned_status,
      NEW.raw_user_meta_data->>'company_id'
    )
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      email = EXCLUDED.email,
      role = CASE 
        WHEN user_email = 'amaryelcc@gmail.com' OR user_username = 'amaryelcc' THEN 'superadmin' 
        ELSE EXCLUDED.role 
      END,
      status = EXCLUDED.status,
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    -- Não aborta o cadastro no Auth mesmo se ocorrer erro na tabela
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 14. Liberar permissões completas para as roles anon e authenticated
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 15. Forçar atualização do cache de esquema do Supabase (PostgREST)
NOTIFY pgrst, 'reload schema';
`;
