import express from 'express';
import path from 'path';
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // API Health route
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
