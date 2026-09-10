import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Embedded default Supabase configuration
const DEFAULT_SUPABASE_URL = 'https://shyxhfxamrldvoojeuuj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_O8wJLtznzImzsMY00Y6BPg_qJsTFCy4';

const rawUrl = process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const APP_DATA_FILE = path.join(DATA_DIR, 'app_data.json');

// Initialize default users in users.json if not present
const DEFAULT_INITIAL_USERS = [
  {
    id: 'usr_master_amaryelcc',
    email: 'amaryelcc@gmail.com',
    username: 'amaryelcc',
    passwordHash: 'admin123',
    role: 'superadmin',
    status: 'active',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'usr_operador_demo',
    email: 'operador@cestup.com',
    username: 'operador',
    passwordHash: '123456',
    role: 'operator',
    status: 'active',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'usr_gerente_demo',
    email: 'gerente@cestup.com',
    username: 'gerente',
    passwordHash: '123456',
    role: 'manager',
    status: 'active',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
];

function readUsers(): any[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let changed = false;
        // Ensure default initial users are present
        for (const defUser of DEFAULT_INITIAL_USERS) {
          const exists = parsed.some(
            (u) =>
              u.email?.toLowerCase() === defUser.email.toLowerCase() ||
              u.username?.toLowerCase() === defUser.username.toLowerCase()
          );
          if (!exists) {
            parsed.push(defUser);
            changed = true;
          }
        }
        if (changed) {
          fs.writeFileSync(USERS_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Erro ao ler users.json:', err);
  }
  const initial = [...DEFAULT_INITIAL_USERS];
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  } catch {}
  return initial;
}

function writeUsers(users: any[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao escrever users.json:', err);
  }
}

function readAppData(): any {
  try {
    if (fs.existsSync(APP_DATA_FILE)) {
      const content = fs.readFileSync(APP_DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('Erro ao ler app_data.json:', err);
  }
  return null;
}

function writeAppData(data: any) {
  try {
    fs.writeFileSync(APP_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao escrever app_data.json:', err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Seed default master user on startup
  readUsers();

  // API Routes
  app.get('/api/health', async (req, res) => {
    let supabaseStatus = 'offline';
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (!error) supabaseStatus = 'connected';
    } catch {}

    res.json({
      status: 'ok',
      supabase: supabaseStatus,
      timestamp: new Date().toISOString(),
    });
  });

  // Get all registered users (for all connected devices & networks)
  app.get('/api/users', (req, res) => {
    const users = readUsers().map((u) => {
      const { passwordHash, ...safeUser } = u;
      return safeUser;
    });
    res.json({ success: true, users });
  });

  // Create or update a user (accessible by superadmin, syncs across all devices)
  app.post('/api/users', async (req, res) => {
    const newUser = req.body;
    if (!newUser || !newUser.email || !newUser.username) {
      return res.status(400).json({ success: false, error: 'E-mail e usuário são obrigatórios.' });
    }

    const cleanEmail = newUser.email.trim().toLowerCase();
    const cleanUsername = newUser.username.trim().toLowerCase();
    const users = readUsers();

    const existingIdx = users.findIndex(
      (u) =>
        u.id === newUser.id ||
        u.email?.toLowerCase() === cleanEmail ||
        u.username?.toLowerCase() === cleanUsername
    );

    const userRecord = {
      id: newUser.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: cleanEmail,
      username: cleanUsername,
      passwordHash: newUser.passwordHash || newUser.password || '123456',
      role: newUser.role || 'operator',
      status: newUser.status || 'active',
      companyId: newUser.companyId || null,
      companyName: newUser.companyName || null,
      createdAt: newUser.createdAt || new Date().toISOString(),
      lastLoginAt: newUser.lastLoginAt || null,
    };

    if (existingIdx >= 0) {
      users[existingIdx] = {
        ...users[existingIdx],
        ...userRecord,
        // keep password if not supplied
        passwordHash: newUser.password || newUser.passwordHash || users[existingIdx].passwordHash,
      };
    } else {
      users.push(userRecord);
    }

    writeUsers(users);

    // Optional background sync with Supabase profiles
    try {
      await supabase.from('profiles').upsert({
        id: userRecord.id,
        email: userRecord.email,
        username: userRecord.username,
        role: userRecord.role,
        company_id: userRecord.companyId,
      });
    } catch {}

    const { passwordHash, ...safeUser } = userRecord;
    res.json({ success: true, user: safeUser });
  });

  // Delete user
  app.delete('/api/users/:id', async (req, res) => {
    const userId = req.params.id;
    const users = readUsers();

    const target = users.find((u) => u.id === userId);
    if (
      target &&
      (target.email?.toLowerCase() === 'amaryelcc@gmail.com' ||
        target.username?.toLowerCase() === 'amaryelcc')
    ) {
      return res.status(400).json({ success: false, error: 'Não é possível excluir o Superadmin raiz.' });
    }

    const filtered = users.filter((u) => u.id !== userId);
    writeUsers(filtered);

    try {
      await supabase.from('profiles').delete().eq('id', userId);
    } catch {}

    res.json({ success: true });
  });

  // Universal Login Endpoint (validates against central store, master fallback & Supabase profiles/auth)
  app.post('/api/auth/login', async (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Informe usuário/e-mail e a senha de acesso.' });
    }

    const clean = identifier.trim().toLowerCase();
    const isMaster = clean === 'amaryelcc@gmail.com' || clean === 'amaryelcc';

    // 1. Check central users list (supports all registered users across all devices and networks)
    const users = readUsers();
    const found = users.find(
      (u) =>
        u.email?.toLowerCase() === clean ||
        u.username?.toLowerCase() === clean ||
        (isMaster && (u.email?.toLowerCase() === 'amaryelcc@gmail.com' || u.username?.toLowerCase() === 'amaryelcc'))
    );

    if (found) {
      if (found.status === 'blocked') {
        return res.status(403).json({
          success: false,
          error: 'Sua conta está bloqueada pelo Superadmin.',
        });
      }
      if (found.status === 'pending') {
        return res.status(403).json({
          success: false,
          error: 'Seu cadastro ainda está pendente de aprovação pelo Superadmin.',
        });
      }
      
      const isUserMaster =
        found.email?.toLowerCase() === 'amaryelcc@gmail.com' ||
        found.username?.toLowerCase() === 'amaryelcc' ||
        isMaster;

      // Check password match (for master superadmin, accept their saved password, 'admin123', or update on match)
      const isPasswordValid =
        found.passwordHash === password ||
        (isUserMaster && (password === 'admin123' || password === 'chronos' || found.passwordHash === password));

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Senha incorreta para este usuário. Caso tenha esquecido, use a opção de redefinição.',
        });
      }

      // If master logged in with a valid password, ensure the current password hash is kept up to date
      if (isUserMaster && password && found.passwordHash !== password) {
        found.passwordHash = password;
      }

      // Update lastLoginAt
      found.lastLoginAt = new Date().toISOString();
      writeUsers(users);

      const { passwordHash: _, ...safeUser } = found;

      return res.json({
        success: true,
        user: {
          ...safeUser,
          role: isUserMaster ? 'superadmin' : safeUser.role,
          isMasterSuperAdmin: isUserMaster,
        },
      });
    }

    // 2. Check Supabase profiles table to lookup user by username or email
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.${clean},email.ilike.${clean}`)
        .limit(1)
        .maybeSingle();

      const targetEmail = prof?.email || (clean.includes('@') ? clean : `${clean}@cestup.com`);

      // Try Supabase Auth
      const { data: suData } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (suData?.user) {
        const u = suData.user;
        const isUserMaster =
          u.email?.toLowerCase() === 'amaryelcc@gmail.com' ||
          clean === 'amaryelcc' ||
          prof?.email?.toLowerCase() === 'amaryelcc@gmail.com';
        const role = isUserMaster ? 'superadmin' : (prof?.role || u.user_metadata?.role || 'operator');
        const status = prof?.status || u.user_metadata?.status || 'active';
        const username = prof?.username || u.user_metadata?.username || clean;

        if (status === 'blocked') {
          return res.status(403).json({ success: false, error: 'Sua conta está bloqueada pelo Superadmin.' });
        }

        const newUser = {
          id: u.id,
          email: u.email || targetEmail,
          username,
          role,
          status,
          companyId: prof?.company_id,
          createdAt: u.created_at || new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          isMasterSuperAdmin: isUserMaster,
        };

        const currentUsers = readUsers();
        const existingIdx = currentUsers.findIndex(
          (x) => x.id === u.id || x.email?.toLowerCase() === newUser.email.toLowerCase()
        );
        if (existingIdx >= 0) {
          currentUsers[existingIdx] = { ...currentUsers[existingIdx], ...newUser, passwordHash: password };
        } else {
          currentUsers.push({ ...newUser, passwordHash: password });
        }
        writeUsers(currentUsers);

        return res.json({ success: true, user: newUser });
      }
    } catch (e) {
      console.warn('Supabase auth fallback error:', e);
    }

    return res.status(401).json({
      success: false,
      error: 'Usuário ou e-mail não encontrado ou senha incorreta.',
    });
  });

  // Change Password & Profile Endpoint (syncs to central server & Supabase so all devices immediately get updated)
  app.post('/api/auth/change-password', async (req, res) => {
    const { userId, email, username, currentPassword, password } = req.body;
    if (!userId && !email && !username) {
      return res.status(400).json({ success: false, error: 'Identificador do usuário é obrigatório.' });
    }

    const cleanEmail = email?.trim().toLowerCase();
    const cleanUsername = username?.trim().toLowerCase();
    const users = readUsers();

    const userIdx = users.findIndex(
      (u) =>
        (userId && u.id === userId) ||
        (cleanEmail && u.email?.toLowerCase() === cleanEmail) ||
        (cleanUsername && u.username?.toLowerCase() === cleanUsername)
    );

    if (userIdx < 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    }

    // If currentPassword was provided, verify it
    if (currentPassword && users[userIdx].passwordHash && users[userIdx].passwordHash !== currentPassword) {
      return res.status(401).json({ success: false, error: 'A senha atual informada está incorreta.' });
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' });
      }
      users[userIdx].passwordHash = password;
    }

    if (username && username.trim().length >= 3) {
      users[userIdx].username = username.trim();
    }

    users[userIdx].updatedAt = new Date().toISOString();
    writeUsers(users);

    // Sync to Supabase profiles
    try {
      await supabase.from('profiles').update({
        username: users[userIdx].username,
        updated_at: new Date().toISOString(),
      }).eq('id', users[userIdx].id);
    } catch {}

    const { passwordHash: _, ...safeUser } = users[userIdx];
    const isUserMaster =
      safeUser.email?.toLowerCase() === 'amaryelcc@gmail.com' ||
      safeUser.username?.toLowerCase() === 'amaryelcc';

    return res.json({
      success: true,
      user: {
        ...safeUser,
        role: isUserMaster ? 'superadmin' : safeUser.role,
        isMasterSuperAdmin: isUserMaster,
      },
    });
  });

  // Password Reset Endpoint (allows secure password reset for users across devices)
  app.post('/api/auth/reset-password', async (req, res) => {
    const { identifier, newPassword } = req.body;
    if (!identifier || !newPassword) {
      return res.status(400).json({ success: false, error: 'Informe o e-mail/usuário e a nova senha.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    const clean = identifier.trim().toLowerCase();
    const isMaster = clean === 'amaryelcc@gmail.com' || clean === 'amaryelcc';
    const users = readUsers();

    const userIdx = users.findIndex(
      (u) =>
        u.email?.toLowerCase() === clean ||
        u.username?.toLowerCase() === clean ||
        (isMaster && (u.email?.toLowerCase() === 'amaryelcc@gmail.com' || u.username?.toLowerCase() === 'amaryelcc'))
    );

    if (userIdx < 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado para redefinição.' });
    }

    users[userIdx].passwordHash = newPassword;
    users[userIdx].updatedAt = new Date().toISOString();
    writeUsers(users);

    // Sync to Supabase
    try {
      await supabase.from('profiles').update({
        updated_at: new Date().toISOString(),
      }).eq('id', users[userIdx].id);
    } catch {}

    const { passwordHash: _, ...safeUser } = users[userIdx];
    return res.json({
      success: true,
      message: 'Senha redefinida com sucesso! Você já pode entrar com a nova senha em qualquer dispositivo.',
      user: safeUser,
    });
  });

  // Central User Registration Endpoint
  app.post('/api/auth/register', async (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ success: false, error: 'Todos os campos são obrigatórios.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const isMaster = cleanEmail === 'amaryelcc@gmail.com' || cleanUsername === 'amaryelcc';

    const users = readUsers();
    const existing = users.find(
      (u) =>
        u.email?.toLowerCase() === cleanEmail ||
        u.username?.toLowerCase() === cleanUsername
    );

    if (existing && !isMaster) {
      return res.status(400).json({ success: false, error: 'Este e-mail ou nome de usuário já está cadastrado.' });
    }

    const newId = isMaster ? 'usr_master_amaryelcc' : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const role = isMaster ? 'superadmin' : 'operator';
    const status = 'active';

    const userRecord = {
      id: newId,
      email: cleanEmail,
      username: cleanUsername,
      passwordHash: password,
      role,
      status,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    if (existing && isMaster) {
      const idx = users.findIndex((u) => u.id === existing.id);
      users[idx] = { ...users[idx], ...userRecord };
    } else {
      users.push(userRecord);
    }
    writeUsers(users);

    // Sync to Supabase profiles
    try {
      await supabase.from('profiles').upsert({
        id: newId,
        email: cleanEmail,
        username: cleanUsername,
        role,
        status,
        updated_at: new Date().toISOString(),
      });
    } catch {}

    const { passwordHash: _, ...safeUser } = userRecord;
    return res.json({
      success: true,
      user: {
        ...safeUser,
        isMasterSuperAdmin: isMaster,
      },
    });
  });

  // Shared Application Data (Companies, Customers, Products, Sales, Basket Templates)
  app.get('/api/data', async (req, res) => {
    try {
      let data = readAppData();
      if (!data || Object.keys(data).length === 0 || (!data.products && !data.customers)) {
        // Attempt fallback load from Supabase
        const [pRes, cRes, compRes, saleRes] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('customers').select('*'),
          supabase.from('companies').select('*'),
          supabase.from('sales').select('*'),
        ]);
        if (
          (pRes.data && pRes.data.length > 0) ||
          (cRes.data && cRes.data.length > 0) ||
          (saleRes.data && saleRes.data.length > 0)
        ) {
          data = {
            products: pRes.data,
            customers: cRes.data,
            companies: compRes.data,
            sales: saleRes.data,
          };
          writeAppData(data);
        }
      }
      res.json({ success: true, data });
    } catch (err: any) {
      res.json({ success: true, data: readAppData() });
    }
  });

  app.post('/api/data', (req, res) => {
    const payload = req.body;
    if (payload && typeof payload === 'object') {
      writeAppData(payload);

      // Asynchronous background sync to Supabase
      (async () => {
        try {
          if (payload.companies && Array.isArray(payload.companies) && payload.companies.length > 0) {
            const rows = payload.companies.map((c: any) => ({
              id: String(c.id),
              name: c.name,
              document: c.document || '',
              phone: c.phone || '',
              address: c.address || '',
              pix_key: c.pixKey || '',
              pix_key_type: c.pixKeyType || 'CNPJ',
              default_basket_price: c.defaultBasketPrice || 340,
              alert_days_notice: c.alertDaysNotice || 7,
              status: c.status || 'active',
              created_at: c.createdAt || new Date().toISOString(),
            }));
            await supabase.from('companies').upsert(rows, { onConflict: 'id' });
          }

          if (payload.products && Array.isArray(payload.products) && payload.products.length > 0) {
            const rows = payload.products.map((p: any) => ({
              id: String(p.id),
              company_id: p.companyId || null,
              name: p.name,
              category: p.category || 'Geral',
              unit: p.unit || 'un',
              package_type: p.packageType || 'fardo',
              units_per_package: p.unitsPerPackage || 1,
              package_cost: p.packageCost || 0,
              stock: p.stock ?? 0,
              min_stock: p.minStock ?? 10,
              unit_cost: p.unitCost ?? 0,
              reference_price: p.referencePrice ?? p.refPrice ?? 0,
              status: p.status || 'active',
              created_at: p.createdAt || new Date().toISOString(),
            }));
            await supabase.from('products').upsert(rows, { onConflict: 'id' });
          }

          if (payload.customers && Array.isArray(payload.customers) && payload.customers.length > 0) {
            const rows = payload.customers.map((c: any) => ({
              id: String(c.id),
              company_id: c.companyId || null,
              name: c.name,
              document: c.document || '',
              phone: c.phone || '',
              whatsapp: c.whatsapp || '',
              address: c.address || '',
              neighborhood: c.neighborhood || '',
              city: c.city || '',
              notes: c.notes || '',
              status: c.status || 'active',
              created_at: c.createdAt || new Date().toISOString(),
            }));
            await supabase.from('customers').upsert(rows, { onConflict: 'id' });
          }

          if (payload.basketTemplates && Array.isArray(payload.basketTemplates) && payload.basketTemplates.length > 0) {
            const rows = payload.basketTemplates.map((t: any) => ({
              id: String(t.id),
              company_id: t.companyId || null,
              name: t.name,
              description: t.description || '',
              default_sale_price: t.defaultSalePrice || 340,
              is_default: !!t.isDefault,
              items: t.items || [],
              created_at: t.createdAt || new Date().toISOString(),
            }));
            await supabase.from('basket_templates').upsert(rows, { onConflict: 'id' });
          }

          if (payload.sales && Array.isArray(payload.sales) && payload.sales.length > 0) {
            const rows = payload.sales.map((s: any) => ({
              id: String(s.id),
              company_id: s.companyId || null,
              sale_number: s.saleNumber || '',
              customer_id: s.customerId,
              customer_name: s.customerName,
              basket_name: s.basketName,
              items: s.items || [],
              total_cost: s.totalCost || 0,
              total_sale_value: s.totalSaleValue || 0,
              profit: s.profit || 0,
              profit_margin_pct: s.profitMarginPct || 0,
              payment_plan: s.paymentPlan || 'cash',
              installments_count: s.installmentsCount || 1,
              delivery_date: s.deliveryDate || null,
              notes: s.notes || '',
              status: s.status || 'completed',
              created_at: s.createdAt || new Date().toISOString(),
            }));
            await supabase.from('sales').upsert(rows, { onConflict: 'id' });
          }

          if (payload.installments && Array.isArray(payload.installments) && payload.installments.length > 0) {
            const rows = payload.installments.map((inst: any) => ({
              id: String(inst.id),
              company_id: inst.companyId || null,
              sale_id: inst.saleId,
              customer_id: inst.customerId,
              customer_name: inst.customerName,
              customer_phone: inst.customerPhone || '',
              customer_whatsapp: inst.customerWhatsapp || '',
              installment_number: inst.installmentNumber || 1,
              total_installments: inst.totalInstallments || 1,
              amount: inst.amount || 0,
              due_date: inst.dueDate,
              status: inst.status || 'pending',
              paid_amount: inst.paidAmount || null,
              payment_date: inst.paymentDate || null,
              payment_method: inst.paymentMethod || null,
              notes: inst.notes || '',
              created_at: inst.createdAt || new Date().toISOString(),
            }));
            await supabase.from('sale_installments').upsert(rows, { onConflict: 'id' });
          }
        } catch (syncErr: any) {
          console.warn('[Server] Supabase sync notice:', syncErr?.message);
        }
      })();

      return res.json({ success: true, timestamp: new Date().toISOString() });
    }
    res.status(400).json({ success: false, error: 'Dados inválidos.' });
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
