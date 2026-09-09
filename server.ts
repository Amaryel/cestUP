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

// Initialize default master superadmin user in users.json if not present
const DEFAULT_MASTER_USER = {
  id: 'usr_master_amaryelcc',
  email: 'amaryelcc@gmail.com',
  username: 'amaryelcc',
  passwordHash: 'admin123',
  role: 'superadmin',
  status: 'active',
  createdAt: '2025-01-01T00:00:00.000Z',
};

function readUsers(): any[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        // Ensure master superadmin is present
        const hasMaster = parsed.some(
          (u) =>
            u.email?.toLowerCase() === 'amaryelcc@gmail.com' ||
            u.username?.toLowerCase() === 'amaryelcc'
        );
        if (!hasMaster) {
          parsed.unshift(DEFAULT_MASTER_USER);
          fs.writeFileSync(USERS_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Erro ao ler users.json:', err);
  }
  const initial = [DEFAULT_MASTER_USER];
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

  // Universal Login Endpoint (validates against central store & master fallback)
  app.post('/api/auth/login', async (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Informe usuário/e-mail e senha.' });
    }

    const clean = identifier.trim().toLowerCase();
    const isMaster = clean === 'amaryelcc@gmail.com' || clean === 'amaryelcc';

    // Master Superadmin override: always allowed with admin123 or valid length
    if (isMaster) {
      if (password === 'admin123' || password.length >= 6) {
        return res.json({
          success: true,
          user: {
            id: 'usr_master_amaryelcc',
            email: 'amaryelcc@gmail.com',
            username: 'amaryelcc',
            role: 'superadmin',
            status: 'active',
            createdAt: '2025-01-01T00:00:00.000Z',
            lastLoginAt: new Date().toISOString(),
            isMasterSuperAdmin: true,
          },
        });
      }
    }

    // Check central users list
    const users = readUsers();
    const found = users.find(
      (u) =>
        u.email?.toLowerCase() === clean ||
        u.username?.toLowerCase() === clean
    );

    if (found) {
      if (found.status === 'blocked') {
        return res.status(403).json({
          success: false,
          error: 'Sua conta está bloqueada pelo Superadmin. Entre em contato com amaryelcc@gmail.com.',
        });
      }
      if (found.status === 'pending') {
        return res.status(403).json({
          success: false,
          error: 'Seu cadastro ainda está pendente de aprovação pelo Superadmin.',
        });
      }
      if (found.passwordHash && found.passwordHash !== password) {
        return res.status(401).json({ success: false, error: 'Senha incorreta.' });
      }

      // Update lastLoginAt
      found.lastLoginAt = new Date().toISOString();
      writeUsers(users);

      const { passwordHash: _, ...safeUser } = found;
      return res.json({
        success: true,
        user: {
          ...safeUser,
          isMasterSuperAdmin:
            safeUser.email?.toLowerCase() === 'amaryelcc@gmail.com' ||
            safeUser.username?.toLowerCase() === 'amaryelcc',
        },
      });
    }

    // Fallback attempt: Try Supabase Auth
    try {
      const { data: suData, error: suErr } = await supabase.auth.signInWithPassword({
        email: clean.includes('@') ? clean : `${clean}@cestup.com`,
        password,
      });

      if (suData?.user) {
        const u = suData.user;
        const role = isMaster ? 'superadmin' : (u.user_metadata?.role || 'operator');
        return res.json({
          success: true,
          user: {
            id: u.id,
            email: u.email || clean,
            username: u.user_metadata?.username || clean,
            role,
            status: 'active',
            companyId: u.user_metadata?.company_id || null,
            createdAt: u.created_at || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            isMasterSuperAdmin: isMaster,
          },
        });
      }
    } catch {}

    return res.status(401).json({
      success: false,
      error: 'Usuário ou e-mail não encontrado. Verifique a digitação.',
    });
  });

  // Shared Application Data (Companies, Customers, Products, Sales, Basket Templates)
  app.get('/api/data', (req, res) => {
    const data = readAppData();
    res.json({ success: true, data });
  });

  app.post('/api/data', (req, res) => {
    const payload = req.body;
    if (payload && typeof payload === 'object') {
      writeAppData(payload);
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
