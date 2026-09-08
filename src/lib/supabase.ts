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
  createdAt: string;
  lastLoginAt?: string;
}

// Read from env or local storage configuration or default embedded config
export const getSupabaseCredentials = () => {
  const env = (import.meta as any)?.env || {};
  const envUrl = (env.VITE_SUPABASE_URL as string) || '';
  const envKey = (env.VITE_SUPABASE_ANON_KEY as string) || '';

  if (envUrl && envKey && !envUrl.includes('your-project')) {
    return { url: envUrl, anonKey: envKey, source: 'env' as const };
  }

  try {
    const saved = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return { url: parsed.url, anonKey: parsed.anonKey, source: 'local' as const };
      }
    }
  } catch {}

  // Built-in configured or active fallback
  return { 
    url: envUrl || '', 
    anonKey: envKey || '', 
    source: (envUrl && envKey ? 'env' : 'embedded') as 'env' | 'local' | 'embedded' 
  };
};

export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http') && !url.includes('your-project'));
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
  newStatus?: UserStatus
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

    localStorage.setItem(LOCAL_USERS_LIST_KEY, JSON.stringify(users));

    // Also update current active user session if matches
    const current = getSavedCurrentUser();
    if (current && current.id === userId) {
      const updated: AppUser = {
        ...current,
        role: users[index].role,
        status: users[index].status,
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
// SUPABASE SQL SCHEMA GENERATOR SCRIPT
// ==========================================
export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- SCHEMA SUPABASE: CESTUP (Gestão de Cestas Básicas)
-- Sincronização Automática com Validação de Superadmin e Status de Usuários
-- ==============================================================================

-- 1. Habilitar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Perfis de Usuários (com papéis e status de liberação/bloqueio)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('superadmin', 'admin', 'operator')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS em Perfis
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perfis visíveis por usuários autenticados" ON public.profiles;
CREATE POLICY "Perfis visíveis por usuários autenticados" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios dados ou superadmin" ON public.profiles;
CREATE POLICY "Usuários podem atualizar seus próprios dados ou superadmin" 
  ON public.profiles FOR ALL 
  TO authenticated 
  USING (
    auth.uid() = id 
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );

-- 3. Trigger para criar perfil automaticamente no SignUp do Supabase Auth
-- REGRA DE SEGURANÇA: Somente amaryelcc@gmail.com ou amaryelcc é Superadmin nativo!
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  user_email TEXT;
  user_username TEXT;
BEGIN
  user_email := LOWER(COALESCE(NEW.email, ''));
  user_username := LOWER(COALESCE(NEW.raw_user_meta_data->>'username', split_part(user_email, '@', 1)));

  -- Somente amaryelcc@gmail.com ou username amaryelcc recebe Superadmin automaticamente
  IF user_email = 'amaryelcc@gmail.com' OR user_username = 'amaryelcc' THEN
    assigned_role := 'superadmin';
  ELSE
    assigned_role := 'operator';
  END IF;

  INSERT INTO public.profiles (id, username, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(user_email, '@', 1)),
    user_email,
    assigned_role,
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    role = CASE 
      WHEN user_email = 'amaryelcc@gmail.com' OR user_username = 'amaryelcc' THEN 'superadmin' 
      ELSE profiles.role 
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  document TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  address TEXT NOT NULL,
  neighborhood TEXT,
  city TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Produtos / Insumos
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'un',
  package_type TEXT DEFAULT 'fardo',
  units_per_package NUMERIC DEFAULT 1,
  package_cost NUMERIC DEFAULT 0,
  stock NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 10,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  reference_price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Modelos de Cestas (Templates)
CREATE TABLE IF NOT EXISTS public.basket_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  default_sale_price NUMERIC NOT NULL DEFAULT 340.00,
  is_default BOOLEAN DEFAULT false,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Vendas de Cestas
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sale_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  basket_name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cost NUMERIC NOT NULL,
  total_sale_value NUMERIC NOT NULL,
  profit NUMERIC NOT NULL,
  profit_margin_pct NUMERIC NOT NULL,
  payment_plan TEXT NOT NULL,
  installments_count INTEGER NOT NULL DEFAULT 1,
  delivery_date DATE,
  notes TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabela de Parcelas / Contas a Receber
CREATE TABLE IF NOT EXISTS public.sale_installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_whatsapp TEXT,
  installment_number INTEGER NOT NULL,
  total_installments INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_amount NUMERIC,
  payment_date TIMESTAMPTZ,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabela de Compras (Entrada de Insumos)
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  purchase_number TEXT NOT NULL,
  supplier TEXT NOT NULL,
  purchase_date DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cost NUMERIC NOT NULL,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tabela de Movimentações de Estoque
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  date DATE NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Habilitar RLS em todas as tabelas
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.basket_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total a clientes" ON public.customers;
CREATE POLICY "Acesso total a clientes" ON public.customers FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Acesso total a produtos" ON public.products;
CREATE POLICY "Acesso total a produtos" ON public.products FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Acesso total a modelos de cestas" ON public.basket_templates;
CREATE POLICY "Acesso total a modelos de cestas" ON public.basket_templates FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Acesso total a vendas" ON public.sales;
CREATE POLICY "Acesso total a vendas" ON public.sales FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Acesso total a parcelas" ON public.sale_installments;
CREATE POLICY "Acesso total a parcelas" ON public.sale_installments FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Acesso total a compras" ON public.purchases;
CREATE POLICY "Acesso total a compras" ON public.purchases FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Acesso total a estoque" ON public.stock_movements;
CREATE POLICY "Acesso total a estoque" ON public.stock_movements FOR ALL TO authenticated USING (true);
`;
