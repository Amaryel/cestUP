import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppUser, UserRole } from '../types';

// Storage keys for Supabase & local auth persistence
const SUPABASE_CONFIG_KEY = 'cestup_supabase_config_v1';
const LOCAL_USER_KEY = 'cestup_auth_user_v1';
const LOCAL_USERS_LIST_KEY = 'cestup_registered_users_v1';

// Read from env or local storage configuration
export const getSupabaseCredentials = () => {
  const env = (import.meta as any)?.env || {};
  const envUrl = (env.VITE_SUPABASE_URL as string) || '';
  const envKey = (env.VITE_SUPABASE_ANON_KEY as string) || '';

  if (envUrl && envKey) {
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

  return { url: '', anonKey: '', source: 'none' as const };
};

export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http'));
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) return null;

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
export const getLocalUsers = (): Array<{ id: string; email: string; username: string; passwordHash: string; role: UserRole; createdAt: string }> => {
  try {
    const data = localStorage.getItem(LOCAL_USERS_LIST_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return [];
};

export const saveLocalUser = (user: { id: string; email: string; username: string; passwordHash: string; role: UserRole; createdAt: string }) => {
  const users = getLocalUsers();
  const existingIndex = users.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase() || u.id === user.id);
  if (existingIndex >= 0) {
    users[existingIndex] = { ...users[existingIndex], ...user };
  } else {
    users.push(user);
  }
  localStorage.setItem(LOCAL_USERS_LIST_KEY, JSON.stringify(users));
};

export const updateLocalUserRole = (userId: string, newRole: UserRole): boolean => {
  const users = getLocalUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index >= 0) {
    users[index].role = newRole;
    localStorage.setItem(LOCAL_USERS_LIST_KEY, JSON.stringify(users));
    
    // Also update current active user if matches
    const current = getSavedCurrentUser();
    if (current && current.id === userId) {
      const updated = { ...current, role: newRole };
      saveCurrentUserSession(updated);
    }
    return true;
  }
  return false;
};

export const getSavedCurrentUser = (): AppUser | null => {
  try {
    const data = localStorage.getItem(LOCAL_USER_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return null;
};

export const saveCurrentUserSession = (user: AppUser | null) => {
  if (user) {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(LOCAL_USER_KEY);
  }
};

// ==========================================
// SUPABASE SQL SCHEMA GENERATOR SCRIPT
// ==========================================
export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- SCHEMA SUPABASE: CESTUP (Gestão de Cestas Básicas)
-- Copie e cole este script no SQL Editor do seu painel Supabase (Database -> SQL Editor)
-- ==============================================================================

-- 1. Habilitar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Perfis de Usuários (com papéis: superadmin, admin, operator)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'superadmin' CHECK (role IN ('superadmin', 'admin', 'operator')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS em Perfis
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfis visíveis por usuários autenticados" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Usuários podem atualizar seus próprios dados ou superadmin" 
  ON public.profiles FOR ALL 
  TO authenticated 
  USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin');

-- 3. Trigger para criar perfil automaticamente no SignUp do Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  assigned_role TEXT;
BEGIN
  -- Se for o primeiro usuário cadastrado no sistema, torna-se 'superadmin'
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count = 0 THEN
    assigned_role := 'superadmin';
  ELSE
    assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'superadmin');
  END IF;

  INSERT INTO public.profiles (id, username, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    assigned_role
  );
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

CREATE POLICY "Acesso total a usuários autenticados" ON public.customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total a produtos" ON public.products FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total a modelos de cestas" ON public.basket_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total a vendas" ON public.sales FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total a parcelas" ON public.sale_installments FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total a compras" ON public.purchases FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total a estoque" ON public.stock_movements FOR ALL TO authenticated USING (true);
`;
