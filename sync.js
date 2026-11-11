/* Controle de Cestas - sincronização com o Supabase (offline primeiro)
   O app sempre grava primeiro no aparelho. Com login e internet, envia para a nuvem;
   sem internet, guarda "alterações pendentes" e envia sozinho quando a conexão voltar.
   Conflitos (dois aparelhos alteraram) nunca são resolvidos em silêncio: o usuário escolhe. */
(function (root) {
  'use strict';
  var API = 'https://shyxhfxamrldvoojeuuj.supabase.co';
  var KEY = 'sb_publishable_O8wJLtznzImzsMY00Y6BPg_qJsTFCy4'; // chave pública: a proteção real é o RLS do banco
  var TABLE = '/rest/v1/controle_cestas_state';
  var K_AUTH = 'controle-cestas:auth', K_META = 'controle-cestas:sync', K_DEV = 'controle-cestas:device', K_BKP = 'controle-cestas:conflict-backup';
  var BACKOFF = [5, 15, 60, 120];

  var cfg = null, session = null, meta = null, conflictRow = null;
  var st = { code: 'off', msg: '' };
  var running = null, again = false, timer = null, retryN = 0, lastTry = 0, retried401 = false;

  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  function now() { return Math.floor(Date.now() / 1000); }
  function online() { return typeof navigator === 'undefined' || navigator.onLine !== false; }
  function saveMeta() { lsSet(K_META, meta); }
  function device() {
    var d = lsGet(K_DEV);
    if (!d) { d = 'd' + Math.random().toString(36).slice(2, 8); lsSet(K_DEV, d); }
    return d;
  }
  function setStatus(code, msg) { st = { code: code, msg: msg || '' }; if (cfg && cfg.onChange) cfg.onChange(); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  /* ---------- HTTP ---------- */
  function req(method, path, o) {
    o = o || {};
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var to = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    var h = { apikey: KEY, 'Content-Type': 'application/json' };
    if (o.token) h.Authorization = 'Bearer ' + o.token;
    if (o.prefer) h.Prefer = o.prefer;
    return fetch(API + path, { method: method, headers: h, body: o.body ? JSON.stringify(o.body) : undefined, signal: ctl ? ctl.signal : undefined, cache: 'no-store' })
      .then(function (r) {
        clearTimeout(to);
        return r.text().then(function (tx) {
          var j = null; try { j = tx ? JSON.parse(tx) : null; } catch (e) { /* ignore */ }
          return { ok: r.ok, status: r.status, json: j };
        });
      }, function () { clearTimeout(to); var e = new Error('rede'); e.network = true; throw e; });
  }

  /* ---------- sessão ---------- */
  function storeSession(j, user) {
    session = {
      access_token: j.access_token, refresh_token: j.refresh_token,
      expires_at: j.expires_at || (now() + (j.expires_in || 3600)),
      user: user || { id: j.user && j.user.id, email: j.user && j.user.email }
    };
    lsSet(K_AUTH, session);
  }
  function clearSession() { session = null; lsDel(K_AUTH); }
  function token() {
    if (!session) { var e = new Error('sem sessão'); e.expired = true; return Promise.reject(e); }
    if (session.expires_at - 60 > now()) return Promise.resolve(session.access_token);
    return req('POST', '/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: session.refresh_token } }).then(function (r) {
      if (r.ok && r.json && r.json.access_token) { storeSession(r.json, session.user); return session.access_token; }
      if (r.status >= 400 && r.status < 500) { clearSession(); var e = new Error('sessão expirada'); e.expired = true; throw e; }
      var e2 = new Error('servidor'); e2.server = true; throw e2;
    });
  }

  function loginError(r) {
    var code = r.json && (r.json.error_code || r.json.code || r.json.error);
    var m = r.json && (r.json.msg || r.json.message || r.json.error_description) || '';
    if (r.status === 429 || code === 'over_request_rate_limit') return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
    if (code === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar (veja a caixa de entrada).';
    if (code === 'invalid_credentials' || /invalid login/i.test(m) || r.status === 400) return 'E-mail ou senha incorretos.';
    return 'Não foi possível entrar agora (erro ' + r.status + '). Tente de novo em instantes.';
  }

  function onSignedIn() {
    if (meta.userId && meta.userId !== session.user.id) meta = { rev: 0, dirty: true, seq: (meta.seq || 0) + 1, last: null, userId: session.user.id };
    else meta.userId = session.user.id;
    saveMeta(); retryN = 0;
    setStatus('syncing');
    sync();
  }

  function authError(r) {
    var code = r.json && (r.json.error_code || r.json.code || r.json.error);
    var m = (r.json && (r.json.msg || r.json.message || r.json.error_description)) || '';
    if (r.status === 429 || code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
    if (code === 'user_already_exists' || /already registered/i.test(m)) return 'Este e-mail já tem conta. Use a aba Entrar.';
    if (code === 'weak_password' || /password/i.test(m)) return 'Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.';
    if (code === 'signup_disabled') return 'Novos cadastros estão desativados neste sistema.';
    if (code === 'validation_failed' || /valid email|invalid.*email/i.test(m)) return 'Informe um e-mail válido.';
    return 'Não foi possível criar a conta agora (erro ' + r.status + '). Tente de novo em instantes.';
  }
  function signup(email, password) {
    if (!online()) return Promise.resolve({ ok: false, error: 'Sem internet. Conecte-se para criar a conta.' });
    return req('POST', '/auth/v1/signup', { body: { email: String(email).trim(), password: password } }).then(function (r) {
      if (!r.ok || !r.json) return { ok: false, error: authError(r) };
      if (r.json.access_token) { storeSession(r.json); onSignedIn(); return { ok: true }; }
      return { ok: true, confirm: true }; // o Supabase pede confirmação por e-mail antes do primeiro acesso
    }, function () { return { ok: false, error: 'Sem conexão com o servidor. Tente de novo.' }; });
  }

  function login(email, password) {
    if (!online()) return Promise.resolve({ ok: false, error: 'Sem internet. Conecte-se para entrar.' });
    return req('POST', '/auth/v1/token?grant_type=password', { body: { email: String(email).trim(), password: password } }).then(function (r) {
      if (!r.ok || !r.json || !r.json.access_token) return { ok: false, error: loginError(r) };
      storeSession(r.json); onSignedIn();
      return { ok: true };
    }, function () { return { ok: false, error: 'Sem conexão com o servidor. Tente de novo.' }; });
  }

  function logout() {
    var tk = session && session.access_token;
    clearTimeout(timer); clearSession(); conflictRow = null;
    setStatus('off');
    if (tk && online()) req('POST', '/auth/v1/logout?scope=local', { token: tk }).catch(function () { /* ignore */ });
  }

  /* ---------- dados ---------- */
  function envelope(state) { return { v: 1, state: state }; }
  function validEnvelope(x) { return x && typeof x === 'object' && x.v === 1 && x.state && typeof x.state === 'object'; }
  function summary(env, updated) {
    var s = (env && env.state) || {};
    var n = function (a) { return Array.isArray(a) ? a.length : 0; };
    return { sales: n(s.sales), purchases: n(s.purchases), customers: n(s.customers), updated: updated || null };
  }

  function run() {
    return token().then(function (tk) {
      var path = TABLE + '?select=state,rev,updated_at&user_id=eq.' + encodeURIComponent(session.user.id);
      return req('GET', path, { token: tk }).then(function (r) {
        if (!r.ok) throw httpErr(r);
        return decide(tk, r.json && r.json[0]);
      });
    });
  }

  function decide(tk, row) {
    if (!row) return insertRow(tk);
    if (!validEnvelope(row.state)) { var e = new Error('formato'); e.format = true; throw e; }
    if (row.rev === meta.rev) return meta.dirty ? patchRow(tk) : done();
    if (!meta.dirty) { applyRemote(row); return done(); }
    conflictRow = row;
    setStatus('conflict', 'Este aparelho e a nuvem foram alterados separadamente. Escolha qual versão manter.');
    return null;
  }

  function applyRemote(row) {
    cfg.applyRemote(row.state.state);
    meta.rev = row.rev; meta.dirty = false; meta.last = Date.now(); saveMeta();
  }
  function done() { meta.last = Date.now(); saveMeta(); retryN = 0; retried401 = false; setStatus(meta.dirty ? 'pending' : 'ok'); return null; }

  function insertRow(tk) {
    var seq = meta.seq, body = { user_id: session.user.id, state: envelope(clone(cfg.getState())), device: device() };
    return req('POST', TABLE, { token: tk, body: body, prefer: 'return=representation' }).then(function (r) {
      if (r.status === 409) { again = true; return null; }
      if (!r.ok) throw httpErr(r);
      meta.rev = r.json[0].rev; if (meta.seq === seq) meta.dirty = false; saveMeta();
      return done();
    });
  }
  function patchRow(tk) {
    var seq = meta.seq, body = { state: envelope(clone(cfg.getState())), device: device() };
    var path = TABLE + '?user_id=eq.' + encodeURIComponent(session.user.id) + '&rev=eq.' + meta.rev;
    return req('PATCH', path, { token: tk, body: body, prefer: 'return=representation' }).then(function (r) {
      if (!r.ok) throw httpErr(r);
      if (!r.json || !r.json.length) { again = true; return null; } // revisão mudou no meio do caminho: reavalia
      meta.rev = r.json[0].rev; if (meta.seq === seq) meta.dirty = false; saveMeta();
      if (meta.dirty) again = true;
      return done();
    });
  }

  function httpErr(r) {
    var e = new Error('http ' + r.status); e.status = r.status; e.body = r.json; return e;
  }
  function failText(e) {
    var code = e.body && (e.body.code || '');
    if (e.status === 404 || code === 'PGRST205' || code === '42P01') return 'A tabela da nuvem ainda não existe. Rode o arquivo supabase/controle-cestas.sql no Supabase.';
    if (e.status === 403 || code === '42501') return 'O banco recusou o acesso. Confira o SQL de segurança (supabase/controle-cestas.sql).';
    if (e.status === 413 || code === '23514') return 'Os dados passaram do limite de tamanho aceito pela nuvem.';
    return 'A nuvem respondeu com erro (' + (e.status || '?') + '). Os dados continuam salvos neste aparelho.';
  }

  function handleErr(e) {
    if (e.expired) { setStatus('expired', 'Sua sessão expirou. Entre de novo para continuar sincronizando.'); return; }
    if (e.network || e.name === 'AbortError') { return scheduleRetry(online() ? 'Sem resposta da nuvem. Tentando de novo em instantes.' : ''); }
    if (e.status === 401 && !retried401 && session) { retried401 = true; session.expires_at = 0; again = true; return; }
    if (e.format) { setStatus('error', 'Os dados da nuvem estão em um formato que este app não reconhece. Nada foi sobrescrito.'); return; }
    if (e.status >= 500 || e.server) { return scheduleRetry('A nuvem está instável. Tentando de novo em instantes.'); }
    setStatus('error', failText(e));
  }

  function scheduleRetry(msg) {
    if (!online()) { setStatus('offline'); return; }
    setStatus('error', msg);
    var s = BACKOFF[Math.min(retryN, BACKOFF.length - 1)]; retryN++;
    clearTimeout(timer); timer = setTimeout(sync, s * 1000);
  }

  /* ---------- API pública ---------- */
  function sync() {
    if (!session || !cfg) return Promise.resolve();
    if (running) { again = true; return running; }
    if (!online()) { setStatus('offline'); return Promise.resolve(); }
    if (st.code === 'conflict') return Promise.resolve();
    clearTimeout(timer); lastTry = Date.now();
    setStatus('syncing');
    var p = run().catch(handleErr).then(function () {
      running = null;
      if (again && st.code !== 'conflict' && st.code !== 'expired') { again = false; return sync(); }
      again = false;
    });
    running = p; return p;
  }

  function changed() {
    meta.dirty = true; meta.seq = (meta.seq || 0) + 1; saveMeta();
    if (!session) return;
    if (st.code === 'conflict' || st.code === 'expired') return;
    setStatus(online() ? 'pending' : 'offline');
    clearTimeout(timer); timer = setTimeout(sync, 1500);
  }

  function resolve(choice) {
    if (!conflictRow) return Promise.resolve();
    var row = conflictRow; conflictRow = null;
    if (choice === 'cloud') {
      lsSet(K_BKP, { when: new Date().toISOString(), from: 'este aparelho', data: envelope(clone(cfg.getState())) });
      applyRemote(row); setStatus('ok'); return Promise.resolve();
    }
    lsSet(K_BKP, { when: new Date().toISOString(), from: 'nuvem', data: row.state });
    meta.rev = row.rev; meta.dirty = true; meta.seq++; saveMeta();
    setStatus('pending'); return sync();
  }

  function init(c) {
    cfg = c;
    session = lsGet(K_AUTH);
    meta = lsGet(K_META);
    if (!meta || typeof meta !== 'object') { meta = { rev: 0, dirty: !!c.hadSavedData, seq: 0, last: null, userId: session && session.user ? session.user.id : null }; saveMeta(); }
    if (session) {
      setStatus(online() ? (meta.dirty ? 'pending' : 'ok') : 'offline');
      if (online()) setTimeout(sync, 200);
    } else setStatus('off');

    // os gatilhos ficam ativos mesmo antes do login, para valerem assim que a pessoa entrar
    root.addEventListener('online', function () { retryN = 0; sync(); });
    root.addEventListener('offline', function () { if (session) setStatus('offline'); });
    root.document.addEventListener('visibilitychange', function () {
      if (root.document.visibilityState === 'visible' && session && Date.now() - lastTry > 15000) sync();
    });
    setInterval(function () {
      if (session && root.document.visibilityState === 'visible' && Date.now() - lastTry > 55000) sync();
    }, 60000);
  }

  root.Sync = {
    init: init, login: login, signup: signup, logout: logout, changed: changed, syncNow: function () { retryN = 0; return sync(); }, resolve: resolve,
    status: function () {
      return {
        code: st.code, msg: st.msg, email: session && session.user ? session.user.email : '', signedIn: !!session,
        last: meta ? meta.last : null, dirty: !!(meta && meta.dirty),
        conflict: st.code === 'conflict' && conflictRow ? {
          cloud: summary(conflictRow.state, conflictRow.updated_at),
          local: summary(envelope(cfg.getState()), null)
        } : null
      };
    }
  };
})(window);
