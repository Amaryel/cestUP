/* FeiraUP - interface */
(function () {
  'use strict';
  var E = window.Engine;
  var KEY = 'controle-cestas:v1';
  var S = null;
  var ui = { dashP: loadPeriodSafe(), place: null, quote: null, tab: 'painel', sale: null, purch: null, cust: null, sup: null, prod: null, adj: null, planT: null, msg: {}, exportText: '' };
  var saveTimer = null, hadSaved = false;
  function loadPeriodSafe() { try { var v = localStorage.getItem('controle-cestas:dashp'); return ['mes', 'mes_ant', '3m', 'tudo'].indexOf(v) >= 0 ? v : 'mes'; } catch (e) { return 'mes'; } }

  /* ---------- util ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function fin(n) { return String(E.r3(n)).replace('.', ','); }
  function plural(n, a, b) { return n === 1 ? a : b; }
  function prod(id) { return E.byId(S.products, id); }
  function custName(id) { var c = E.byId(S.customers, id); return c ? c.name : 'Cliente removido'; }
  function supName(id) { var s = E.byId(S.suppliers, id); return s ? s.name : ''; }
  function badge(cls, text) { return '<span class="badge ' + cls + '">' + esc(text) + '</span>'; }
  function covBadge(cov) {
    var st = E.statusOf(cov, S.settings);
    return st === 'urgent' ? badge('bad', 'Abaixo do mínimo') : st === 'near' ? badge('warn', 'Perto do mínimo') : badge('ok', 'Acima do mínimo');
  }
  function toast(t) {
    var el = $('#toast'); el.textContent = t; el.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }
  function copyText(text) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta); toast(ok ? 'Copiado!' : 'Não foi possível copiar.');
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { toast('Copiado!'); }, fallback);
    else fallback();
  }
  function setMsg(key, type, text) { ui.msg[key] = text ? { type: type, text: text } : null; }
  function msgHTML(key) {
    var m = ui.msg[key]; if (!m) return '';
    var lines = Array.isArray(m.text) ? m.text : [m.text];
    return '<div class="msg ' + m.type + '" role="alert">' + lines.map(esc).join('<br>') + '</div>';
  }

  /* ---------- persistência ---------- */
  /* primeira abertura (sem dados salvos): começa vazio; os dados vêm da nuvem ou de Cadastros → Backup */
  function firstRunState() { return E.newState(); }
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { setTimeout(function () { warnSave('O navegador bloqueou o armazenamento local. Seus dados não serão salvos.'); }, 0); }
    if (!raw) return firstRunState();
    hadSaved = true;
    try { return E.migrate(JSON.parse(raw)); }
    catch (e) {
      try { localStorage.setItem(KEY + ':backup', raw); } catch (e2) { /* ignore */ }
      setTimeout(function () { warnSave('Os dados salvos estavam ilegíveis. Uma cópia foi guardada e o app começou vazio.'); }, 0);
      return E.newState();
    }
  }
  function warnSave(t) { var el = $('#saveWarn'); el.textContent = t || ''; el.classList.toggle('show', !!t); }
  function writeNow() {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, state: S })); warnSave(''); }
    catch (e) { warnSave('Não foi possível salvar agora. Exporte os dados em Cadastros para não perder nada.'); }
  }
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(writeNow, 350); if (window.Sync) window.Sync.changed(); }
  function flush() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; writeNow(); } }
  function commit() { save(); render(); }

  /* ---------- sincronização (interface) ---------- */
  var SYNC_LABEL = { off: 'Entrar', ok: 'Sincronizado', pending: 'Pendente', offline: 'Sem internet', syncing: 'Sincronizando', conflict: 'Conflito', error: 'Falha na nuvem', expired: 'Entrar de novo' };
  function ago(ms) {
    if (!ms) return 'ainda não sincronizou';
    var m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return 'agora há pouco';
    if (m < 60) return 'há ' + m + ' min';
    var h = Math.round(m / 60); if (h < 24) return 'há ' + h + ' h';
    return 'em ' + new Date(ms).toLocaleDateString('pt-BR');
  }
  function chipHTML() {
    var s = window.Sync.status();
    return '<span class="dot ' + s.code + '" aria-hidden="true"></span><span>' + SYNC_LABEL[s.code] + '</span>';
  }
  function sumHTML(t, x) {
    return '<div class="item"><b>' + t + '</b><small>' + x.sales + ' ' + plural(x.sales, 'venda', 'vendas') + ' · ' + x.purchases + ' ' + plural(x.purchases, 'compra', 'compras') + ' · ' + x.customers + ' ' + plural(x.customers, 'cliente', 'clientes') +
      (x.updated ? '<br>Alterado em ' + new Date(x.updated).toLocaleString('pt-BR') : '') + '</small></div>';
  }
  function syncInnerHTML() {
    var s = window.Sync.status(), h = '<h2>Conta e nuvem</h2>';
    if (!s.signedIn) {
      return h + '<p class="muted">Você está usando só os dados deste aparelho. Entre para guardá-los na nuvem e usar em mais de um aparelho.</p>' +
        '<div class="actions"><button class="btn" data-act="leave-guest">Entrar na conta</button></div>';
    }
    h += '<div class="syncline"><span class="chip static ' + s.code + '">' + chipHTML() + '</span><small>' + esc(s.email) + '</small></div>';
    var note = s.msg;
    if (!note) {
      if (s.code === 'offline') note = 'Sem internet. ' + (s.dirty ? 'As alterações estão salvas aqui e serão enviadas quando a conexão voltar.' : 'Você pode continuar usando o app normalmente.');
      else if (s.code === 'pending') note = 'Há alterações para enviar. O envio é automático.';
      else if (s.code === 'ok') note = 'Tudo enviado (' + ago(s.last) + ').';
      else if (s.code === 'syncing') note = 'Enviando e conferindo com a nuvem…';
    }
    if (note) h += '<p class="sub" style="margin-top:8px">' + esc(note) + '</p>';
    if (s.conflict) {
      h += '<div class="list">' + sumHTML('Neste aparelho', s.conflict.local) + sumHTML('Na nuvem', s.conflict.cloud) + '</div>' +
        '<div class="actions"><button class="btn" data-act="sync-cloud">Usar a versão da nuvem</button><button class="btn ghost" data-act="sync-local">Manter a deste aparelho</button></div>' +
        '<p class="sub" style="margin-top:8px"><small>A versão que não for escolhida fica guardada como cópia neste aparelho.</small></p>';
    } else {
      h += '<div class="actions"><button class="btn small" data-act="sync-now"' + (s.code === 'syncing' ? ' disabled' : '') + '>Sincronizar agora</button><button class="btn small ghost" data-act="sync-logout">Sair da conta</button></div>';
    }
    return h;
  }
  function refreshSyncUI() {
    renderGate();
    var chip = $('#syncChip'); if (chip) { var cs = window.Sync.status(); chip.className = 'chip ' + cs.code; chip.innerHTML = chipHTML(); chip.setAttribute('aria-label', 'Nuvem: ' + SYNC_LABEL[cs.code]); }
    var card = $('#syncCard');
    if (card && !card.contains(document.activeElement && document.activeElement.tagName === 'INPUT' ? document.activeElement : null)) card.innerHTML = syncInnerHTML();
  }
  /* cópia de segurança: antes de a nuvem substituir os dados deste aparelho, guarda o que havia aqui */
  var PREV_KEY = KEY + ':prev';
  function savePrev(reason) { try { localStorage.setItem(PREV_KEY, JSON.stringify({ when: new Date().toISOString(), reason: reason, state: S })); } catch (e) { /* ignore */ } }
  function loadPrev() { try { var r = localStorage.getItem(PREV_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function applyRemote(remoteState) {
    savePrev('antes de a nuvem atualizar este aparelho');
    S = E.migrate({ v: 1, state: remoteState });
    ui.sale = ui.purch = ui.cust = ui.sup = ui.prod = ui.adj = null;
    writeNow(); render(); toast('Dados atualizados pela nuvem.');
  }

  /* ---------- tela de entrada ---------- */
  var gateSig = null;
  function renderGate() {
    var s = window.Sync.status(), locked = !s.signedIn && !ui.guest;
    document.body.classList.toggle('locked', locked);
    var g = $('#gate'); if (!g) return;
    g.hidden = !locked;
    var m = ui.msg.login, mode = ui.gateMode || 'login', offline = navigator.onLine === false;
    var sig = locked + '|' + mode + '|' + s.msg + '|' + (m && m.type + m.text) + '|' + offline;
    if (!locked || sig === gateSig) return;
    gateSig = sig;
    var note = m ? m : (s.code === 'expired' && s.msg ? { type: 'bad', text: s.msg } : null);
    var signup = mode === 'signup';
    g.innerHTML = '<div class="gate-card">' +
      '<img src="icons/favicon.svg" alt="" width="72" height="72">' +
      '<h1>FeiraUP</h1><p class="muted">Estoque, compras, vendas e parcelas.</p>' +
      '<div class="seg" role="tablist"><button type="button" role="tab" aria-selected="' + !signup + '" data-act="gate-mode" data-mode="login">Entrar</button>' +
      '<button type="button" role="tab" aria-selected="' + signup + '" data-act="gate-mode" data-mode="signup">Criar conta</button></div>' +
      (note ? '<div class="msg ' + note.type + '" role="alert">' + esc(note.text) + '</div>' : '') +
      '<form id="' + (signup ? 'signupForm' : 'loginForm') + '" novalidate>' +
      '<div class="field"><label for="g-mail">E-mail</label><input id="g-mail" name="email" type="email" autocomplete="username" inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false" value="' + esc(savedEmail()) + '"></div>' +
      '<div class="field"><label for="g-pass">Senha' + (signup ? ' (mínimo 8 caracteres)' : '') + '</label><div class="passwrap"><input id="g-pass" name="password" type="password" autocomplete="' + (signup ? 'new-password' : 'current-password') + '"><button type="button" class="link-btn" data-act="toggle-pass" aria-pressed="false">Mostrar</button></div></div>' +
      (signup ? '<div class="field"><label for="g-pass2">Repita a senha</label><input id="g-pass2" name="password2" type="password" autocomplete="new-password"></div>' : '') +
      '<button class="btn wide" type="submit">' + (signup ? 'Criar conta' : 'Entrar') + '</button>' +
      (signup ? '' : '<p class="sub" style="margin-top:10px"><small>Você continua conectado neste aparelho até tocar em Sair. Para não digitar a senha de novo, aceite quando o navegador oferecer salvar.</small></p>') + '</form>' +
      (offline ? '<p class="sub" style="margin-top:14px"><small>Sem internet e sem login neste aparelho?</small></p><button class="btn small ghost wide" type="button" data-act="guest">Abrir só com os dados deste aparelho</button>' : '') +
      '</div>';
  }

  /* ---------- navegação ---------- */
  var TABS = [
    ['painel', 'Painel', '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>'],
    ['vendas', 'Vendas', '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>'],
    ['clientes', 'Clientes', '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'],
    ['compras', 'Compras', '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>'],
    ['contas', 'Contas', '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>'],
    ['cotar', 'Cotação', '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.3"/>'],
    ['estoque', 'Estoque', '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>'],
    ['cadastros', 'Cadastros', '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>'],,
    ['config', 'Configurações', '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'],
    ['mais', 'Mais', '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>']
  ];
  var NAV_KEY = 'controle-cestas:nav', THEME_KEY = 'controle-cestas:theme';
  var NAV_GROUPS = [['Visão geral', ['painel']], ['Comercial', ['vendas', 'clientes']], ['Suprimentos', ['compras', 'estoque', 'cotar']], ['Financeiro', ['contas']], ['Cadastros', ['cadastros']], ['Sistema', ['config']]];
  var BOTTOM_ORDER = ['painel', 'vendas', 'clientes', 'compras', 'contas', 'cotar', 'estoque', 'mais'];
  var NAV_SUBS = {
    vendas: [['nova', 'Nova venda'], ['feitas', 'Vendas feitas']],
    compras: [['merc', 'Mercadoria'], ['desp', 'Despesa']],
    contas: [['caixa', 'Caixa'], ['pagar', 'A pagar'], ['desp', 'Despesas'], ['plano', 'Plano']],
    estoque: [['pos', 'Posição'], ['repor', 'Reposição'], ['ajuste', 'Ajustes']],
    cadastros: [['cli', 'Clientes'], ['prod', 'Produtos'], ['forn', 'Fornecedores']],
    config: [['empresa', 'Dados da empresa'], ['padroes', 'Padrões do negócio'], ['aparencia', 'Aparência'], ['conta', 'Conta e nuvem'], ['dados', 'Dados e backup'], ['sobre', 'Sobre']]
  };
  var MODULE_GROUP = {}; NAV_GROUPS.forEach(function (g) { g[1].forEach(function (k) { MODULE_GROUP[k] = g[0]; }); });
  function navMode() { try { return localStorage.getItem(NAV_KEY) === 'side' ? 'side' : 'bottom'; } catch (e) { return 'bottom'; } }
  function applyNav() { document.body.dataset.nav = navMode(); closeMenu(); }
  function allMenuHTML() {
    var byKey = {}; TABS.forEach(function (t) { byKey[t[0]] = t; });
    var h = '<div class="am-head"><b>Menu</b><button type="button" class="am-x" data-act="menu-close" aria-label="Fechar menu">×</button></div>';
    NAV_GROUPS.forEach(function (g) {
      h += '<div class="nav-group">' + g[0] + '</div>';
      g[1].forEach(function (k) {
        var t = byKey[k], on = ui.tab === k;
        h += '<button type="button" class="am-mod" data-act="go" data-tab="' + k + '"' + (on ? ' aria-current="page"' : '') + '><svg viewBox="0 0 24 24" aria-hidden="true">' + t[2] + '</svg><span>' + t[1] + '</span></button>';
        if (NAV_SUBS[k]) {
          h += '<div class="am-subs">' + NAV_SUBS[k].map(function (x) {
            return '<button type="button" data-act="go" data-tab="' + k + '" data-sub="' + x[0] + '"' + (on && subCurrent(k) === x[0] ? ' aria-current="true"' : '') + '>' + x[1] + '</button>';
          }).join('') + '</div>';
        }
      });
    });
    return h;
  }
  function renderAllMenu() {
    var el = $('#allMenu');
    if (!el) { el = document.createElement('aside'); el.id = 'allMenu'; el.setAttribute('aria-label', 'Todos os módulos'); document.body.appendChild(el); }
    el.innerHTML = allMenuHTML();
  }
  function closeMenu() { document.body.classList.remove('menu-open'); var mb = $('#menuBtn'); if (mb) mb.setAttribute('aria-expanded', 'false'); }
  function toggleMenu() { if (navMode() === 'bottom') renderAllMenu(); var o = document.body.classList.toggle('menu-open'); var mb = $('#menuBtn'); if (mb) mb.setAttribute('aria-expanded', String(o)); }
  function subCurrent(tab) { return tab === 'vendas' ? (ui.vview || 'nova') : tab === 'compras' ? (ui.pk || 'merc') : tab === 'contas' ? (ui.cview || 'caixa') : tab === 'estoque' ? evCurrent() : tab === 'cadastros' ? (ui.cadv || 'cli') : tab === 'config' ? (ui.cfgv || 'empresa') : ''; }
  /* histórico de navegação: botão "Voltar" e gesto/botão voltar do aparelho */
  var navStack = [];
  function navSnap() { return { tab: ui.tab, vview: ui.vview, pk: ui.pk, cview: ui.cview, ev: ui.ev, cadv: ui.cadv, cfgv: ui.cfgv, custOpen: ui.custOpen, saleOpen: ui.saleOpen }; }
  function navSame(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function navPush(snap) {
    navStack.push(snap); if (navStack.length > 40) navStack.shift();
    try { history.pushState({ fup: navStack.length }, ''); } catch (e) { /* ignore */ }
  }
  function navBack() {
    if (!navStack.length) return;
    try { history.back(); } catch (e) { navRestore(); }
  }
  function navRestore() {
    var s = navStack.pop(); if (!s) return;
    Object.keys(s).forEach(function (k) { ui[k] = s[k]; });
    ui.saleEdit = null; ui.dateEdit = null; ui.prodQ = '';
    closeMenu(); render(); window.scrollTo(0, 0);
  }
  var navBefore = null;
  document.addEventListener('click', function (e) { navBefore = e.target.closest && e.target.closest('[data-act]') ? navSnap() : null; }, true);
  window.addEventListener('popstate', navRestore);

  function go(tab, sub) {
    if (tab !== ui.tab) { ui.prodQ = ''; ui.dateEdit = null; ui.custOpen = null; ui.saleOpen = null; ui.saleEdit = null; }
    else if (!sub) { ui.custOpen = null; ui.saleOpen = null; ui.dateEdit = null; ui.saleEdit = null; }
    if (sub && tab === 'vendas') { ui.saleOpen = null; ui.saleEdit = null; }
    if (sub) { if (tab === 'vendas') ui.vview = sub; else if (tab === 'compras') ui.pk = sub; else if (tab === 'contas') ui.cview = sub; else if (tab === 'estoque') ui.ev = sub; else if (tab === 'cadastros') ui.cadv = sub; else if (tab === 'config') ui.cfgv = sub; }
    ui.tab = tab; closeMenu(); render(); window.scrollTo(0, 0);
  }
  function navHTML() {
    var a = E.alerts(S, E.derive(S)), ps = E.payablesSummary(S, E.today());
    var badge = { clientes: a.late ? a.late.count : 0, contas: ps.lateCount, estoque: a.urgent ? '!' : 0 };
    var byKey = {}; TABS.forEach(function (t) { byKey[t[0]] = t; });
    var h = '', moreOn = ui.tab === 'mais' || ui.tab === 'cadastros' || ui.tab === 'config';
    NAV_GROUPS.forEach(function (g) {
      h += '<div class="nav-group">' + g[0] + '</div>';
      g[1].forEach(function (k) {
        var t = byKey[k], on = ui.tab === k, b = badge[k];
        h += '<button type="button" class="so" style="--bo:' + (BOTTOM_ORDER.indexOf(k) < 0 ? 9 : BOTTOM_ORDER.indexOf(k)) + '" data-act="go" data-tab="' + k + '"' + (on ? ' aria-current="page"' : '') + '><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true">' + t[2] + '</svg>' + (b ? '<i class="nb">' + b + '</i>' : '') + '</span><span class="lb">' + t[1] + '</span></button>';
        if (on && NAV_SUBS[k]) {
          h += '<div class="subnav">' + NAV_SUBS[k].map(function (x) {
            return '<button type="button" data-act="go" data-tab="' + k + '" data-sub="' + x[0] + '"' + (subCurrent(k) === x[0] ? ' aria-current="true"' : '') + '>' + x[1] + '</button>';
          }).join('') + '</div>';
        }
      });
    });
    var mt = byKey.mais;
    h += '<button type="button" class="bo" style="--bo:7" data-act="go" data-tab="mais"' + (moreOn ? ' aria-current="page"' : '') + '><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true">' + mt[2] + '</svg></span><span class="lb">' + mt[1] + '</span></button>';
    return h;
  }
  function crumbHTML() {
    var t = ui.tab, label = {}; TABS.forEach(function (x) { label[x[0]] = x[1]; });
    var back = navStack.length ? '<button type="button" class="crumb-back" data-act="back" aria-label="Voltar à tela anterior">‹ Voltar</button>' : '';
    if (t === 'mais') return back + '<span>Mais</span>';
    var parts = [MODULE_GROUP[t] || '', label[t]];
    if (NAV_SUBS[t]) { var sc = subCurrent(t); NAV_SUBS[t].forEach(function (x) { if (x[0] === sc) parts.push(x[1]); }); }
    return back + parts.filter(function (p, i) { return p && parts.indexOf(p) === i; }).map(function (p, i, a) { return i === a.length - 1 ? '<b>' + esc(p) + '</b>' : '<span>' + esc(p) + '</span>'; }).join('<i aria-hidden="true">›</i>');
  }
  function maisHTML() {
    function row(tab, sub, title, desc) {
      return '<button type="button" class="hubrow" data-act="go" data-tab="' + tab + '"' + (sub ? ' data-sub="' + sub + '"' : '') + '><span><b>' + title + '</b><small>' + desc + '</small></span><i aria-hidden="true">›</i></button>';
    }
    var sy = S.settings;
    return '<section class="card"><h2>Cadastros</h2><div class="hub">' +
      row('cadastros', 'prod', 'Produtos', S.products.length + ' ' + plural(S.products.length, 'item', 'itens') + ' · composição da cesta') +
      row('cadastros', 'forn', 'Fornecedores', S.suppliers.length + ' ' + plural(S.suppliers.length, 'cadastrado', 'cadastrados')) + '</div></section>' +
      '<section class="card"><h2>Sistema</h2><div class="hub">' +
      row('config', 'empresa', 'Dados da empresa', 'Nome, CPF/CNPJ e contato nos comprovantes') +
      row('config', 'padroes', 'Padrões do negócio', 'Preço da cesta, prazo, meta e mínimo de estoque') +
      row('config', 'aparencia', 'Aparência', 'Tema e posição do menu') +
      row('config', 'conta', 'Conta e nuvem', 'Entrar, sincronizar e ver o status') +
      row('config', 'dados', 'Dados e backup', 'Exportar e restaurar seus dados') +
      row('config', 'sobre', 'Sobre o FeiraUP', 'Versão e recarregar o app') + '</div></section>';
  }

  /* ---------- alertas ---------- */
  function alertsHTML(d) {
    var a = E.alerts(S, d), h = '';
    function ban(cls, html, label, tab, sub) {
      return '<div class="banner ' + cls + '" role="status"><div>' + html + '</div><button class="btn small ' + (cls === 'bad' ? 'danger' : 'ghost') + '" data-act="go" data-tab="' + tab + '"' + (sub ? ' data-sub="' + sub + '"' : '') + '>' + label + '</button></div>';
    }
    if (a.urgent) {
      var its = a.urgent.items, names = its.slice(0, 4).map(function (i) { return esc(i.name) + ' (' + i.cov + ')'; }).join(', ') + (its.length > 4 ? ' e mais ' + (its.length - 4) : '');
      h += ban('bad', '<b>Reposição urgente.</b> O estoque cobre ' + a.urgent.total + ' ' + plural(a.urgent.total, 'cesta', 'cestas') + '; o mínimo é ' + fin(a.urgent.min) + '. Abaixo do mínimo: ' + names, 'Ver estoque', 'estoque', 'repor');
    } else if (a.near) {
      h += ban('warn', '<b>Perto do mínimo.</b> O estoque cobre ' + a.near.total + ' ' + plural(a.near.total, 'cesta', 'cestas') + '; o mínimo é ' + fin(a.near.min) + '.', 'Ver estoque', 'estoque', 'repor');
    }
    var psum = E.payablesSummary(S, E.today());
    if (psum.lateCount) h += ban('bad', '<b>' + psum.lateCount + ' ' + plural(psum.lateCount, 'conta vencida', 'contas vencidas') + ' a pagar</b> somando ' + E.money(psum.late) + '.', 'Ver contas', 'contas');
    if (a.late) h += ban('warn', '<b>' + a.late.count + ' ' + plural(a.late.count, 'parcela atrasada', 'parcelas atrasadas') + '</b> somando ' + E.money(a.late.sum) + '.', 'Ver clientes', 'clientes');
    return h;
  }

  /* ---------- PAINEL: blocos de indicadores ---------- */
  var PERIODS = [['mes', 'Este mês'], ['mes_ant', 'Mês passado'], ['3m', '3 meses'], ['tudo', 'Tudo']];
  var PERIOD_KEY = 'controle-cestas:dashp';
  function kfmt(n) { n = Math.round(n); return n >= 1000 ? fin(Math.round(n / 100) / 10) + 'k' : String(n); }
  function deltaHTML(v) {
    if (v.dir === 'none') return '';
    if (v.dir === 'flat') return '<span class="delta flat">= igual</span>';
    if (v.dir === 'new') return '<span class="delta up">▲ novo</span>';
    return '<span class="delta ' + v.dir + '">' + (v.dir === 'up' ? '▲ ' : '▼ ') + fin(Math.abs(v.pct)) + '%</span>';
  }
  function deltaInvHTML(v) {
    if (v.dir === 'up' || v.dir === 'new') return '<span class="delta down">▲ ' + (v.dir === 'new' ? 'novo' : fin(Math.abs(v.pct)) + '%') + '</span>';
    if (v.dir === 'down') return '<span class="delta up">▼ ' + fin(Math.abs(v.pct)) + '%</span>';
    return deltaHTML(v);
  }
  function ppHTML(cur, prev) {
    if (prev == null) return '';
    var d = Math.round((cur - prev) * 1000) / 10;
    if (Math.abs(d) < 0.05) return '<span class="delta flat">= igual</span>';
    return '<span class="delta ' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '▲ ' : '▼ ') + fin(Math.abs(d)) + ' p.p.</span>';
  }
  /* lançamentos por trás do número tocado no Resultado do período */
  function dashDetailHTML(db) {
    var k = ui.dashDet; if (!k) return '';
    var rg = db.range, inR = function (d) { return d >= rg.from && d <= rg.to; };
    var sales = S.sales.filter(function (x) { return inR(x.date); }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    var exps = S.expenses.filter(function (x) { return inR(x.date); }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    var title = { vendas: 'Vendas do período', lucro: 'Lucro de cada venda', clientes: 'Clientes atendidos', desp: 'Despesas do período', liquido: 'Do lucro bruto ao líquido' }[k];
    var h = '<div class="dd" id="dashDetail"><div class="head"><b>' + title + '</b><button type="button" class="btn small ghost" data-act="dash-detail" data-k="' + k + '">Fechar</button></div>';
    var salesBtn = '<div class="actions"><button type="button" class="btn small" data-act="dash-open" data-to="vendas">Abrir em Vendas feitas</button></div>';
    var expRows = function () {
      return exps.length ? exps.map(function (x) {
        return '<div class="line"><span>' + esc(x.cat) + (x.desc ? ' · ' + esc(x.desc) : '') + '<br><small>' + E.fdate(x.date) + (x.method ? ' · ' + esc(E.methodName(x.method)) : '') + (x.from === 'pessoal' ? ' · do meu bolso' : ' · do caixa') + '</small></span><span>' + E.money(x.amount) + '</span></div>';
      }).join('') : '<div class="empty">Nenhuma despesa neste período.</div>';
    };
    if (k === 'vendas' || k === 'lucro') {
      h += sales.length ? sales.map(function (x) {
        var tot = E.saleTotal(x), pr = E.saleProfit(x);
        return '<div class="line"><span><b>' + esc(custName(x.customerId)) + '</b><br><small>' + E.fdate(x.date) + ' · ' + fin(x.qty) + ' ' + plural(x.qty, 'cesta', 'cestas') + (x.mods && x.mods.length ? ' · personalizada' : '') + '</small></span>' +
          (k === 'vendas' ? '<span>' + E.money(tot) + '</span>' : '<span style="text-align:right"><b style="color:' + (pr < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + E.money(pr) + '</b><br><small>' + (tot > 0 ? fin(Math.round(pr / tot * 1000) / 10) : '0') + '% de margem</small></span>') + '</div>';
      }).join('') + salesBtn : '<div class="empty">Nenhuma venda neste período.</div>';
    } else if (k === 'clientes') {
      var by = {}; sales.forEach(function (x) { var o = by[x.customerId || ''] || (by[x.customerId || ''] = { id: x.customerId, n: 0, tot: 0 }); o.n++; o.tot += E.saleTotal(x); });
      var arr = Object.keys(by).map(function (i) { return by[i]; }).sort(function (a, b) { return b.tot - a.tot; });
      h += arr.length ? arr.map(function (o) { return '<div class="line"><span><b>' + esc(custName(o.id)) + '</b><br><small>' + o.n + ' ' + plural(o.n, 'venda', 'vendas') + '</small></span><span>' + E.money(o.tot) + '</span></div>'; }).join('') + salesBtn : '<div class="empty">Nenhum cliente neste período.</div>';
    } else if (k === 'desp') {
      h += expRows() + (exps.length ? '<div class="line"><span><b>Total</b></span><span><b>' + E.money(db.cur.expenses.total) + '</b></span></div>' : '') +
        '<div class="actions"><button type="button" class="btn small" data-act="dash-open" data-to="desp">Abrir despesas</button></div>';
    } else if (k === 'liquido') {
      h += '<div class="line"><span>Lucro bruto das vendas</span><span>' + E.money(db.cur.profit) + '</span></div><div class="line"><span>Menos despesas</span><span>− ' + E.money(db.cur.expenses.total) + '</span></div><div class="line"><span><b>Lucro líquido</b></span><span><b>' + E.money(db.cur.net) + '</b></span></div>' +
        '<small style="display:block;margin:10px 0 4px">Despesas que entraram na conta:</small>' + expRows() +
        '<div class="actions"><button type="button" class="btn small ghost" data-act="dash-open" data-to="vendas">Ver vendas</button><button type="button" class="btn small ghost" data-act="dash-open" data-to="desp">Abrir despesas</button></div>';
    }
    return h + '</div>';
  }
  function dashKpisHTML(db) {
    var c = db.cur, pv = db.prev, cmp = db.cmp;
    function kpi(label, value, delta, prevTxt, cls, det) {
      return '<button type="button" class="kpi dk tap ' + (cls || '') + '" data-act="dash-detail" data-k="' + det + '" aria-pressed="' + (ui.dashDet === det) + '"><span>' + label + '</span><b>' + value + '</b><div class="dk-foot">' + delta + (prevTxt ? '<small>' + prevTxt + '</small>' : '') + '</div></button>';
    }
    var pl = db.range.plabel ? 'antes: ' : '';
    var h = '<section class="card span2"><h2>Resultado do período</h2><div class="seg four" role="tablist" aria-label="Período">' +
      PERIODS.map(function (x) { return '<button type="button" role="tab" aria-selected="' + (ui.dashP === x[0]) + '" data-act="dash-period" data-p="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      (db.prev ? '<p class="sub"><small>Comparando ' + esc(db.range.label) + ' com ' + esc(db.range.plabel) + '.</small></p>' : '<p class="sub"><small>Todas as vendas registradas.</small></p>') +
      '<div class="kpis dks">' +
      kpi('Faturamento', E.money(c.revenue), deltaHTML(cmp.revenue), pv ? pl + E.money(pv.revenue) : '', '', 'vendas') +
      kpi('Lucro bruto', E.money(c.profit), deltaHTML(cmp.profit), pv ? pl + E.money(pv.profit) : '', c.profit < 0 ? 'bad' : 'ok', 'lucro') +
      kpi('Despesas', E.money(c.expenses.total), c.expenses.total > 0 || (pv && pv.expenses.total > 0) ? deltaInvHTML(cmp.expenses) : '', pv ? pl + E.money(pv.expenses.total) : c.expenses.count + ' ' + plural(c.expenses.count, 'lançamento', 'lançamentos'), '', 'desp') +
      kpi('Lucro líquido', E.money(c.net), deltaHTML(cmp.net), pv ? pl + E.money(pv.net) : '', c.net < 0 ? 'bad' : 'ok', 'liquido') +
      kpi('Margem', fin(Math.round(c.margin * 1000) / 10) + '%', ppHTML(c.margin, pv ? pv.margin : null), pv ? pl + fin(Math.round(pv.margin * 1000) / 10) + '%' : '', '', 'lucro') +
      kpi('Cestas vendidas', fin(c.qty), deltaHTML(cmp.qty), pv ? pl + fin(pv.qty) : '', '', 'vendas') +
      kpi('Ticket médio', E.money(c.ticket), deltaHTML(cmp.ticket), pv ? pl + E.money(pv.ticket) : '', '', 'vendas') +
      kpi('Clientes atendidos', String(c.customers), '', c.sales + ' ' + plural(c.sales, 'venda', 'vendas'), '', 'clientes') +
      '</div>' + dashDetailHTML(db) +
      (c.sales === 0 ? '<div class="msg info">Nenhuma venda neste período.</div>' : '') +
      (c.partialCost && c.sales ? '<div class="msg warn">Lucro estimado: falta registrar a compra de alguns itens da cesta, então o custo está incompleto.</div>' : '') +
      '<p class="sub"><small>Lucro bruto = vendas menos o custo dos itens da cesta (pelo último preço de compra, sacolas incluídas). Lucro líquido = lucro bruto menos as despesas lançadas no período. Não considera inadimplência.</small></p></section>';
    return h;
  }
  function dashRecebimentosHTML(db) {
    var c = db.cur.rcv, pv = db.prev ? db.prev.rcv : null, cmp = db.cmp.received;
    function kpi(label, value, delta, foot, cls) {
      return '<div class="kpi dk ' + (cls || '') + '"><span>' + label + '</span><b>' + value + '</b><div class="dk-foot">' + delta + (foot ? '<small>' + foot + '</small>' : '') + '</div></div>';
    }
    var pct = c.due > 0 ? Math.round((c.due - c.dueOpen) / c.due * 100) : 0;
    var h = '<section class="card span2"><h2>Recebimentos do período</h2><p class="sub"><small>' + (db.prev ? 'Mesmo período escolhido acima: ' + esc(db.range.label) + '.' : 'Todo o histórico.') + '</small></p><div class="kpis dks">' +
      kpi('Recebido', E.money(c.received), deltaHTML(cmp), pv ? 'antes: ' + E.money(pv.received) : c.count + ' ' + plural(c.count, 'recebimento', 'recebimentos'), c.received > 0 ? 'ok' : '') +
      kpi('A receber no período', E.money(c.due), '', c.dueCount + ' ' + plural(c.dueCount, 'parcela vence', 'parcelas vencem') + ' no período') +
      kpi('Ainda em aberto', E.money(c.dueOpen), c.due > 0 ? '<span class="delta ' + (c.dueOpen > 0 ? 'down' : 'up') + '">' + pct + '% recebido</span>' : '', pv ? 'antes: ' + E.money(pv.dueOpen) : '', c.dueOpen > 0 ? 'bad' : '') +
      '</div>';
    if (c.received > 0) {
      var bm = c.byMethod, rows = [['Pix', bm.pix], ['Dinheiro', bm.dinheiro], ['Sem forma informada', bm.outro]].filter(function (x) { return x[1] > 0.004; });
      h += '<h3 style="margin:12px 0 2px">Recebido por forma de pagamento</h3><div class="lines">' + rows.map(function (x) { return '<div class="line"><span>' + x[0] + '</span><span><b>' + E.money(x[1]) + '</b> <small>' + Math.round(x[1] / c.received * 100) + '%</small></span></div>'; }).join('') + '</div>';
    }
    if (c.due > 0) h += '<div class="bar stack" role="img" aria-label="' + pct + '% das parcelas do período já recebido"><i class="later" style="width:' + pct + '%;background:var(--brand-2)"></i></div>';
    if (c.estimated) h += '<div class="msg info">Algumas parcelas antigas não têm a data do recebimento guardada. Para elas o painel usa o vencimento como data. Os novos recebimentos já ficam com a data certa.</div>';
    return h + '<p class="sub"><small>Recebido = dinheiro que entrou na data do pagamento (entrada e venda à vista contam na data da venda). A receber = parcelas a prazo que vencem no período.</small></p></section>';
  }
  function dashFlowHTML(db) {
    var f = db.cur.flow, now = db.cashNow, max = Math.max(f.received, f.contributed, f.reinvested, f.bills, f.expenses, f.withdrawn, 0);
    var row = function (label, v, cls) { return '<div class="mrow wide"><span>' + label + '</span><div class="mini"><i class="' + cls + '" style="width:' + (max > 0 ? v / max * 100 : 0) + '%"></i></div><b>' + E.money(v) + '</b></div>'; };
    var h = '<section class="card"><h2>Para onde foi o dinheiro</h2><p class="sub"><small>' + esc(db.range.label.charAt(0).toUpperCase() + db.range.label.slice(1)) + '. Só conta o que entrou e saiu do caixa da feira.</small></p>';
    if (max <= 0) return h + '<div class="empty">Nada recebido nem pago neste período.</div><p class="sub"><small>Caixa agora: <b>' + E.money(now.balance) + '</b>.</small></p></section>';
    h += row('Recebido das vendas', f.received, 'ok') + (f.contributed > 0 ? row('Coloquei no negócio', f.contributed, 'ok') : '') + row('Reinvestido em compras', f.reinvested, 'inv') + row('Contas pagas', f.bills, 'late') + row('Despesas', f.expenses, 'late') + row('Retirado para mim', f.withdrawn, 'wd') +
      '<div class="line" style="margin-top:6px"><span><b>Sobra do período</b></span><span style="color:' + (f.balance < 0 ? 'var(--bad)' : 'var(--ok)') + '"><b>' + E.money(f.balance) + '</b></span></div>' +
      '<div class="line"><span><b>Em caixa agora</b> <small>(tudo desde o começo)</small></span><span><b>' + E.money(now.balance) + '</b></span></div>' +
      '<div class="actions"><button class="btn small ghost" data-act="go" data-tab="contas">Registrar retirada</button></div></section>';
    return h;
  }
  function dashContasHTML(db) {
    var ps = db.payables, h = '<section class="card"><h2>Contas a pagar ' + (ps.lateCount ? badge('bad', ps.lateCount + ' ' + plural(ps.lateCount, 'vencida', 'vencidas')) : '') + '</h2>';
    if (!ps.count) return h + '<div class="empty">Nenhuma conta em aberto.</div><div class="actions"><button class="btn small ghost" data-act="go" data-tab="contas">Nova conta</button></div></section>';
    var proj = E.round2(db.cashNow.balance + db.receivable.open - ps.open);
    h += '<div class="big">' + E.money(ps.open) + '</div><small>em ' + ps.count + ' ' + plural(ps.count, 'conta aberta', 'contas abertas') + '</small><div class="lines">' +
      '<div class="line"><span>Vencido</span><span style="color:' + (ps.late > 0 ? 'var(--bad)' : 'inherit') + '"><b>' + E.money(ps.late) + '</b></span></div>' +
      '<div class="line"><span>Vence em 7 dias</span><span><b>' + E.money(ps.next7) + '</b></span></div>' +
      '<div class="line"><span>Vence em 30 dias</span><span><b>' + E.money(ps.next30) + '</b></span></div>' +
      '<div class="line"><span>Se receber tudo e pagar tudo <small>(caixa + a receber − a pagar)</small></span><span style="color:' + (proj < 0 ? 'var(--bad)' : 'var(--ok)') + '"><b>' + E.money(proj) + '</b></span></div></div>' +
      '<div class="actions"><button class="btn small" data-act="go" data-tab="contas">Ver e pagar contas</button></div></section>';
    return h;
  }
  function dashReceberHTML(db) {
    var r = db.receivable, later = Math.max(0, r.open - r.late - r.next30);
    var pc = function (v) { return r.open > 0 ? v / r.open * 100 : 0; };
    var h = '<section class="card"><h2>A receber</h2>';
    if (r.open <= 0.004) return h + '<div class="empty">Nada em aberto. Todas as parcelas estão recebidas.</div></section>';
    h += '<div class="big">' + E.money(r.open) + '</div><small>em parcelas abertas</small>' +
      '<div class="bar stack" role="img" aria-label="Atrasado ' + Math.round(pc(r.late)) + '%, próximos 30 dias ' + Math.round(pc(r.next30)) + '%, depois ' + Math.round(pc(later)) + '%">' +
      '<i class="late" style="width:' + pc(r.late) + '%"></i><i class="soon" style="width:' + pc(r.next30) + '%"></i><i class="later" style="width:' + pc(later) + '%"></i></div>' +
      '<div class="legend"><em class="late">Atrasado</em><em class="soon">Até 30 dias</em><em class="later">Depois</em></div>' +
      '<div class="lines">' +
      '<div class="line"><span>Atrasado ' + (r.late > 0 ? badge('bad', fin(Math.round(r.latePct * 1000) / 10) + '% do total') : '') + '</span><span style="color:' + (r.late > 0 ? 'var(--bad)' : 'inherit') + '"><b>' + E.money(r.late) + '</b></span></div>' +
      '<div class="line"><span>Vence em 7 dias</span><span><b>' + E.money(r.next7) + '</b></span></div>' +
      '<div class="line"><span>Vence em 30 dias</span><span><b>' + E.money(r.next30) + '</b></span></div></div>';
    if (r.late > 0) {
      var names = ['1 a 15 dias', '16 a 30 dias', '31 a 60 dias', 'mais de 60 dias'];
      h += '<h3 style="margin:12px 0 2px">Atraso por tempo</h3>' + r.aging.map(function (v, i) { return v > 0 ? '<div class="line"><span>' + names[i] + '</span><span>' + E.money(v) + '</span></div>' : ''; }).join('');
    }
    return h + '<div class="actions"><button class="btn small ghost" data-act="go" data-tab="clientes">Ver clientes</button></div></section>';
  }
  function dashDevedoresHTML(db) {
    var rows = db.debtors, tot = db.receivable.open, max = rows.reduce(function (m, d) { return Math.max(m, d.open); }, 0);
    var h = '<section class="card"><h2>Clientes em débito ' + (rows.length ? badge(rows.some(function (d) { return d.late > 0; }) ? 'bad' : 'info', rows.length + ' ' + plural(rows.length, 'cliente', 'clientes')) : '') + '</h2>';
    if (!rows.length) return h + '<div class="empty">Nenhum cliente em débito.</div></section>';
    h += '<div class="list">' + rows.slice(0, 6).map(function (d) {
      return '<button type="button" class="drow" data-act="go" data-tab="clientes"><div class="head"><b>' + esc(custName(d.customerId)) + '</b><b>' + E.money(d.open) + '</b></div>' +
        '<div class="mini"><i style="width:' + (max > 0 ? d.open / max * 100 : 0) + '%" class="' + (d.late > 0 ? 'late' : 'ok') + '"></i></div>' +
        '<small>' + d.parcels + ' ' + plural(d.parcels, 'parcela', 'parcelas') + ' · ' + (d.late > 0 ? '<span class="bad-t">' + E.money(d.late) + ' atrasado há ' + d.oldest + ' d</span>' : 'em dia') + '</small></button>';
    }).join('') + '</div>' + (rows.length > 6 ? '<p class="sub" style="margin-top:8px"><small>Mostrando os 6 maiores de ' + rows.length + '.</small></p>' : '');
    return h + '<p class="sub" style="margin-top:8px"><small>Total em débito: ' + E.money(tot) + '.</small></p></section>';
  }
  function dashChartHTML(db) {
    var sr = db.series, max = sr.reduce(function (m, x) { return Math.max(m, x.revenue, x.profit, x.purchases); }, 0);
    var hp = function (v) { return max > 0 && v > 0 ? Math.max(3, v / max * 100) : 0; };
    var h = '<section class="card span2"><h2>Últimos 6 meses</h2>';
    if (max <= 0) return h + '<div class="empty">Ainda não há compras nem vendas para mostrar.</div></section>';
    h += '<div class="legend" style="margin-bottom:8px"><em class="cp">Compras</em><em class="cv">Vendas</em><em class="cl">Lucro bruto</em></div><div class="chart" role="img" aria-label="Compras, vendas e lucro bruto por mês">' +
      sr.map(function (x) {
        return '<div class="col"><div class="val">' + (x.revenue > 0 ? kfmt(x.revenue) : '') + '</div><div class="bars" title="' + E.fmonth(x.key) + ': compras ' + E.money(x.purchases) + ', vendas ' + E.money(x.revenue) + ', lucro ' + E.money(x.profit) + '">' +
          '<i class="cp" style="height:' + hp(x.purchases) + '%"></i><i class="cv" style="height:' + hp(x.revenue) + '%"></i><i class="cl" style="height:' + hp(x.profit) + '%"></i></div><div class="mes">' + E.fmonth(x.key).slice(0, 3) + '</div></div>';
      }).join('') + '</div><p class="sub" style="margin-top:8px"><small>Número acima das barras: vendas do mês (k = mil reais).</small></p></section>';
    return h;
  }
  function dashMesesHTML(db) {
    var r = db.receivable, max = r.months.reduce(function (m, x) { return Math.max(m, x.amount); }, r.late);
    var h = '<section class="card"><h2>Quando o dinheiro entra</h2>';
    if (r.open <= 0.004) return h + '<div class="empty">Nenhuma parcela em aberto.</div></section>';
    var row = function (label, v, cls) { return '<div class="mrow"><span>' + label + '</span><div class="mini"><i class="' + cls + '" style="width:' + (max > 0 ? v / max * 100 : 0) + '%"></i></div><b>' + E.money(v) + '</b></div>'; };
    if (r.late > 0) h += row('Atrasado', r.late, 'late');
    h += r.months.map(function (m) { return row(E.fmonth(m.key), m.amount, 'ok'); }).join('');
    return h + '<p class="sub" style="margin-top:8px"><small>Parcelas em aberto por mês de vencimento.</small></p></section>';
  }

  /* ---------- PAINEL ---------- */
  function viewPainel(d) {
    var price = E.num(S.settings.price), bc = E.basketCost(S), cost = bc.cost, profit = price - cost;
    var margin = price > 0 ? profit / price * 100 : 0;
    var cPct = price > 0 ? Math.min(100, Math.max(0, cost / price * 100)) : 0;
    var cash = E.cash(S), flow = E.monthlyFlow(S), next = E.nextParcels(S, 6);
    var db = E.dashboard(S, ui.dashP, E.today());
    var h = '<div class="actions" style="margin:0 0 12px"><button class="btn" data-act="new-expense">+ Lançar despesa (combustível, caixote…)</button></div><div class="grid two">';

    var lim = d.limiting.slice(0, 5).map(function (g) { return esc(g.name) + ' (' + Math.max(0, g.cov) + ')'; }).join(', ');
    if (d.limiting.length > 5) lim += ' e mais ' + (d.limiting.length - 5);
    h += '<section class="card hero span2"><h2>Estoque ' + (d.groups.length ? covBadge(d.total) : '') + '</h2>' +
      '<div class="big">' + d.total + '</div><small>' + plural(d.total, 'cesta montável', 'cestas montáveis') + ' · mínimo ' + fin(S.settings.minCover) + ' · meta ' + fin(S.settings.target) + '</small>' +
      (d.groups.length ? '<p style="margin-top:10px"><b>Itens que limitam:</b> ' + lim + '</p>' : '<p class="muted">Cadastre produtos com quantidade por cesta.</p>') +
      '<div class="actions"><button class="btn" data-act="go" data-tab="estoque">Planejar reposição</button></div></section>';

    h += dashKpisHTML(db) + dashRecebimentosHTML(db) + dashReceberHTML(db) + dashDevedoresHTML(db) + dashChartHTML(db);

    h += '<section class="card"><h2>Resultado por cesta</h2>' +
      '<div class="big" style="color:' + (profit < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + E.money(profit) + '</div>' +
      '<small>lucro bruto · margem de ' + fin(Math.round(margin * 10) / 10) + '%</small>' +
      '<div class="bar" role="img" aria-label="Custo ' + Math.round(cPct) + '% e lucro ' + Math.round(100 - cPct) + '% do preço"><i class="c" style="width:' + cPct + '%"></i><i class="p" style="width:' + (100 - cPct) + '%"></i></div>' +
      '<div class="legend"><em class="c">Custo ' + E.money(cost) + '</em><em class="p">Preço ' + E.money(price) + '</em></div>' +
      (bc.missing.length ? '<div class="msg warn">Custo parcial: ainda não há compra registrada de ' + bc.missing.length + ' ' + plural(bc.missing.length, 'item', 'itens') + ' da cesta.</div>' : '') +
      '<p class="sub" style="margin-top:8px"><small>O lucro bruto considera só os itens da cesta (sacolas incluídas). Despesas, taxas e inadimplência ficam de fora.</small></p></section>';

    h += dashFlowHTML(db) + dashContasHTML(db);

    h += '<section class="card"><h2>Próximas parcelas</h2>';
    if (!next.length) h += '<div class="empty">Nenhuma parcela em aberto.</div>';
    else h += '<div class="list">' + next.map(function (r) {
      var st = E.parcelStatus(r.parcel).map(function (s) { return badge(s.cls, s.text); }).join(' ');
      return '<div class="item"><div class="head"><b>' + esc(custName(r.customerId)) + '</b><b>' + E.money(E.aberto(r.parcel)) + '</b></div>' +
        '<div class="parcel" style="border-top:0;padding-bottom:0"><div class="info"><small>Vence em ' + E.fdate(r.parcel.due) + '</small> ' + st + '</div>' +
        '<button class="btn small" data-act="recv-parcel" data-sale="' + r.sale.id + '" data-parcel="' + r.parcel.id + '">Receber</button></div></div>';
    }).join('') + '</div>';
    h += '</section>';

    h += dashMesesHTML(db);

    h += '<section class="card span2"><h2>Fluxo por mês</h2>';
    if (!flow.length) h += '<div class="empty">Sem compras nem parcelas ainda.</div>';
    else h += '<div class="flow">' + flow.map(function (m) {
      return '<div class="m"><b>' + E.fmonth(m.key) + '</b><div><span>Compras: ' + E.money(m.purchases) + '</span><span>A entrar: ' + E.money(m.inflow) + '</span><span style="color:' + (m.balance < 0 ? 'var(--bad)' : 'var(--ok)') + '"><b style="display:inline">Saldo acumulado: ' + E.money(m.balance) + '</b></span></div></div>';
    }).join('') + '</div>';
    h += '</section></div>';
    return h;
  }

  /* ---------- VENDAS ---------- */
  function newSaleDraft() {
    var t = E.today(), items0 = E.buildSaleItems(S, null, null);
    return { date: t, qty: '1', customerId: '', newName: '', price: fin(S.settings.price), term: S.settings.term, fiadoDue: E.addDays(t, 30), entrada: '', payMode: lastPayMode(), payPix: '', dues: {}, grp: detectGrps(items0), items: items0 };
  }
  function detectGrps(items) { var g = {}; E.groupKeys(S).forEach(function (k) { g[k] = E.detectGroup(S, k, items); }); return g; }
  function saleQty() { var q = E.parseNum(ui.sale.qty); return isNaN(q) ? 0 : q; }

  function groupLabel(k) { return E.GROUPS[k].toLowerCase(); }
  function saleItemRowHTML(p, d, stock) {
    var per = E.num(d.items[p.id]), need = E.round2(saleQty() * per), have = stock[p.id], bad = per > 0 && need > have + 1e-9;
    var editable = !p.group || (d.grp[p.group] || 'mix') === 'mix';
    return '<div class="erp-gr' + (bad ? ' bad' : '') + '"><span class="g-n">' + esc(p.name) + '</span>' +
      '<input type="text" inputmode="decimal" aria-label="' + esc(p.name) + ' por cesta" data-item="' + p.id + '" value="' + fin(per) + '"' + (editable ? '' : ' readonly') + '>' +
      '<span class="g-s">' + (per > 0 ? fin(Math.max(0, have)) + ' ' + esc(p.unit) : '<small>—</small>') + (bad ? '<small>falta ' + fin(need - Math.max(0, have)) + '</small>' : '') + '</span></div>';
  }
  function saleItemsHTML() {
    var d = ui.sale, stock = E.derive(S).stock, h = '<div class="erp-grid" role="table" aria-label="Itens da cesta"><div class="erp-gh" role="row"><span>Produto</span><span>Por cesta</span><span>Estoque</span></div>', others = [];
    d.grp = d.grp || {};
    var shown = {};
    E.groupKeys(S).forEach(function (k) {
      var mode = d.grp[k] || 'mix', mem = E.groupMembers(S, k);
      h += '<div class="erp-gg"><span>' + E.GROUPS[k] + ' <small>' + fin(E.groupTotal(S, k)) + ' ' + esc(E.groupUnit(S, k)) + ' por cesta</small></span>' +
        '<select data-grp="' + k + '" aria-label="Tipo de ' + groupLabel(k) + '">' + mem.map(function (p) { return '<option value="' + p.id + '"' + (mode === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') +
        '<option value="mix"' + (mode === 'mix' ? ' selected' : '') + '>Misturar tipos</option></select></div>';
      mem.forEach(function (p) { shown[p.id] = 1; if (mode === 'mix' || mode === p.id) h += saleItemRowHTML(p, d, stock); });
    });
    S.products.forEach(function (p) {
      if (shown[p.id]) return;
      if (E.num(d.items[p.id]) > 0 || E.num(p.perBasket) > 0) h += saleItemRowHTML(p, d, stock); else others.push(p);
    });
    h += '</div>';
    if (others.length) h += '<details class="erp-more"><summary>Adicionar outro produto à cesta (' + others.length + ')</summary><div class="erp-grid">' + others.map(function (p) { return saleItemRowHTML(p, d, stock); }).join('') + '</div></details>';
    return h + '<small>Para tirar um item desta venda, deixe em 0.</small>';
  }
  function saleTotalsHTML() {
    var d = ui.sale, q = saleQty(), pr = E.parseNum(d.price), tot = saleTotalNow(), adv = E.swapAdvice(S, d.items, pr), h = '<dl class="erp-tot">';
    h += '<div><dt>Cestas</dt><dd>' + fin(q) + '</dd></div><div><dt>Preço por cesta</dt><dd>' + (isNaN(pr) ? '—' : E.money(pr)) + '</dd></div>';
    if (!adv.missing.length && q > 0) {
      var cost = E.round2(adv.cost * q), lucro = E.round2(tot - cost);
      h += '<div><dt>Custo estimado</dt><dd>' + E.money(cost) + '</dd></div><div><dt>Lucro estimado</dt><dd style="color:' + (lucro < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + E.money(lucro) + (tot > 0 ? ' <small>(' + fin(Math.round(lucro / tot * 1000) / 10) + '%)</small>' : '') + '</dd></div>';
    }
    return h + '<div class="grand"><dt>Total do pedido</dt><dd>' + E.money(tot) + '</dd></div></dl>';
  }

  function saleCheckHTML() {
    var d = ui.sale, qty = saleQty(), chk = E.checkSale(S, qty, d.items), h = '<label>Conferência antes de vender</label>';
    chk.groups.forEach(function (g) { h += '<div class="check-row' + (g.ok ? '' : ' bad') + '"><span>' + esc(g.name) + ' da cesta</span><span>' + fin(g.sum) + ' de ' + fin(g.total) + ' ' + g.unit + ' ' + (g.ok ? badge('ok', 'ok') : badge('bad', 'ajustar')) + '</span></div>'; });
    if (!chk.lines.length) h += '<div class="empty">A cesta está vazia.</div>';
    h += chk.lines.map(function (l) {
      return '<div class="check-row' + (l.ok ? '' : ' bad') + '"><span>' + esc(l.name) + '</span><span>precisa ' + fin(l.need) + ' · tem ' + fin(Math.max(0, l.have)) + ' ' + (l.ok ? badge('ok', 'ok') : badge('bad', 'falta ' + fin(l.need - Math.max(0, l.have)))) + '</span></div>';
    }).join('');
    return h;
  }

  /* ---------- forma de pagamento (Pix, dinheiro ou dividido) ---------- */
  var PAY_KEY = 'controle-cestas:paymode';
  function lastPayMode() { try { var v = localStorage.getItem(PAY_KEY); return v === 'pix' || v === 'dinheiro' ? v : 'dinheiro'; } catch (e) { return 'dinheiro'; } }
  function rememberPayMode(m) { if (m === 'pix' || m === 'dinheiro') { try { localStorage.setItem(PAY_KEY, m); } catch (e) { /* ignore */ } } }
  function payScope(sc) { return sc === 'sale' ? ui.sale : ui.payDlg; }
  function payRestText(total, st) {
    var v = E.parseNum(st.payPix);
    if (isNaN(v) || v <= 0) return 'Digite quanto vai no Pix. O resto entra em dinheiro.';
    if (v >= total - 0.004) return 'O Pix precisa ser menor que ' + E.money(total) + '. Para tudo no Pix, use o botão Pix.';
    return 'Pix ' + E.money(v) + ' + dinheiro ' + E.money(E.round2(total - v)) + '.';
  }
  function payPickerHTML(sc, total) {
    var st = payScope(sc), modes = [['pix', 'Pix'], ['dinheiro', 'Dinheiro'], ['dividir', 'Dividir']];
    var h = '<div class="seg three" role="radiogroup" aria-label="Forma de pagamento">' + modes.map(function (m) {
      return '<button type="button" role="radio" aria-checked="' + (st.payMode === m[0]) + '" data-act="pay-mode" data-scope="' + sc + '" data-m="' + m[0] + '">' + m[1] + '</button>';
    }).join('') + '</div>';
    if (st.payMode === 'dividir') {
      h += '<div class="field" style="margin-top:8px"><label for="pay-pix-' + sc + '">Quanto vai no Pix (R$)</label><input id="pay-pix-' + sc + '" type="text" inputmode="decimal" autocomplete="off" data-pay="pix" data-scope="' + sc + '" data-total="' + total + '" value="' + esc(st.payPix) + '"></div>' +
        '<small id="pay-rest-' + sc + '">' + esc(payRestText(total, st)) + '</small>';
    }
    return h;
  }
  /* valor recebido na hora de uma venda (à vista ou entrada) */
  function saleCashNow() {
    var d = ui.sale, qty = saleQty(), price = E.parseNum(d.price);
    if (!(qty > 0) || isNaN(price)) return 0;
    var total = E.round2(qty * price);
    if (d.term === 'avista') return total;
    var en = E.parseNum(d.entrada);
    return !isNaN(en) && en > 0 && en <= total + 0.004 ? E.round2(en) : 0;
  }
  function payBoxHTML() {
    var c = saleCashNow();
    if (!(c > 0)) return '';
    return '<div class="field"><label>Recebido agora (' + E.money(c) + ') em</label>' + payPickerHTML('sale', c) + '</div>';
  }
  /* janela para escolher como o valor foi recebido */
  /* ---------- comprovantes ---------- */
  function bizInfo() {
    var st = S.settings, dd = E.parseDoc(st.bizDoc);
    return { name: (st.bizName || '').trim(), doc: st.bizDoc ? (dd.ok ? dd.kind + ' ' + dd.text : String(st.bizDoc).trim()) : '', phone: (st.bizPhone || '').trim(), email: (st.bizEmail || '').trim(), address: (st.bizAddress || '').trim() };
  }
  function openReceipt(r, ask) {
    if (!r) return; ui.rcpt = r; ui.rcptAsk = !!(ask && r.customer.phone);
    renderReceipt();
    var f = document.querySelector('#rcptModal [data-act="rcpt-pdf"]') || document.querySelector('#rcptModal .sheet [data-act="rcpt-close"]'); if (f) f.focus();
  }
  function closeReceipt() { ui.rcpt = null; ui.rcptAsk = false; renderReceipt(); }
  function waNumber(phone) {
    var d = String(phone || '').replace(/\D/g, '').replace(/^0+/, '');
    if (d.length === 10 || d.length === 11) d = '55' + d;
    return d.length >= 12 && d.length <= 13 ? d : '';
  }
  function waLink(phone, text) { return 'https://wa.me/' + waNumber(phone) + '?text=' + encodeURIComponent(text || ''); }
  /* PDF do comprovante: gerado na hora do toque (mantém o "gesto" que o iPhone exige para compartilhar) */
  function receiptPdfFile(r) {
    var bin = E.receiptPdf(r, bizInfo()), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) & 255;
    return new File([bytes], E.receiptTitle(r) + ' ' + r.number + '.pdf', { type: 'application/pdf' });
  }
  function downloadFile(f) {
    var url = URL.createObjectURL(f), a = document.createElement('a'); a.href = url; a.download = f.name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }
  /* compartilhar (iPhone/Android: abre WhatsApp, Arquivos etc.). Sem suporte, ou se falhar, baixa o arquivo. */
  function shareOrSavePdf(savingOnly) {
    var r = ui.rcpt; if (!r) return;
    var f = receiptPdfFile(r), label = E.receiptLabel(r);
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      navigator.share({ files: [f], title: label, text: label }).catch(function (err) {
        if (err && err.name === 'AbortError') return;
        downloadFile(f); toast('PDF baixado.');
      });
      return;
    }
    downloadFile(f); toast(savingOnly ? 'PDF salvo em Downloads.' : 'PDF baixado. Anexe na conversa do WhatsApp.');
  }
  function receiptPaperHTML(r, biz) {
    var h = '<div class="paper"><div class="ph">' + (biz.name ? '<b class="biz">' + esc(biz.name) + '</b>' : '') + (biz.doc ? '<small>' + esc(biz.doc) + '</small>' : '') + (biz.address ? '<small>' + esc(biz.address) + '</small>' : '') + (biz.phone || biz.email ? '<small>' + [biz.phone, biz.email].filter(Boolean).map(esc).join(' · ') + '</small>' : '') + '</div>' +
      '<h3>' + E.receiptTitle(r) + '</h3><div class="pmeta"><span>Nº ' + esc(r.number) + '</span><span>' + E.fdate(r.kind === 'venda' ? r.date : r.date) + '</span></div>' +
      '<div class="pcl"><small>Cliente</small><b>' + esc(r.customer.name) + '</b>' + (r.customer.phone ? '<small>' + esc(r.customer.phone) + '</small>' : '') + '</div>';
    if (r.kind === 'venda') {
      h += '<div class="pl"><span>' + fin(r.qty) + ' ' + plural(r.qty, 'cesta', 'cestas') + ' × ' + E.money(r.price) + '</span><b>' + E.money(r.total) + '</b></div>';
      if (r.items && r.items.length) {
        h += '<div class="pt"><small>' + (r.qty === 1 ? 'Itens da cesta' : 'Itens de cada cesta') + '</small></div>';
        r.items.forEach(function (i) { h += '<div class="pl sm"><span>' + esc(i.name) + '</span><span>' + fin(i.qty) + (i.unit ? ' ' + esc(i.unit) : '') + '</span></div>'; });
      }
      h += '<div class="pt"><small>Pagamento</small></div>';
      r.parcels.forEach(function (p) {
        h += '<div class="pl"><span>' + esc(p.label) + (p.kind === 'entrada' || p.kind === 'avista' ? '' : '<small> · vence ' + E.fdate(p.due) + '</small>') + '</span><span><b>' + E.money(p.amount) + '</b> <small class="st ' + (p.status === 'Recebida' ? 'ok' : p.status === 'Atrasada' ? 'bad' : '') + '">' + p.status + '</small></span></div>';
      });
      h += '<div class="pl tot"><span>Recebido</span><b>' + E.money(r.received) + '</b></div><div class="pl tot"><span>A receber</span><b>' + E.money(r.open) + '</b></div>';
    } else {
      r.lines.forEach(function (l) {
        h += '<div class="pl"><span>' + esc(l.parcel) + '<small> · venda de ' + E.fdate(l.saleDate) + '</small></span><span><b>' + E.money(l.amount) + '</b>' + (l.method ? ' <small>' + esc(l.method) + '</small>' : '') + '</span></div>';
      });
      h += '<div class="pl tot"><span>Total pago</span><b>' + E.money(r.total) + '</b></div><div class="pl"><span>Saldo em aberto do cliente</span><b>' + E.money(r.balance) + '</b></div>';
    }
    return h + '<p class="pfoot">Documento sem valor fiscal.</p></div>';
  }
  function renderReceipt() {
    var root = $('#rcptModal'), r = ui.rcpt;
    if (!root) { root = document.createElement('div'); root.id = 'rcptModal'; document.body.appendChild(root); }
    if (!r) { root.innerHTML = ''; root.hidden = true; document.body.classList.remove('rcpt-open'); if (!ui.payDlg && !ui.saleModal) document.body.classList.remove('modal-open'); if (ui.saleModal) renderSaleModal(); return; }
    var biz = bizInfo(), text = E.receiptText(r, biz), hasPhone = !!waNumber(r.customer.phone), first = String(r.customer.name).split(' ')[0];
    root.hidden = false; document.body.classList.add('modal-open', 'rcpt-open'); if (ui.saleModal) { var sr = $('#saleModal'); if (sr) sr.hidden = true; }
    var top = '';
    if (ui.rcptAsk) top = '<div class="rask no-print"><h2>Enviar o comprovante para ' + esc(first) + '?</h2><p class="sub">Gera o PDF e abre o compartilhar do aparelho. Escolha o WhatsApp e a conversa de <b>' + esc(first) + '</b> (' + esc(r.customer.phone) + ').</p>' +
      '<div class="actions"><button type="button" class="btn big" data-act="rcpt-pdf">Sim, enviar o PDF</button><button type="button" class="btn ghost" data-act="rcpt-close">Agora não</button></div></div>';
    root.innerHTML = '<div class="scrim" data-act="rcpt-close"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="Comprovante">' + top + receiptPaperHTML(r, biz) +
      (biz.name ? '' : '<p class="no-print hint"><small>Para o comprovante sair com o nome e o CPF/CNPJ do seu negócio, <button type="button" class="linkbtn under" data-act="go" data-tab="config" data-sub="empresa">cadastre os dados da empresa</button>.</small></p>') +
      '<div class="actions no-print rsend">' + (ui.rcptAsk ? '' : '<button type="button" class="btn" data-act="rcpt-pdf">Enviar PDF' + (r.customer.phone ? ' para ' + esc(first) : '') + '</button>') +
      '<button type="button" class="btn ghost" data-act="rcpt-dl">Salvar PDF</button>' +
      (hasPhone ? '<a class="btn ghost" data-act="rcpt-wa" target="_blank" rel="noopener" href="' + waLink(r.customer.phone, text) + '">Só o texto no WhatsApp</a>' : '') +
      '<button type="button" class="btn ghost" data-act="rcpt-copy">Copiar texto</button><button type="button" class="btn ghost" data-act="rcpt-close">Fechar</button></div></div>';
  }
  function entriesOfPay(sale, p, i) {
    var list = E.paysOf(sale, p), d = list[i] && list[i].date;
    return list.filter(function (x) { return x.date === d; }).map(function (x) { return { saleId: sale.id, parcelId: p.id, amount: x.amount, method: x.method, date: x.date }; });
  }

  function openPay(cfg) {
    ui.payDlg = { kind: cfg.kind, saleId: cfg.saleId, parcelId: cfg.parcelId, customerId: cfg.customerId, billId: cfg.billId, total: E.round2(cfg.total), title: cfg.title, payMode: lastPayMode(), payPix: '', from: 'caixa', err: '' };
    renderPay();
    var f = document.querySelector('#payModal [data-act="pay-ok"]'); if (f) f.focus();
  }
  function closePay() { ui.payDlg = null; renderPay(); }
  function renderPay() {
    var root = $('#payModal'), d = ui.payDlg;
    if (!root) { root = document.createElement('div'); root.id = 'payModal'; document.body.appendChild(root); }
    if (!d) { root.innerHTML = ''; root.hidden = true; if (!ui.rcpt && !ui.saleModal) document.body.classList.remove('modal-open'); return; }
    root.hidden = false; document.body.classList.add('modal-open');
    root.innerHTML = '<div class="scrim" data-act="pay-cancel"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="pay-title">' +
      '<h2 id="pay-title">' + (d.kind === 'bill' ? 'Pagar ' : 'Receber ') + E.money(d.total) + '</h2><p class="sub">' + esc(d.title) + '</p>' +
      '<div class="field"><label>Como foi pago?</label>' + payPickerHTML('dlg', d.total) + '</div>' +
      (d.kind === 'bill' ? '<div class="field"><label id="pfrom-l">De onde saiu o dinheiro?</label><div class="seg" role="radiogroup" aria-labelledby="pfrom-l" style="margin:0">' + [['caixa', 'Caixa da feira'], ['pessoal', 'Meu bolso']].map(function (m) { return '<button type="button" role="radio" aria-checked="' + (d.from === m[0]) + '" data-act="pay-from" data-m="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div><small>Do caixa da feira diminui o caixa. Do seu bolso, não.</small></div>' : '') +
      (d.err ? '<div class="msg bad" role="alert">' + esc(d.err) + '</div>' : '') +
      '<div class="actions"><button type="button" class="btn big" data-act="pay-ok">' + (d.kind === 'bill' ? 'Confirmar pagamento' : 'Confirmar recebimento') + '</button><button type="button" class="btn ghost" data-act="pay-cancel">Cancelar</button></div></div>';
  }
  function confirmPay() {
    var d = ui.payDlg, rcptEntries = null; if (!d) return;
    var sp = E.splitPay(d.total, d.payMode, d.payPix);
    if (sp.error) { d.err = sp.error; return renderPay(); }
    rememberPayMode(d.payMode);
    if (d.kind === 'bill') {
      var bill = E.byId(S.payables, d.billId); if (!bill) return closePay();
      E.payBillSplit(bill, E.today(), sp.splits, d.from);
      toast('Pagamento registrado.');
    } else if (d.kind === 'parcel') {
      var sale = E.byId(S.sales, d.saleId), p = sale && E.byId(sale.parcels, d.parcelId);
      if (!p) return closePay();
      E.receiveParcel(p, E.today(), sp.splits);
      toast('Recebimento registrado.');
      rcptEntries = sp.splits.map(function (x) { return { saleId: sale.id, parcelId: p.id, amount: x.amount, method: x.method, date: E.today() }; });
    } else {
      var r = E.receiveForCustomer(S, d.customerId, d.total, E.today(), sp.splits);
      var ci = $('#rc-' + d.customerId); if (ci) ci.value = '';
      toast(E.money(r.applied) + ' abatidos das parcelas mais antigas.');
      rcptEntries = r.entries;
    }
    closePay(); commit();
    if (rcptEntries && rcptEntries.length) openReceipt(E.baixaReceipt(S, rcptEntries, E.today()), true);
  }

  function salePreviewHTML() {
    var d = ui.sale, qty = saleQty(), price = E.parseNum(d.price), entrada = E.parseNum(d.entrada);
    if (!(qty > 0) || isNaN(price)) return '<small>Informe cestas e preço para ver o parcelamento.</small>';
    var total = E.round2(qty * price);
    var r = E.buildParcels({ total: total, term: d.term, date: d.date, entrada: isNaN(entrada) ? 0 : entrada, fiadoDue: d.fiadoDue });
    if (r.error) return '<div class="msg bad">' + esc(r.error) + '</div>';
    var parts = r.parcels.map(function (p) {
      if (p.kind === 'avista') return 'recebido à vista ' + E.money(p.amount);
      if (p.kind === 'entrada') return 'entrada de ' + E.money(p.amount) + ' recebida hoje';
      return E.money(p.amount) + ' em ' + E.fdate(p.due);
    });
    return '<div class="msg info"><b>Total ' + E.money(total) + '.</b> ' + (parts.length ? parts.join('; ') + '.' : 'Sem parcelas.') + '</div>';
  }


  /* custo, lucro e sugestão de troca quando a cesta foge do padrão */
  function saleSwapHTML() {
    var d = ui.sale, price = E.parseNum(d.price), adv = E.swapAdvice(S, d.items, price), std = E.defaultItems(S);
    ui.swapAdv = adv;
    var h = '<label>Custo e lucro por cesta</label>';
    if (adv.missing.length) return h + '<small>Ainda não há custo registrado para ' + adv.missing.length + ' ' + plural(adv.missing.length, 'item', 'itens') + ' da cesta. Registre uma compra para ver o lucro.</small>';
    var has = !isNaN(price);
    var line = function (name, cost) {
      var pr = has ? E.round2(price - cost) : null, mg = has && price > 0 ? pr / price * 100 : null;
      return '<div class="costrow"><b>' + name + '</b><span>custo ' + E.money(cost) + (has ? ' · lucro <b style="color:' + (pr < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + E.money(pr) + '</b> (' + fin(Math.round(mg * 10) / 10) + '%)' : '') + '</span></div>';
    };
    h += line('Cesta padrão', adv.stdCost);
    var changed = E.diffMods(S, d.items).length > 0;
    if (changed) h += line('Esta cesta', adv.cost);
    if (adv.delta > 0.004) {
      h += '<div class="msg warn" style="margin-top:8px"><b>Esta cesta custa ' + E.money(adv.delta) + ' a mais que a padrão.</b> Para manter o lucro, escolha uma troca ou cobre a diferença.</div>';
      if (adv.options.length) {
        h += '<div class="swaps">' + adv.options.map(function (o, i) {
          var txt = o.removals.map(function (r) { return esc(r.name) + ' <small>(' + (r.to > 0 ? 'de ' + fin(r.from) + ' para ' + fin(r.to) : 'tirar') + ' ' + (r.to > 0 ? '' : fin(r.from) + ' ') + r.unit + ')</small>'; }).join(', ');
          var res = Math.abs(o.diff) < 0.005 ? 'Fecha certinho: a cesta volta ao custo padrão.' : o.diff > 0 ? 'Fica ' + E.money(o.diff) + ' acima do custo padrão (lucro um pouco menor).' : 'Fica ' + E.money(-o.diff) + ' abaixo do custo padrão (lucro um pouco maior).';
          return '<div class="swap"><div class="info"><b>Tirar:</b> ' + txt + '<br><small>Sai ' + E.money(o.removed) + ' de custo. ' + res + '</small></div>' +
            '<button type="button" class="btn small" data-act="apply-swap" data-i="' + i + '">Aplicar</button></div>';
        }).join('') + '</div>';
      } else h += '<small>Não encontrei uma combinação de itens que feche essa diferença.</small>';
      if (has) h += '<div class="actions" style="margin-top:8px"><button type="button" class="btn small ghost" data-act="swap-price">Ou cobrar ' + E.money(price + adv.delta) + ' por cesta (+' + E.money(adv.delta) + ')</button></div>';
    } else if (adv.delta < -0.004) {
      h += '<div class="msg info" style="margin-top:8px">Esta cesta custa ' + E.money(-adv.delta) + ' a menos que a padrão, então o lucro por cesta é maior.</div>';
    }
    return h;
  }

  function refreshSaleDyn() { var a = $('#saleCheck'), b = $('#salePreview'), c = $('#payBox'), w = $('#saleSwap'), s = $('#saleStatus'), t = $('#saleTotal'); if (a) a.innerHTML = saleCheckHTML(); if (b) b.innerHTML = salePreviewHTML(); if (c) c.innerHTML = payBoxHTML(); if (w) w.innerHTML = saleSwapHTML(); if (s) s.innerHTML = saleStatusHTML(); if (t) t.textContent = E.money(saleTotalNow()); var tt = $('#saleTotals'); if (tt) tt.innerHTML = saleTotalsHTML(); var si = $('#saleItems'); if (si && !si.contains(document.activeElement)) si.innerHTML = saleItemsHTML(); if (ui.saleModal) refreshCheckout(); }
  function refreshSaleItems() { var a = $('#saleItems'); if (a) a.innerHTML = saleItemsHTML(); refreshSaleDyn(); }

  function viewVendas() {
    var vv = ui.vview || 'nova';
    var seg = '<div class="seg" role="tablist" aria-label="Parte de Vendas" style="margin:0 0 12px">' + [['nova', 'Nova venda'], ['feitas', 'Vendas feitas' + (S.sales.length ? ' (' + S.sales.length + ')' : '')]].map(function (x) {
      return '<button type="button" role="tab" aria-selected="' + (vv === x[0]) + '" data-act="vendas-view" data-v="' + x[0] + '">' + x[1] + '</button>';
    }).join('') + '</div>';
    return seg + (vv === 'feitas' ? vendasFeitasHTML() : novaVendaHTML());
  }

  var TERMS = [['avista', 'À vista'], ['30-60', '30 e 60 dias'], ['30', '30 dias'], ['fiado', 'Fiado']];
  function saleTotalNow() { var q = saleQty(), p = E.parseNum(ui.sale.price); return q > 0 && !isNaN(p) ? E.round2(q * p) : 0; }
  function saleTermHTML() {
    var d = ui.sale;
    return '<div class="seg four" role="radiogroup" aria-label="Prazo">' + TERMS.map(function (t) {
      return '<button type="button" role="radio" aria-checked="' + (d.term === t[0]) + '" data-act="sale-term" data-v="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>' +
      '<div class="field" id="entradaBox"' + (d.term === 'avista' ? ' hidden' : '') + '><label for="s-entrada">Entrada (R$, opcional)</label><input id="s-entrada" type="text" inputmode="decimal" data-bind="sale.entrada" value="' + esc(d.entrada) + '"></div>';
  }
  /* resumo do estoque no título da seção "Itens da cesta" */
  function saleStatusHTML() {
    var chk = E.checkSale(S, saleQty(), ui.sale.items);
    if (!chk.errors.length) return badge('ok', 'Estoque ok');
    return badge('bad', chk.errors.length + ' ' + plural(chk.errors.length, 'ajuste', 'ajustes'));
  }
  function novaVendaHTML() {
    if (!ui.sale) ui.sale = newSaleDraft();
    var d = ui.sale;
    var custs = S.customers.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'pt-BR'); });
    return '<form id="saleForm" class="erp" novalidate>' +
      '<section class="erp-panel"><header class="erp-head"><h2>Pedido de venda</h2><span class="erp-tag">Rascunho</span></header><div class="erp-body">' +
      '<div class="erp-cell wide"><label for="s-cust">Cliente</label><select id="s-cust" data-bind="sale.customerId"><option value="">— Novo cliente —</option>' +
      custs.map(function (c) { return '<option value="' + c.id + '"' + (d.customerId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="erp-cell wide" id="newNameBox"' + (d.customerId ? ' hidden' : '') + '><label for="s-new">Nome do novo cliente</label><input id="s-new" type="text" autocomplete="off" data-bind="sale.newName" value="' + esc(d.newName) + '"></div>' +
      '<div class="erp-cell"><label for="s-date">Data</label><input id="s-date" type="date" data-bind="sale.date" value="' + d.date + '"></div>' +
      '<div class="erp-cell"><label for="s-price">Preço por cesta (R$)</label><input id="s-price" type="text" inputmode="decimal" data-bind="sale.price" value="' + esc(d.price) + '"></div>' +
      '<div class="erp-cell wide"><label for="s-qty">Quantidade de cestas</label><div class="stepper pos-step"><button type="button" class="btn ghost" data-act="sale-qty" data-d="-1" aria-label="Menos uma cesta">−</button>' +
      '<div class="field"><input id="s-qty" type="text" inputmode="numeric" data-bind="sale.qty" value="' + esc(d.qty) + '"></div>' +
      '<button type="button" class="btn ghost" data-act="sale-qty" data-d="1" aria-label="Mais uma cesta">+</button></div></div>' +
      '</div></section>' +

      '<section class="erp-panel"><header class="erp-head"><h2>Itens da cesta</h2><span id="saleStatus">' + saleStatusHTML() + '</span></header><div class="erp-body flush"><div id="saleItems">' + saleItemsHTML() + '</div></div></section>' +

      '<section class="erp-panel"><header class="erp-head"><h2>Resumo</h2></header><div class="erp-body flush"><div id="saleTotals">' + saleTotalsHTML() + '</div></div></section>' +

      '<details class="erp-panel erp-fold" data-keep="saleItemsOpen"' + (ui.saleItemsOpen ? ' open' : '') + '><summary class="erp-head"><h2>Conferência e custo</h2><span class="erp-tag">detalhes</span></summary><div class="erp-body flush">' +
      '<div id="saleSwap">' + saleSwapHTML() + '</div><div id="saleCheck" style="margin-top:12px">' + saleCheckHTML() + '</div>' +
      '<div class="actions"><button type="button" class="btn ghost small" data-act="copy-basket">Copiar conteúdo da cesta</button></div></div></details>' +

      '<div id="saleMsg">' + msgHTML('sale') + '</div>' +
      '<div class="stickybar"><div class="sb-total"><small>Total da venda</small><b id="saleTotal">' + E.money(saleTotalNow()) + '</b></div><button type="submit" class="btn big">Finalizar venda</button></div></form>';
  }

  /* ---------- vendas feitas ---------- */
  function vfDraft() { return ui.vf || (ui.vf = { p: 'mes', cust: '', st: 'todas' }); }
  function payLinesHTML(s, p) {
    var list = E.paysOf(s, p), de = ui.dateEdit;
    if (!list.length) return '';
    return '<div class="pays">' + list.map(function (x, i) {
      var editing = de && de.sale === s.id && de.parcel === p.id && de.i === i;
      var base = '<small>Recebido ' + E.money(x.amount) + (x.method ? ' no ' + esc(E.methodName(x.method)) : '') + ' em <b>' + E.fdate(x.date) + '</b>' + (x.est ? ' (data estimada)' : '') + '</small>';
      if (!editing) return '<div class="payline">' + base + ' <button type="button" class="btn small ghost" data-act="rcpt-pay" data-sale="' + s.id + '" data-parcel="' + p.id + '" data-i="' + i + '">Comprovante</button> <button type="button" class="btn small ghost" data-act="edit-paydate" data-sale="' + s.id + '" data-parcel="' + p.id + '" data-i="' + i + '">Alterar data</button></div>';
      return '<div class="payline editing">' + base + '<div class="field" style="margin:8px 0"><label for="pd-input">Nova data do recebimento</label><input id="pd-input" type="date" max="' + E.today() + '" value="' + esc(de.date) + '" data-datefield="1"></div>' +
        '<div class="actions" style="margin:0"><button type="button" class="btn small" data-act="save-paydate">Salvar</button><button type="button" class="btn small ghost" data-act="cancel-paydate">Cancelar</button></div>' +
        (de.err ? '<div class="msg bad" style="margin-top:6px">' + esc(de.err) + '</div>' : '') + '</div>';
    }).join('') + '</div>';
  }

  function dueEditHTML(s, p, open) {
    if (!open) return '';
    var de = ui.dateEdit;
    if (de && de.sale === s.id && de.parcel === p.id && de.i === -1) {
      return '<div class="pays"><div class="payline editing"><div class="field" style="margin:0 0 8px"><label for="pd-input">Nova data prevista para receber</label><input id="pd-input" type="date" value="' + esc(de.date) + '" data-datefield="1"></div>' +
        '<div class="actions" style="margin:0"><button type="button" class="btn small" data-act="save-paydate">Salvar</button><button type="button" class="btn small ghost" data-act="cancel-paydate">Cancelar</button></div>' +
        (de.err ? '<div class="msg bad" style="margin-top:6px">' + esc(de.err) + '</div>' : '') + '</div></div>';
    }
    return '<div class="pays"><div class="payline"><small>Previsto para <b>' + E.fdate(p.due) + '</b></small> <button type="button" class="btn small ghost" data-act="edit-due" data-sale="' + s.id + '" data-parcel="' + p.id + '">Alterar data</button></div></div>';
  }

  /* ---------- editar venda ---------- */
  function startSaleEdit(sale) {
    ui.saleEdit = { id: sale.id, date: sale.date, customerId: sale.customerId, qty: String(sale.qty), price: fin(sale.price), err: [],
      parcels: sale.parcels.slice().sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; }).map(function (p) { return { id: p.id, amount: fin(p.amount), due: p.due, got: E.recebido(p), kind: p.kind || '' }; }) };
  }
  function seTotal() { var d = ui.saleEdit, q = E.parseNum(d.qty), p = E.parseNum(d.price); return isNaN(q) || isNaN(p) ? NaN : E.round2(q * p); }
  function seSum() { return E.round2(ui.saleEdit.parcels.reduce(function (a, x) { var v = E.parseNum(x.amount); return a + (isNaN(v) ? 0 : v); }, 0)); }
  function seSummaryHTML() {
    var tot = seTotal(), sum = seSum();
    if (isNaN(tot)) return '<div class="msg info">Informe cestas e preço para conferir as parcelas.</div>';
    var diff = E.round2(tot - sum);
    return '<div class="se-sum"><div><span>Total da venda</span><b>' + E.money(tot) + '</b></div><div><span>Soma das parcelas</span><b>' + E.money(sum) + '</b></div></div>' +
      (Math.abs(diff) < 0.005 ? '<div class="msg ok">Parcelas conferem com o total.</div>' :
        '<div class="msg bad">' + (diff > 0 ? 'Faltam ' + E.money(diff) : 'Passou ' + E.money(-diff)) + ' nas parcelas. <button type="button" class="linkbtn under" data-act="se-fit">Ajustar a última parcela</button></div>');
  }
  function saleEditHTML() {
    var d = ui.saleEdit, custs = S.customers.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'pt-BR'); });
    var h = '<button type="button" class="back" data-act="se-cancel">‹ Cancelar edição</button>';
    h += '<form class="card" id="saleEditForm" novalidate><h2>Editar venda</h2><p class="sub"><small>Corrija os dados e as parcelas. O que já foi recebido continua registrado.</small></p>' +
      '<div class="field"><label for="se-cust">Cliente</label><select id="se-cust" data-bind="saleEdit.customerId">' + custs.map(function (c) { return '<option value="' + c.id + '"' + (d.customerId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="se-date">Data da venda</label><input id="se-date" type="date" data-bind="saleEdit.date" value="' + esc(d.date) + '"></div>' +
      '<div class="row"><div class="field"><label for="se-qty">Cestas</label><input id="se-qty" type="text" inputmode="numeric" data-bind="saleEdit.qty" value="' + esc(d.qty) + '"></div>' +
      '<div class="field"><label for="se-price">Preço da cesta (R$)</label><input id="se-price" type="text" inputmode="decimal" data-bind="saleEdit.price" value="' + esc(d.price) + '"></div></div>' +
      '<h3 style="margin:14px 0 6px">Parcelas</h3><div class="seg-actions"><button type="button" class="btn small ghost" data-act="se-replan" data-t="30-60">2 parcelas (30 e 60 dias)</button><button type="button" class="btn small ghost" data-act="se-replan" data-t="30">1 parcela (30 dias)</button></div>' +
      '<div id="seRows">' + seRowsHTML() + '</div><div class="actions" style="margin-top:6px"><button type="button" class="btn small ghost" data-act="se-add">+ Adicionar parcela</button></div>' +
      '<div id="seSum" style="margin-top:10px">' + seSummaryHTML() + '</div>' +
      '<div id="seMsg">' + (d.err.length ? '<div class="msg bad" role="alert">' + d.err.map(esc).join('<br>') + '</div>' : '') + '</div>' +
      '<div class="actions"><button type="submit" class="btn">Salvar alterações</button><button type="button" class="btn ghost" data-act="se-cancel">Cancelar</button></div></form>';
    return h;
  }
  function seRowsHTML() {
    return ui.saleEdit.parcels.map(function (x, i) {
      return '<div class="se-row"><div class="field"><label for="se-a' + i + '">Parcela ' + (i + 1) + (x.kind === 'entrada' ? ' · entrada' : x.kind === 'avista' ? ' · à vista' : '') + '</label>' +
        '<input id="se-a' + i + '" type="text" inputmode="decimal" aria-label="Valor da parcela ' + (i + 1) + '" data-sei="' + i + '" data-sepf="amount" value="' + esc(x.amount) + '"></div>' +
        '<div class="field"><label for="se-d' + i + '">Vencimento</label><input id="se-d' + i + '" type="date" data-sei="' + i + '" data-sepf="due" value="' + esc(x.due) + '"></div>' +
        (x.got > 0.004 ? '<small class="se-note">Já recebeu ' + E.money(x.got) + ' — não dá para baixar abaixo disso.</small>' : '<button type="button" class="btn small ghost se-del" data-act="se-del" data-i="' + i + '" aria-label="Remover parcela ' + (i + 1) + '">Remover</button>') + '</div>';
    }).join('');
  }
  function submitSaleEdit() {
    var d = ui.saleEdit, parcels = [], err = [];
    d.parcels.forEach(function (x, i) {
      var v = E.parseNum(x.amount); if (isNaN(v)) err.push('Parcela ' + (i + 1) + ': valor inválido.');
      parcels.push({ id: x.id, amount: isNaN(v) ? 0 : v, due: x.due });
    });
    var q = E.parseNum(d.qty), p = E.parseNum(d.price);
    if (!err.length) { var r = E.editSale(S, d.id, { date: d.date, customerId: d.customerId, qty: q, price: p, parcels: parcels }); err = r.errors; }
    if (err.length) { d.err = err; $('#seMsg').innerHTML = '<div class="msg bad" role="alert">' + err.map(esc).join('<br>') + '</div>'; return; }
    ui.saleEdit = null; toast('Venda atualizada.'); commit();
  }

  function saleDetailHTML(s) {
    if (ui.saleEdit && ui.saleEdit.id === s.id) return saleEditHTML();
    var hoje = E.today(), lab = E.parcelLabels(s);
    var parcels = s.parcels.slice().sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; });
    var tot = E.saleTotal(s), pr = E.saleProfit(s), rec = 0, abr = 0;
    s.parcels.forEach(function (p) { rec += E.recebido(p); abr += E.aberto(p); });
    var h = '<button type="button" class="back" data-act="close-sale">‹ Vendas feitas</button>';
    h += '<section class="card"><div class="cardhead"><h2><button type="button" class="linkbtn" data-act="open-cust" data-id="' + esc(s.customerId) + '">' + esc(custName(s.customerId)) + '</button></h2>' + saleStatusBadge(s, hoje) + '</div>' +
      '<small>' + E.fdate(s.date) + ' · ' + fin(s.qty) + ' ' + plural(s.qty, 'cesta', 'cestas') + ' × ' + E.money(s.price) + (s.mods && s.mods.length ? ' · cesta personalizada' : '') + '</small>' +
      (s.mods && s.mods.length ? '<small style="display:block;margin-top:4px">' + s.mods.map(function (m) { var pd = prod(m.pid); return esc(pd ? pd.name : 'Item') + ': ' + fin(m.de) + ' → ' + fin(m.para); }).join(' · ') + '</small>' : '') +
      '<div class="kpis four" style="margin-top:12px"><div class="kpi"><b>' + E.money(tot) + '</b><span>Total</span></div><div class="kpi"><b>' + E.money(rec) + '</b><span>Recebido</span></div>' +
      '<div class="kpi"><b>' + E.money(abr) + '</b><span>A receber</span></div><div class="kpi"><b style="color:' + (pr < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + E.money(pr) + '</b><span>Lucro bruto</span></div></div>' +
      '<div class="actions"><button class="btn" data-act="rcpt-sale" data-id="' + s.id + '">Comprovante da venda</button><button class="btn ghost" data-act="edit-sale" data-id="' + s.id + '">Editar venda</button></div></section>';
    h += '<section class="card"><h2>Parcelas</h2><div class="prows">' + parcels.map(function (p) {
      var st = E.parcelStatus(p).map(function (x) { return badge(x.cls, x.text); }).join(' ');
      var open = E.isOpen(p), r = E.recebido(p);
      return '<div class="parcel"><div class="info"><b>' + E.money(p.amount) + '</b> <small>' + esc(lab[p.id] || '') + (p.kind === 'entrada' || p.kind === 'avista' ? '' : ' · vence ' + E.fdate(p.due)) + '</small><br>' + st + (open && r > 0.004 ? ' <small>recebido ' + E.money(r) + '</small>' : '') + '</div>' +
        '<div class="btns">' + (open ? '<button class="btn small" data-act="recv-parcel" data-sale="' + s.id + '" data-parcel="' + p.id + '">Receber</button>' : '') +
        (r > 0.004 ? '<button class="btn small ghost" data-act="undo-parcel" data-sale="' + s.id + '" data-parcel="' + p.id + '">Desfazer</button>' : '') + '</div>' +
        dueEditHTML(s, p, open) + payLinesHTML(s, p) + '</div>';
    }).join('') + '</div></section>';
    h += '<div class="actions dangerzone"><button class="btn small danger" data-act="del" data-kind="sale" data-id="' + s.id + '" data-label="Excluir venda">Excluir venda</button></div>';
    return h;
  }
  function saleRowHTML(s, hoje) {
    return '<button type="button" class="crow" data-act="open-sale" data-id="' + s.id + '"><span class="cn"><b>' + esc(custName(s.customerId)) + '</b><small>' + E.fdate(s.date) + ' · ' + fin(s.qty) + ' ' + plural(s.qty, 'cesta', 'cestas') + '</small></span>' +
      '<span class="cv"><b>' + E.money(E.saleTotal(s)) + '</b>' + saleStatusBadge(s, hoje) + '</span><i aria-hidden="true">›</i></button>';
  }

  function vendasFeitasHTML() {
    if (ui.saleOpen && E.byId(S.sales, ui.saleOpen)) return saleDetailHTML(E.byId(S.sales, ui.saleOpen));
    ui.saleOpen = null;
    var f = vfDraft(), hoje = E.today(), rg = E.periodRange(f.p, hoje);
    var sales = S.sales.filter(function (s) {
      if (s.date < rg.from || s.date > rg.to) return false;
      if (f.cust && s.customerId !== f.cust) return false;
      var open = s.parcels.some(function (p) { return E.isOpen(p); });
      if (f.st === 'abertas' && !open) return false;
      if (f.st === 'quitadas' && open) return false;
      return true;
    }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    var tot = 0, prof = 0, rec = 0, abr = 0, cestas = 0;
    sales.forEach(function (s) {
      tot += E.saleTotal(s); prof += E.saleProfit(s); cestas += E.num(s.qty);
      s.parcels.forEach(function (p) { rec += E.recebido(p); abr += E.aberto(p); });
    });
    var custs = S.customers.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'pt-BR'); });
    var sel = function (id, label, bind, cur, opts) {
      return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '" data-bind="' + bind + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (cur === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>';
    };
    var STS = [['todas', 'Todas'], ['abertas', 'Com valor a receber'], ['quitadas', 'Totalmente recebidas']];
    var plab = (PERIODS.filter(function (x) { return x[0] === f.p; })[0] || [0, ''])[1], slab = (STS.filter(function (x) { return x[0] === f.st; })[0] || [0, ''])[1];
    var clab = f.cust ? custName(f.cust) : 'Todos os clientes';
    var h = '<section class="card"><div class="kpis three"><div class="kpi"><b>' + E.money(tot) + '</b><span>Vendido · ' + sales.length + '</span></div>' +
      '<div class="kpi"><b>' + E.money(abr) + '</b><span>A receber</span></div>' +
      '<div class="kpi"><b style="color:' + (prof < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + E.money(prof) + '</b><span>Lucro bruto</span></div></div>' +
      '<details class="filters" data-keep="vfOpen"' + (ui.vfOpen ? ' open' : '') + '><summary><span>Filtros</span><small>' + esc(plab + ' · ' + slab + ' · ' + clab) + '</small></summary>' +
      '<div class="row">' + sel('vf-p', 'Período', 'vf.p', f.p, PERIODS) + sel('vf-st', 'Situação', 'vf.st', f.st, STS) + '</div>' +
      sel('vf-c', 'Cliente', 'vf.cust', f.cust, [['', 'Todos os clientes']].concat(custs.map(function (c) { return [c.id, c.name]; }))) + '</details>' +
      (sales.length ? '<small>' + fin(cestas) + ' ' + plural(cestas, 'cesta', 'cestas') + ' · ' + E.money(rec) + ' já recebido.</small>' : '') + '</section>';
    h += '<section class="card" style="margin-top:12px">';
    if (!sales.length) h += '<div class="empty">' + (S.sales.length ? 'Nenhuma venda com esses filtros.' : 'Nenhuma venda registrada ainda.') + '</div>';
    else h += '<div class="crows">' + sales.map(function (s) { return saleRowHTML(s, hoje); }).join('') + '</div>';
    return h + '</section>';
  }

  function basketText(items) {
    var out = ['*Conteúdo da cesta*'];
    E.CATS.forEach(function (cat) {
      var lines = S.products.filter(function (p) { return p.cat === cat && E.num(items[p.id]) > 0; }).map(function (p) {
        var q = E.num(items[p.id]);
        return '• ' + (p.unit === 'kg' ? fin(q) + ' kg ' : fin(q) + 'x ') + p.name;
      });
      if (lines.length) { out.push(''); out.push('*' + cat + '*'); out = out.concat(lines); }
    });
    return out.join('\n');
  }

  /* ---------- finalizar venda: pagamento, vencimentos e confirmação ---------- */
  function duesArr() { var arr = []; Object.keys(ui.sale.dues || {}).forEach(function (k) { arr[Number(k)] = ui.sale.dues[k]; }); return arr; }
  function saleInput(pay) {
    var d = ui.sale, entrada = E.parseNum(d.entrada);
    return { qty: saleQty(), date: d.date, price: E.parseNum(d.price), customerId: d.customerId, newName: d.newName, items: d.items, term: d.term, entrada: isNaN(entrada) ? 0 : entrada, fiadoDue: d.fiadoDue, dues: duesArr(), pay: pay || null };
  }
  function saleCustName() { var c = E.byId(S.customers, ui.sale.customerId); return c ? c.name : (ui.sale.newName || '').trim() || 'Cliente novo'; }
  function ckParcelsHTML() {
    var d = ui.sale, total = saleTotalNow(), en = E.parseNum(d.entrada);
    if (!(total > 0)) return '';
    var r = E.buildParcels({ total: total, term: d.term, date: d.date, entrada: isNaN(en) ? 0 : en, fiadoDue: d.fiadoDue, dues: duesArr() });
    if (r.error) return '<div class="msg bad" role="alert">' + esc(r.error) + '</div>';
    var open = r.parcels.filter(function (p) { return !p.paid; }), n = 0, h = '<div class="ck-pars">';
    r.parcels.forEach(function (p) {
      if (p.paid) { h += '<div class="ck-par"><span><b>' + E.money(p.amount) + '</b><small>' + (p.kind === 'entrada' ? 'Entrada, recebida hoje' : 'Recebido à vista') + '</small></span><span class="badge ok">Hoje</span></div>'; return; }
      var i = n++;
      h += '<div class="ck-par"><span><b>' + E.money(p.amount) + '</b><small>' + (open.length > 1 ? (i + 1) + 'ª parcela' : 'Parcela única') + '</small></span>' +
        '<label class="ck-due"><span>Vencimento</span><input type="date" data-due="' + i + '" value="' + p.due + '" aria-label="Vencimento da ' + (i + 1) + 'ª parcela"></label></div>';
    });
    return h + '</div>';
  }
  function ckBodyHTML() {
    var d = ui.sale, total = saleTotalNow(), q = saleQty();
    return '<h2 id="ck-title">Finalizar venda</h2>' +
      '<div class="ck-sum" id="ckSum"><span><b>' + esc(saleCustName()) + '</b><small>' + fin(q) + ' ' + plural(q, 'cesta', 'cestas') + ' × ' + E.money(E.parseNum(d.price)) + ' · ' + E.fdate(d.date) + '</small></span><strong>' + E.money(total) + '</strong></div>' +
      '<span class="pos-lbl">Como o cliente vai pagar?</span><div id="ckTerm">' + saleTermHTML() + '</div>' +
      '<div id="ckParcels">' + ckParcelsHTML() + '</div><div id="payBox">' + payBoxHTML() + '</div>' +
      '<div id="ckMsg">' + msgHTML('sale') + '</div>' +
      '<div class="actions"><button type="button" class="btn big" data-act="sale-confirm">Confirmar venda</button><button type="button" class="btn ghost" data-act="sale-cancel">Voltar e editar</button></div>';
  }
  function ckDoneHTML() {
    var r = E.saleReceipt(S, ui.saleModal.id, E.today()); if (!r) return '';
    var first = String(r.customer.name).split(' ')[0];
    return '<div class="done-ic" aria-hidden="true">✓</div><h2 id="ck-title">Venda registrada</h2><p class="sub">Nº ' + esc(r.number) + ' · ' + esc(r.customer.name) + '</p>' +
      '<div class="ck-sum"><span><b>' + fin(r.qty) + ' ' + plural(r.qty, 'cesta', 'cestas') + '</b><small>' + E.money(r.price) + ' cada · ' + E.fdate(r.date) + '</small></span><strong>' + E.money(r.total) + '</strong></div>' +
      '<div class="ck-pars">' + r.parcels.map(function (p) {
        var paid = p.status === 'Recebida';
        return '<div class="ck-par"><span><b>' + E.money(p.amount) + '</b><small>' + esc(p.label) + (paid ? '' : ' · vence ' + E.fdate(p.due)) + '</small></span><span class="badge ' + (paid ? 'ok' : 'info') + '">' + (paid ? 'Recebida' : 'A receber') + '</span></div>';
      }).join('') + '</div>' +
      '<div class="actions"><button type="button" class="btn big" data-act="sale-done-receipt">' + (r.customer.phone ? 'Enviar comprovante para ' + esc(first) : 'Ver comprovante') + '</button>' +
      '<button type="button" class="btn ghost" data-act="sale-done-new">Nova venda</button><button type="button" class="btn ghost" data-act="sale-done-list">Ver vendas feitas</button></div>';
  }
  function renderSaleModal() {
    var root = $('#saleModal'), m = ui.saleModal;
    if (!root) { root = document.createElement('div'); root.id = 'saleModal'; document.body.appendChild(root); }
    if (!m) { root.innerHTML = ''; root.hidden = true; if (!ui.rcpt && !ui.payDlg) document.body.classList.remove('modal-open'); return; }
    root.hidden = !!ui.rcpt; document.body.classList.add('modal-open');
    root.innerHTML = '<div class="scrim" data-act="' + (m.step === 'done' ? 'sale-done-new' : 'sale-cancel') + '"></div><div class="sheet' + (m.step === 'done' ? ' done' : '') + '" role="dialog" aria-modal="true" aria-labelledby="ck-title">' + (m.step === 'done' ? ckDoneHTML() : ckBodyHTML()) + '</div>';
  }
  function refreshCheckout() { var p = $('#ckParcels'), b = $('#payBox'), s = $('#ckSum'); if (p) p.innerHTML = ckParcelsHTML(); if (b) b.innerHTML = payBoxHTML(); if (s) { var t = s.querySelector('strong'); if (t) t.textContent = E.money(saleTotalNow()); } }
  /* 1º passo: confere a venda; se estiver tudo certo, abre o fechamento */
  function submitSale() {
    var res = E.makeSale(S, saleInput(null));
    if (res.errors.length) { setMsg('sale', 'bad', res.errors); var m = $('#saleMsg'); if (m) m.innerHTML = msgHTML('sale'); return; }
    setMsg('sale', null); var m1 = $('#saleMsg'); if (m1) m1.innerHTML = '';
    ui.saleModal = { step: 'checkout' }; renderSaleModal();
    var f = document.querySelector('#saleModal [data-act="sale-confirm"]'); if (f) f.focus();
  }
  /* 2º passo: grava a venda */
  function confirmSale() {
    var d = ui.sale, cash = saleCashNow(), pay = null;
    if (cash > 0) {
      var sp = E.splitPay(cash, d.payMode, d.payPix);
      if (sp.error) { setMsg('sale', 'bad', sp.error); var m0 = $('#ckMsg'); if (m0) m0.innerHTML = msgHTML('sale'); return; }
      pay = sp.splits;
    }
    var res = E.makeSale(S, saleInput(pay));
    if (res.errors.length) { setMsg('sale', 'bad', res.errors); var m = $('#ckMsg'); if (m) m.innerHTML = msgHTML('sale'); return; }
    if (res.newCustomer) S.customers.push(res.newCustomer);
    S.sales.push(res.sale);
    if (pay) rememberPayMode(d.payMode);
    setMsg('sale', null); ui.sale = null;
    ui.saleModal = { step: 'done', id: res.sale.id };
    commit(); renderSaleModal();
  }

  /* ---------- CLIENTES ---------- */
  function newCustDraft() { return { id: null, name: '', phone: '', address: '', note: '', vars: {}, modsStr: {} }; }
  function custDraftFrom(c) {
    var ms = {}, vars = {};
    Object.keys(c.mods || {}).forEach(function (pid) { var p = prod(pid); if (p && !p.group) ms[pid] = fin(c.mods[pid]); });
    E.groupKeys(S).forEach(function (k) {
      if (E.groupMembers(S, k).some(function (p) { return c.mods && c.mods[p.id] != null; })) { var m = E.detectGroup(S, k, c.mods || {}); if (m !== 'mix') vars[k] = m; }
    });
    return { id: c.id, name: c.name, phone: c.phone, address: c.address, note: c.note, vars: vars, modsStr: ms };
  }
  function custPrefText(c) {
    var parts = [];
    E.groupKeys(S).forEach(function (k) {
      if (E.groupMembers(S, k).some(function (p) { return c.mods[p.id] != null; })) { var m = E.detectGroup(S, k, c.mods); if (m !== 'mix') parts.push(groupLabel(k) + ': só ' + (prod(m) || {}).name); }
    });
    Object.keys(c.mods).forEach(function (pid) {
      var p = prod(pid); if (!p || p.group) return;
      parts.push(E.num(c.mods[pid]) === 0 ? 'sem ' + p.name : p.name + ': ' + fin(c.mods[pid]));
    });
    return parts.join('; ');
  }

  function saleStatusBadge(s, hoje) {
    var open = 0, late = false;
    s.parcels.forEach(function (p) { open += E.aberto(p); if (E.isOverdue(p, hoje)) late = true; });
    if (open <= 0.004) return badge('ok', 'Recebida');
    return late ? badge('bad', 'Atrasada') : badge('info', 'A receber ' + E.money(open));
  }
  function custRowHTML(r) {
    var c = r.c;
    return '<button type="button" class="crow" data-act="open-cust" data-id="' + c.id + '"><span class="cn"><b>' + esc(c.name) + '</b><small>' + (c.phone ? esc(c.phone) : 'Sem telefone') + '</small></span>' +
      '<span class="cv">' + (r.bal.open > 0 ? '<b>' + E.money(r.bal.open) + '</b>' + (r.bal.late > 0 ? badge('bad', 'Atrasado') : badge('info', 'Em dia')) : badge('ok', 'Sem saldo')) + '</span><i aria-hidden="true">›</i></button>';
  }
  function openCust(id) { go('clientes'); ui.custOpen = id; render(); window.scrollTo(0, 0); }
  function openSale(id) { go('vendas', 'feitas'); ui.saleOpen = id; render(); window.scrollTo(0, 0); }

  function viewClientes() {
    if (ui.custOpen && E.byId(S.customers, ui.custOpen)) return custDetailHTML(ui.custOpen);
    ui.custOpen = null;
    var cash = E.cash(S), hoje = E.today();
    var rows = S.customers.map(function (c) { return { c: c, bal: E.customerBalance(S, c.id, hoje) }; });
    rows.sort(function (a, b) { return a.c.name.localeCompare(b.c.name, 'pt-BR'); });
    var h = '<div class="grid two"><section class="card"><h2>A receber</h2><div class="big">' + E.money(cash.open) + '</div></section>' +
      '<section class="card"><h2>Atrasado</h2><div class="big" style="color:' + (cash.late > 0 ? 'var(--bad)' : 'inherit') + '">' + E.money(cash.late) + '</div></section></div>';
    h += '<section class="card" style="margin-top:12px"><div class="cardhead"><h2>Clientes' + (rows.length ? ' <small>(' + rows.length + ')</small>' : '') + '</h2><button class="btn small ghost" data-act="new-cust">+ Novo cliente</button></div>';
    if (!rows.length) h += '<div class="empty">Nenhum cliente cadastrado. Eles são criados ao registrar a primeira venda ou em "Novo cliente".</div>';
    else h += '<div class="crows">' + rows.map(custRowHTML).join('') + '</div>';
    return h + '</section>';
  }

  function custDetailHTML(id) {
    var c = E.byId(S.customers, id), hoje = E.today(), bal = E.customerBalance(S, id, hoje), pref = custPrefText(c);
    var sales = S.sales.filter(function (x) { return x.customerId === id; }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    var bought = 0; sales.forEach(function (x) { bought += E.saleTotal(x); });
    var parcels = E.allParcels(S).filter(function (x) { return x.customerId === id && E.isOpen(x.parcel); }).sort(function (a, b) { return a.parcel.due < b.parcel.due ? -1 : a.parcel.due > b.parcel.due ? 1 : 0; });
    var h = '<button type="button" class="back" data-act="close-cust">‹ Clientes</button>';
    h += '<section class="card"><h2>' + esc(c.name) + '</h2>' +
      '<div class="cinfo">' + (c.phone ? '<a href="tel:' + esc(String(c.phone).replace(/[^\d+]/g, '')) + '">' + esc(c.phone) + '</a>' : '<small>Sem telefone</small>') +
      (c.address ? '<small>' + esc(c.address) + '</small>' : '') + (c.note ? '<small>' + esc(c.note) + '</small>' : '') + (pref ? '<small>Cesta própria: ' + esc(pref) + '</small>' : '') + '</div>' +
      '<div class="actions"><button class="btn small ghost" data-act="edit-cust" data-id="' + c.id + '">Editar cadastro</button>' +
      (c.phone ? '<a class="btn small ghost" target="_blank" rel="noopener" href="' + waLink(c.phone, '') + '">WhatsApp</a>' : '') + '</div></section>';
    h += '<section class="card"><div class="kpis three"><div class="kpi"><b>' + E.money(bal.open) + '</b><span>Em aberto</span></div>' +
      '<div class="kpi"><b style="color:' + (bal.late > 0 ? 'var(--bad)' : 'inherit') + '">' + E.money(bal.late) + '</b><span>Atrasado</span></div>' +
      '<div class="kpi"><b>' + E.money(bought) + '</b><span>Total comprado</span></div></div></section>';
    if (bal.open > 0) {
      h += '<section class="card"><h2>Receber pagamento</h2><div class="row" style="align-items:end"><div class="field" style="margin:0"><label for="rc-' + c.id + '">Valor recebido (R$)</label><input id="rc-' + c.id + '" type="text" inputmode="decimal" placeholder="0,00"></div>' +
        '<button class="btn" data-act="recv-customer" data-id="' + c.id + '">Receber</button></div><div id="rcmsg-' + c.id + '"></div><small>O valor abate as parcelas mais antigas primeiro.</small>' +
        '<div class="crows" style="margin-top:10px">' + parcels.map(function (x) {
          return '<div class="prow"><span class="pn"><b>' + E.money(E.aberto(x.parcel)) + '</b><small>Venda de ' + E.fdate(x.sale.date) + ' · vence ' + E.fdate(x.parcel.due) + '</small></span><span class="pv">' +
            E.parcelStatus(x.parcel).map(function (st) { return badge(st.cls, st.text); }).join(' ') + '</span></div>';
        }).join('') + '</div></section>';
    }
    h += '<section class="card"><h2>Compras <small>(' + sales.length + ')</small></h2>';
    h += sales.length ? '<div class="crows">' + sales.map(function (x) {
      return '<button type="button" class="crow" data-act="open-sale" data-id="' + x.id + '"><span class="cn"><b>' + E.fdate(x.date) + '</b><small>' + fin(x.qty) + ' ' + plural(x.qty, 'cesta', 'cestas') + '</small></span><span class="cv"><b>' + E.money(E.saleTotal(x)) + '</b>' + saleStatusBadge(x, hoje) + '</span><i aria-hidden="true">›</i></button>';
    }).join('') + '</div>' : '<div class="empty">Ainda não comprou nada.</div>';
    h += '</section>';
    h += '<div class="actions dangerzone"><button class="btn small danger" data-act="del" data-kind="customer" data-id="' + c.id + '" data-label="Excluir cliente">Excluir cliente</button></div>';
    return h;
  }

  /* cadastro de clientes (módulo Cadastros) */
  function clientesCadHTML() {
    var cd = ui.cust, h = '';
    if (cd) {
      h += '<section class="card" id="custForm"><h2>' + (cd.id ? 'Editar cliente' : 'Novo cliente') + '</h2><form id="custFormEl" novalidate>' +
        '<div class="field"><label for="c-name">Nome</label><input id="c-name" type="text" data-bind="cust.name" value="' + esc(cd.name) + '"></div>' +
        '<div class="row"><div class="field"><label for="c-phone">Telefone</label><input id="c-phone" type="tel" data-bind="cust.phone" value="' + esc(cd.phone) + '"></div>' +
        '<div class="field"><label for="c-addr">Endereço</label><input id="c-addr" type="text" data-bind="cust.address" value="' + esc(cd.address) + '"></div></div>' +
        '<div class="field"><label for="c-note">Observação</label><input id="c-note" type="text" data-bind="cust.note" value="' + esc(cd.note) + '"></div>' +
        E.groupKeys(S).map(function (k) {
          return '<div class="field"><label for="c-grp-' + k + '">Tipo de ' + groupLabel(k) + '</label><select id="c-grp-' + k + '" data-bind="cust.vars.' + k + '"><option value="">Sem preferência (padrão da cesta)</option>' + E.groupMembers(S, k).map(function (p) { return '<option value="' + p.id + '"' + (cd.vars[k] === p.id ? ' selected' : '') + '>Só ' + esc(p.name) + '</option>'; }).join('') + '</select></div>';
        }).join('') +
        '<details><summary>Itens que troca ou não quer</summary><small>Deixe em branco para usar o padrão. Use 0 para tirar o item.</small><div class="items-edit" style="margin-top:8px">' +
        S.products.filter(function (p) { return !p.group; }).map(function (p) {
          return '<div class="ie"><span>' + esc(p.name) + '<small>padrão ' + fin(p.perBasket) + ' ' + p.unit + '</small></span><input type="text" inputmode="decimal" aria-label="' + esc(p.name) + ' para este cliente" data-cmod="' + p.id + '" value="' + esc(cd.modsStr[p.id] || '') + '"></div>';
        }).join('') + '</div></details>' +
        '<div id="custMsg">' + msgHTML('cust') + '</div>' +
        '<div class="actions"><button type="submit" class="btn">' + (cd.id ? 'Salvar alterações' : 'Cadastrar cliente') + '</button><button type="button" class="btn ghost" data-act="cancel-cust">Cancelar</button>' +
        (cd.id ? '<button type="button" class="btn small danger" data-act="del" data-kind="customer" data-id="' + cd.id + '" data-label="Excluir">Excluir</button>' : '') + '</div></form></section>';
    }
    var rows = S.customers.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'pt-BR'); });
    h += '<section class="card"><div class="cardhead"><h2>Clientes' + (rows.length ? ' <small>(' + rows.length + ')</small>' : '') + '</h2>' + (cd ? '' : '<button class="btn small" data-act="new-cust">+ Novo cliente</button>') + '</div>';
    h += rows.length ? '<div class="crows">' + rows.map(function (c) {
      return '<button type="button" class="crow" data-act="edit-cust" data-id="' + c.id + '"><span class="cn"><b>' + esc(c.name) + '</b><small>' + [c.phone, c.address].filter(Boolean).map(esc).join(' · ') + '</small></span><i aria-hidden="true">›</i></button>';
    }).join('') + '</div>' : '<div class="empty">Nenhum cliente cadastrado.</div>';
    return h + '</section>';
  }

  function submitCust() {
    var cd = ui.cust, name = cd.name.trim();
    if (!name) { setMsg('cust', 'bad', 'Informe o nome do cliente.'); $('#custMsg').innerHTML = msgHTML('cust'); return; }
    var dup = S.customers.some(function (c) { return c.id !== cd.id && c.name.toLowerCase() === name.toLowerCase(); });
    if (dup) { setMsg('cust', 'bad', 'Já existe um cliente com esse nome.'); $('#custMsg').innerHTML = msgHTML('cust'); return; }
    var mods = {}, bad = null;
    Object.keys(cd.modsStr).forEach(function (pid) {
      var v = String(cd.modsStr[pid]).trim(); if (v === '') return;
      var n = E.parseNum(v); if (isNaN(n) || n < 0) { bad = prod(pid).name; return; }
      mods[pid] = n;
    });
    if (bad) { setMsg('cust', 'bad', 'Quantidade inválida em ' + bad + '.'); $('#custMsg').innerHTML = msgHTML('cust'); return; }
    E.groupKeys(S).forEach(function (k) { if (cd.vars[k]) E.setGroupMode(S, k, cd.vars[k], mods); });
    var rec = cd.id ? E.byId(S.customers, cd.id) : null;
    if (rec) { rec.name = name; rec.phone = cd.phone.trim(); rec.address = cd.address.trim(); rec.note = cd.note.trim(); rec.mods = mods; }
    else S.customers.push({ id: E.uid(), name: name, phone: cd.phone.trim(), address: cd.address.trim(), note: cd.note.trim(), mods: mods });
    setMsg('cust', null); ui.cust = null; toast(rec ? 'Cliente atualizado.' : 'Cliente cadastrado.'); commit();
  }

  /* ---------- COMPRAS ---------- */
  var PMODE_KEY = 'controle-cestas:pmode';
  function loadPMode() { try { return localStorage.getItem(PMODE_KEY) === 'unit' ? 'unit' : 'total'; } catch (e) { return 'total'; } }
  function newPurchRow() { return { pid: '', qty: '', total: '', qtyWhy: '', newName: '', newUnit: 'un', newCat: E.CATS[0], newPer: '' }; }
  function newPurchDraft() { return { date: E.today(), supplierId: '', note: '', payHow: 'caixa', payDue: E.addDays(E.today(), 7), mode: loadPMode(), rows: [newPurchRow()] }; }
  /* valor da linha: "total pago" ou "preço da unidade" x quantidade, conforme o modo escolhido */
  function rowTotal(r) {
    var v = E.parseNum(r.total), q = E.parseNum(r.qty);
    if (isNaN(v) || v < 0) return null;
    if (ui.purch.mode === 'unit') return isNaN(q) || q <= 0 ? null : E.round2(v * q);
    return E.round2(v);
  }
  function purchTotal() { return E.round2(ui.purch.rows.reduce(function (a, r) { var t = rowTotal(r); return a + (t == null ? 0 : t); }, 0)); }
  function prLiveHTML(r) {
    var p = prod(r.pid), q = E.parseNum(r.qty), t = rowTotal(r);
    if (!p || t == null || isNaN(q) || q <= 0) return '';
    var u = t / q, last = E.priceHistory(S, r.pid).last;
    var h = '<b>' + E.money(u) + ' por ' + esc(p.unit) + '</b> · total ' + E.money(t);
    if (last) {
      var d = u - last.unit;
      h += '<br>' + (Math.abs(d) < 0.005 ? badge('info', 'igual à última compra') : d > 0 ? badge('bad', '▲ ' + E.money(d) + ' mais caro que a última compra') : badge('ok', '▼ ' + E.money(-d) + ' mais barato que a última compra'));
    }
    return h;
  }
  function purchRowsHTML() {
    var rows = ui.purch.rows, mode = ui.purch.mode;
    return rows.map(function (r, i) {
      var opts = '<option value="">Escolha o produto…</option>' + E.CATS.map(function (cat) {
        return '<optgroup label="' + cat + '">' + S.products.filter(function (p) { return p.cat === cat; }).sort(byName).map(function (p) { return '<option value="' + p.id + '"' + (r.pid === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</optgroup>';
      }).join('') + '<option value="__new"' + (r.pid === '__new' ? ' selected' : '') + '>+ Item novo…</option>';
      var p = prod(r.pid), unit = p ? p.unit : (r.pid === '__new' ? r.newUnit : 'un');
      var last = p ? E.priceHistory(S, p.id).last : null, pk = p ? packBase(p.id) : { base: 1, why: '' };
      var h = '<div class="pitem"><div class="pitem-head"><label for="pr-p' + i + '">Item ' + (i + 1) + '</label>' + (rows.length > 1 ? '<button type="button" class="link-btn" data-act="rm-row" data-i="' + i + '" aria-label="Remover o item ' + (i + 1) + '">Remover</button>' : '') + '</div>' +
        '<div class="field" style="margin:0"><select id="pr-p' + i + '" data-row="' + i + '" data-f="pid">' + opts + '</select></div>';
      if (r.pid === '__new') {
        h += '<div class="row one"><div class="field" style="margin:10px 0 0"><label>Nome do item novo</label><input type="text" autocomplete="off" data-row="' + i + '" data-f="newName" value="' + esc(r.newName) + '"></div></div>' +
          '<div class="row"><div class="field" style="margin:10px 0 0"><label>Unidade</label><select data-row="' + i + '" data-f="newUnit"><option value="un"' + (r.newUnit === 'un' ? ' selected' : '') + '>un</option><option value="kg"' + (r.newUnit === 'kg' ? ' selected' : '') + '>kg</option></select></div>' +
          '<div class="field" style="margin:10px 0 0"><label>Categoria</label><select data-row="' + i + '" data-f="newCat">' + E.CATS.map(function (c) { return '<option' + (r.newCat === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div></div>' +
          '<div class="row one"><div class="field" style="margin:10px 0 0"><label>Qtd em cada cesta</label><input type="text" inputmode="decimal" autocomplete="off" placeholder="0" data-row="' + i + '" data-f="newPer" value="' + esc(r.newPer) + '"></div></div><small>Use "Qtd em cada cesta" para itens que fazem parte da cesta, como sacola. Deixe 0 se for só um item extra.</small>';
      }
      if (last) {
        h += '<p class="lastbuy">Última compra: <b>' + E.money(last.unit) + ' por ' + esc(unit) + '</b> (' + fin(last.qty) + ' ' + esc(unit) + ' por ' + E.money(last.total) + ')' + (supName(last.supplierId) ? ' em ' + esc(supName(last.supplierId)) : '') + ', ' + E.fdate(last.date) + '. <button type="button" class="link-btn" data-act="pr-uselast" data-i="' + i + '">Usar esse preço</button></p>';
      }
      h += '<div class="row"><div class="field" style="margin:10px 0 0"><label for="pr-q' + i + '">Quantidade (' + esc(unit) + ')</label><input id="pr-q' + i + '" type="text" inputmode="decimal" autocomplete="off" placeholder="0" data-row="' + i + '" data-f="qty" value="' + esc(r.qty) + '"></div>' +
        '<div class="field" style="margin:10px 0 0"><label for="pr-t' + i + '">' + (mode === 'unit' ? 'Preço por ' + esc(unit) + ' (R$)' : 'Total pago (R$)') + '</label><input id="pr-t' + i + '" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" data-row="' + i + '" data-f="total" value="' + esc(r.total) + '"></div></div>';
      if (p && (pk.base > 1 || last)) {
        h += '<div class="chips" role="group" aria-label="Quantidade em fardos">' + [1, 2, 3, 5].map(function (n) { return '<button type="button" class="chip-btn" data-act="pr-packs" data-i="' + i + '" data-n="' + n + '">' + n + '× ' + (pk.why ? '<small>' + fin(n * pk.base) + ' ' + esc(unit) + '</small>' : '') + '</button>'; }).join('') + '</div>' +
          (pk.why && r.qtyWhy ? '<small class="hint">Quantidade preenchida com ' + esc(r.qtyWhy) + '. Pode mudar.</small>' : '');
      }
      return h + '<div class="live" id="pr-live-' + i + '" aria-live="polite">' + prLiveHTML(r) + '</div></div>';
    }).join('');
  }

  /* ---------- COTAR (lançar preços de comércio em comércio) ---------- */
  var PLACE_KEY = 'controle-cestas:place';
  function loadPlace() { try { return localStorage.getItem(PLACE_KEY) || ''; } catch (e) { return ''; } }
  function savePlace(v) { try { localStorage.setItem(PLACE_KEY, v); } catch (e) { /* ignore */ } }
  function quoteMatches(q) {
    var words = E.normText(q).split(' ').filter(Boolean); if (!words.length) return [];
    return S.products.filter(function (p) { var hay = E.normText(p.name + ' ' + p.cat); return words.every(function (w) { return hay.indexOf(w) >= 0; }); }).slice(0, 8);
  }
  /* "fardo" do produto: o tamanho cadastrado (caixa/fardo) ou, se não houver, a quantidade da última compra */
  function packBase(pid) {
    var p = prod(pid), bd = E.priceBoard(S, pid), q = null;
    if (p && E.num(p.packSize) > 1) return { base: E.num(p.packSize), why: p.packLabel ? p.packLabel : 'a quantidade da caixa' };
    if (bd.lastBuy) return { base: bd.lastBuy.qty, why: 'a quantidade da última compra' };
    S.quotes.forEach(function (x) { if (x.pid === pid) q = x; });
    if (q) return { base: q.qty, why: 'a quantidade da última cotação' };
    return { base: 1, why: '' };
  }
  var MODE_KEY = 'controle-cestas:qmode';
  function loadMode() { try { return localStorage.getItem(MODE_KEY) === 'total' ? 'total' : 'unit'; } catch (e) { return 'unit'; } }
  // dois jeitos de digitar: preço da unidade (o app calcula o fardo) ou valor do fardo (o app calcula a unidade)
  function quoteUnit() {
    var pr = E.parseNum(ui.quote.price), q = E.parseNum(ui.quote.qty);
    if (isNaN(pr) || pr <= 0 || isNaN(q) || q <= 0) return null;
    return ui.quote.mode === 'unit' ? pr : pr / q;
  }
  function quoteTotal() {
    var u = quoteUnit(), q = E.parseNum(ui.quote.qty);
    return u == null ? null : E.round2(u * q);
  }
  function pct1(d, ref) { return fin(Math.round(Math.abs(d) / ref * 1000) / 10) + '%'; }
  function deltaBadge(uq, ref) {
    var d = uq - ref;
    if (Math.abs(d) < 0.005) return badge('info', 'igual à cotação');
    return badge(d > 0 ? 'ok' : 'bad', d > 0 ? 'este é ' + E.money(d) + ' mais caro' : 'este é ' + E.money(-d) + ' mais barato');
  }
  function srcLabel(r) { return r.source === 'compra' ? 'compra' : 'cotação'; }
  function quoteResultHTML() {
    var p = prod(ui.quote.pid); if (!p) return '';
    var bd = E.priceBoard(S, p.id), uq = quoteUnit(), h = '';
    if (uq != null) {
      h += '<div class="total">' + E.money(uq) + ' por ' + esc(p.unit) + '</div><div class="total sub2">Total para ' + fin(E.parseNum(ui.quote.qty)) + ' ' + esc(p.unit) + ' = <b>' + E.money(quoteTotal()) + '</b></div>';
      if (bd.rows.length) {
        var best = bd.best, d = uq - best.unit;
        h += '<div class="msg ' + (d > 0.005 ? 'bad' : 'ok') + '">' + (d > 0.005
          ? 'Mais caro que o menor preço que você já tem: ' + E.money(best.unit) + ' em ' + esc(best.place) + ' (' + E.money(d) + ' a mais, ' + pct1(d, best.unit) + ').'
          : Math.abs(d) <= 0.005 ? 'Igual ao menor preço que você já tem (' + esc(best.place) + ').' : 'É o menor preço até agora! ' + E.money(-d) + ' abaixo de ' + esc(best.place) + ' (' + pct1(d, best.unit) + ').') + '</div>';
        if (bd.lastBuy && bd.lastBuy.unit !== best.unit) {
          var dl = uq - bd.lastBuy.unit;
          h += '<div class="msg ' + (Math.abs(dl) < 0.005 ? 'info' : dl > 0 ? 'warn' : 'ok') + '">Último custo pago: ' + E.money(bd.lastBuy.unit) + ' — a cotação está ' + (Math.abs(dl) < 0.005 ? 'igual' : E.money(Math.abs(dl)) + (dl > 0 ? ' mais cara' : ' mais barata')) + '.</div>';
        }
      } else h += '<div class="msg info">Primeiro preço desse produto. Salve para comparar nos próximos comércios.</div>';
    }
    if (bd.rows.length) {
      h += '<h3 style="margin:14px 0 4px">Preços que você já tem</h3>' + bd.rows.map(function (r, i) {
        return '<div class="line"><span><b>' + esc(r.place) + '</b> ' + (bd.rows.length > 1 && i === 0 ? badge('ok', 'menor') : '') + '<br><small>' + srcLabel(r) + ' · ' + E.fdate(r.date) + ' · ' + fin(r.qty) + ' ' + esc(p.unit) + ' por ' + E.money(r.total) + '</small>' +
          (uq != null ? '<br>' + deltaBadge(uq, r.unit) : '') + '</span><span><b>' + E.money(r.unit) + '</b><br><small>por ' + esc(p.unit) + '</small></span></div>';
      }).join('');
    } else if (uq == null) h += '<div class="empty">Ainda não há preço desse produto.</div>';
    return h;
  }
  function quoteHTML() {
    var qd = ui.quote, p = prod(qd.pid);
    if (!p) {
      qd.pid = '';
      if (!qd.q.trim()) return '<p class="muted">Digite o nome do produto, informe o preço e salve. Depois é só passar para o próximo.</p>';
      var ms = quoteMatches(qd.q);
      if (!ms.length) return '<div class="empty">Nenhum produto encontrado.</div>';
      return '<div class="list">' + ms.map(function (x) {
        var bd = E.priceBoard(S, x.id);
        return '<button type="button" class="btn ghost pick" data-act="quote-pick" data-id="' + x.id + '"><span>' + esc(x.name) + '</span>' + (bd.best ? '<small>menor: ' + E.money(bd.best.unit) + '</small>' : '') + '</button>';
      }).join('') + '</div>';
    }
    return '<div class="qhead"><b>' + esc(p.name) + '</b><button type="button" class="btn small ghost" data-act="quote-clear">Trocar produto</button></div>' +
      '<form id="quoteForm" novalidate><div class="seg" role="tablist"><button type="button" role="tab" aria-selected="' + (qd.mode === 'unit') + '" data-act="quote-mode" data-mode="unit">Por unidade</button><button type="button" role="tab" aria-selected="' + (qd.mode === 'total') + '" data-act="quote-mode" data-mode="total">Por fardo</button></div>' +
      '<div class="row bigin"><div class="field"><label for="q-price">' + (qd.mode === 'unit' ? 'Preço por ' + esc(p.unit) + ' (R$)' : 'Valor do fardo (R$)') + '</label><input id="q-price" type="text" inputmode="decimal" enterkeyhint="done" data-quote="price" value="' + esc(qd.price) + '" placeholder="' + (qd.mode === 'unit' ? '6,11' : '73,34') + '"></div>' +
      '<div class="field"><label for="q-qty">Para quantos ' + esc(p.unit) + '?</label><input id="q-qty" type="text" inputmode="decimal" enterkeyhint="done" data-quote="qty" value="' + esc(qd.qty) + '"></div></div>' +
      (function () {
        var pb = packBase(p.id), cur = E.parseNum(qd.qty);
        if (!(pb.base > 1)) return '';
        return '<div class="chips" role="group" aria-label="Quantos fardos">' + [1, 2, 3, 5].map(function (n) {
          var on = !isNaN(cur) && Math.abs(cur - n * pb.base) < 1e-9;
          return '<button type="button" class="chip-btn' + (on ? ' on' : '') + '" data-act="quote-packs" data-n="' + n + '" aria-pressed="' + on + '">' + n + '×</button>';
        }).join('') + '<small>' + (qd.qtyWhy ? esc(qd.qtyWhy) + ': ' : '1× = ') + fin(pb.base) + ' ' + esc(p.unit) + '. Ou digite outra quantidade.</small></div>';
      })() +
      '<div id="quoteResult">' + quoteResultHTML() + '</div>' +
      '<button type="submit" class="btn wide big">' + (ui.place.trim() ? 'Salvar cotação em ' + esc(ui.place.trim()) : 'Informe o comércio acima') + '</button></form>';
  }
  function submitQuote() {
    var place = ui.place.trim(), p = prod(ui.quote.pid), qty = E.parseNum(ui.quote.qty), price = quoteTotal();
    if (!place) { toast('Informe o comércio onde você está.'); $('#q-place').focus(); return; }
    if (!p) return;
    if (price == null || price <= 0) { toast('Informe o preço.'); $('#q-price').focus(); return; }
    if (isNaN(qty) || qty <= 0) { toast('Informe a quantidade.'); $('#q-qty').focus(); return; }
    S.quotes.push({ id: E.uid(), pid: p.id, place: place.slice(0, 60), price: price, qty: E.r3(qty), date: E.today() });
    ui.quote = { q: '', pid: '', price: '', qty: '1', mode: ui.quote.mode };
    toast('Salvo: ' + p.name + ', ' + E.money(price / qty) + ' por ' + p.unit + ' em ' + place);
    commit(); var qs = $('#q-search'); if (qs) qs.focus();
  }
  /* ---------- onde comprar (resultado das cotações) ---------- */
  function shopPlan() {
    var want = {}; E.replenish(S, planT(), E.derive(S)).rows.forEach(function (r) { if (r.qty > 0) want[r.pid] = r.qty; });
    return E.shoppingPlan(S, want);
  }
  function shopHTML(sp) {
    var h = '<section class="card"><h2>Onde comprar</h2>';
    if (!sp.items) return h + '<div class="empty">Lance preços em dois ou mais comércios e eu mostro onde cada item sai mais barato.</div></section>';
    h += '<div class="msg ok"><b>Comprando cada item onde é mais barato: ' + E.money(sp.total) + '</b>' + (sp.saves > 0.004 ? '<br>Você economiza ' + E.money(sp.saves) + ' em relação ao preço mais alto que viu.' : '') + '</div>';
    if (sp.compared < sp.items) h += '<p class="sub"><small>' + (sp.items - sp.compared) + ' ' + plural(sp.items - sp.compared, 'item tem', 'itens têm') + ' preço em só um lugar. Cote em outro comércio para comparar.</small></p>';
    if (sp.onePlace) h += '<p class="sub"><small>Para ir em um lugar só: ' + esc(sp.onePlace.place) + ' tem preço de tudo e sai ' + E.money(sp.onePlace.total) + (sp.onePlace.extra > 0.004 ? ' (' + E.money(sp.onePlace.extra) + ' a mais).' : '.') + '</small></p>';
    h += '<div class="list">' + sp.stores.map(function (st) {
      return '<div class="item"><div class="head"><b>' + esc(st.place) + '</b><b>' + E.money(st.total) + '</b></div><small>' + st.items.length + ' ' + plural(st.items.length, 'item', 'itens') + '</small>' +
        st.items.map(function (it) {
          return '<div class="line"><span>' + esc(it.name) + '<br><small>' + fin(it.qty) + ' ' + esc(it.unit) + ' × ' + E.money(it.unitPrice) + (it.second ? ' · ' + E.money(it.second.unit - it.unitPrice) + ' mais barato que ' + esc(it.second.place) : ' · só 1 preço') + '</small></span><span>' + E.money(it.total) + '</span></div>';
        }).join('') + '</div>';
    }).join('') + '</div>' +
      '<p class="sub" style="margin-top:8px"><small>Quantidades: o que falta para a meta de ' + fin(planT()) + ' cestas (veja em Estoque); itens sem falta usam a quantidade da cotação. Preços de compras antigas também entram na comparação.</small></p>' +
      '<div class="actions"><button class="btn" data-act="copy-shop">Copiar lista por comércio</button></div></section>';
    return h;
  }
  function shopText(sp) {
    var out = ['Onde comprar (' + E.fdate(E.today()) + ')'];
    sp.stores.forEach(function (st) {
      out.push('', st.place + ' — ' + E.money(st.total));
      st.items.forEach(function (it) { out.push('- ' + it.name + ': ' + fin(it.qty) + ' ' + it.unit + ' a ' + E.money(it.unitPrice) + ' = ' + E.money(it.total)); });
    });
    out.push('', 'Total: ' + E.money(sp.total));
    return out.join('\n');
  }

  function viewCotar() {
    if (!ui.quote) ui.quote = { q: '', pid: '', price: '', qty: '1', mode: loadMode() };
    if (ui.place == null) ui.place = loadPlace();
    var places = E.knownPlaces(S);
    var h = '<section class="card"><div class="field" style="margin:0"><label for="q-place">Comércio onde você está</label><input id="q-place" type="text" list="placeList" autocomplete="off" placeholder="Ex.: Atacadão" value="' + esc(ui.place) + '"><datalist id="placeList">' + places.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join('') + '</datalist></div></section>';
    h += '<section class="card"><h2>Lançar preço</h2><div class="field"><label for="q-search">Produto</label><input id="q-search" type="search" autocomplete="off" placeholder="Ex.: margarina" value="' + esc(ui.quote.q) + '"></div><div id="quoteOut">' + quoteHTML() + '</div></section>';

    h += shopHTML(shopPlan());

    // comparação geral: quem é mais barato em cada produto
    var rowsP = [], wins = {};
    S.products.forEach(function (p) {
      if (!S.quotes.some(function (q) { return q.pid === p.id; })) return;
      var bd = E.priceBoard(S, p.id); rowsP.push({ p: p, bd: bd });
      if (bd.rows.length > 1) wins[E.normText(bd.best.place)] = (wins[E.normText(bd.best.place)] || 0) + 1;
    });
    h += '<section class="card"><h2>Comparar</h2>';
    if (!rowsP.length) h += '<div class="empty">Salve cotações para comparar os comércios.</div>';
    else {
      var cmp = rowsP.filter(function (r) { return r.bd.rows.length > 1; }).length;
      if (cmp) h += '<p class="sub"><small>Comércio mais barato em cada produto (' + cmp + ' ' + plural(cmp, 'produto comparado', 'produtos comparados') + '):</small></p><div class="list" style="margin-bottom:12px">' +
        Object.keys(wins).sort(function (a, b) { return wins[b] - wins[a]; }).map(function (k) {
          var nm = ''; rowsP.forEach(function (r) { if (E.normText(r.bd.best.place) === k) nm = r.bd.best.place; });
          return '<div class="item"><div class="head"><b>' + esc(nm) + '</b>' + badge('ok', wins[k] + ' ' + plural(wins[k], 'produto', 'produtos')) + '</div></div>';
        }).join('') + '</div>';
      h += '<div class="list">' + rowsP.map(function (r) {
        return '<button type="button" class="btn ghost pick" data-act="quote-pick" data-id="' + r.p.id + '"><span>' + esc(r.p.name) + '</span><small>menor: ' + E.money(r.bd.best.unit) + ' em ' + esc(r.bd.best.place) + ' · ' + r.bd.rows.length + ' ' + plural(r.bd.rows.length, 'preço', 'preços') + '</small></button>';
      }).join('') + '</div>';
    }
    h += '</section>';

    // cotações guardadas: ficam até você excluir
    h += '<section class="card"><h2>Cotações guardadas</h2><p class="sub"><small>Ficam aqui até você excluir. Depois de comprar, apague as que não precisa mais.</small></p>';
    if (!S.quotes.length) h += '<div class="empty">Nenhuma cotação guardada.</div>';
    else h += '<div class="list">' + S.quotes.slice().reverse().slice(0, 60).map(function (q) {
      var p = prod(q.pid);
      return '<div class="item"><div class="head"><b>' + esc(p ? p.name : 'Produto removido') + '</b><b>' + E.money(q.price / q.qty) + '</b></div>' +
        '<small>' + esc(q.place) + ' · ' + E.fdate(q.date) + ' · ' + fin(q.qty) + ' ' + esc(p ? p.unit : '') + ' por ' + E.money(q.price) + '</small>' +
        '<div class="actions"><button class="btn small danger" data-act="del" data-kind="quote" data-id="' + q.id + '" data-label="Excluir">Excluir</button></div></div>';
    }).join('') + '</div>' + (S.quotes.length > 60 ? '<p class="sub"><small>Mostrando as 60 mais recentes.</small></p>' : '');
    return h + '</section>';
  }

  function viewCompras() {
    if (!ui.purch) ui.purch = newPurchDraft();
    var d = ui.purch;
    var pk = ui.pk || 'merc';
    var h = '<div class="seg" role="tablist" aria-label="Tipo de lançamento" style="margin:0 0 12px">' + [['merc', 'Mercadoria (estoque)'], ['desp', 'Despesa (gasto)']].map(function (x) {
      return '<button type="button" role="tab" aria-selected="' + (pk === x[0]) + '" data-act="purch-kind" data-k="' + x[0] + '">' + x[1] + '</button>';
    }).join('') + '</div>';
    if (pk === 'desp') return h + expensesHTML();
    h += '<section class="card" id="purchCard"><h2>' + (d.editId ? 'Editar compra' : d.fromExp ? 'Compra a partir de despesa' : 'Nova compra') + '</h2>' + (d.editId ? '<p class="sub"><small>Altere data, itens, quantidades e valores. O estoque e o custo dos produtos se ajustam sozinhos.</small></p>' : '') + '<form id="purchForm" novalidate>' +
      '<div class="field"><label for="pu-date">Data</label><input id="pu-date" type="date" data-bind="purch.date" value="' + d.date + '"></div>' +
      '<div class="field"><label for="pu-sup">Fornecedor</label><select id="pu-sup" data-bind="purch.supplierId"><option value="">Sem fornecedor</option>' + S.suppliers.map(function (s) { return '<option value="' + s.id + '"' + (d.supplierId === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="pu-how">Pagamento</label><select id="pu-how" data-bind="purch.payHow"' + (d.editId && d.payHow === 'prazo' ? ' disabled' : '') + '>' + [['caixa', 'Já paguei com o dinheiro da feira'], ['pessoal', 'Já paguei do meu bolso']].concat(!d.editId || d.payHow === 'prazo' ? [['prazo', 'Vou pagar depois (conta a pagar)']] : []).map(function (o) { return '<option value="' + o[0] + '"' + (d.payHow === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field" id="payDueBox"' + (d.payHow === 'prazo' ? '' : ' hidden') + '><label for="pu-due">Vence em</label><input id="pu-due" type="date" data-bind="purch.payDue" value="' + d.payDue + '"></div>' +
      '<div class="field"><label for="pu-note">Observação (opcional)</label><input id="pu-note" type="text" autocomplete="off" placeholder="Ex.: pedido 123, pago no débito" data-bind="purch.note" value="' + esc(d.note) + '"></div>' +
      '<div class="field"><label id="pmode-l">Como você vai digitar o valor?</label><div class="seg" role="radiogroup" aria-labelledby="pmode-l" style="margin:0">' +
      [['total', 'Total pago'], ['unit', 'Preço da unidade']].map(function (m) { return '<button type="button" role="radio" aria-checked="' + (d.mode === m[0]) + '" data-act="pr-mode" data-m="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div></div>' +
      '<div id="purchRows">' + purchRowsHTML() + '</div>' +
      '<div class="actions"><button type="button" class="btn ghost" data-act="add-row">+ Adicionar item</button></div>' +
      '<small>Item novo da cesta (como sacola)? Escolha "+ Item novo…" no produto e informe a quantidade em cada cesta. Dá para ajustar depois em Cadastros.</small>' +
      '<div id="purchMsg">' + msgHTML('purch') + '</div>' +
      '<div class="stickybar"><div class="sb-total"><small>Total da compra</small><b id="purchTotal">' + E.money(purchTotal()) + '</b></div><button type="submit" class="btn big">' + (d.editId ? 'Salvar alterações' : 'Registrar compra') + '</button></div>' + (d.editId || d.fromExp ? '<div class="actions"><button type="button" class="btn ghost" data-act="cancel-edit-purch">' + (d.editId ? 'Cancelar edição' : 'Cancelar (a despesa continua)') + '</button></div>' : '') + '</form></section>';

    var list = S.purchases.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    h += '<section class="card"><h2>Compras registradas</h2>';
    var bulkP = S.purchases.filter(function (x) { return !x.payableId && x.paidFrom !== 'pessoal'; }).length, bulkX = S.expenses.filter(function (x) { return x.from !== 'pessoal'; }).length, bulkN = bulkP + bulkX;
    if (bulkN) h += '<p class="sub"><small>Tudo o que você já gastou saiu do seu bolso? Marque as compras e despesas como "do meu bolso": o caixa não desconta e o valor conta como investimento seu no negócio.</small></p><div class="actions" style="margin:0 0 12px"><button class="btn small ' + (ui.armBulk ? 'danger armed' : 'ghost') + '" data-act="purch-bulk">' + (ui.armBulk ? 'Confirmar: marcar ' + bulkP + ' ' + plural(bulkP, 'compra', 'compras') + ' e ' + bulkX + ' ' + plural(bulkX, 'despesa', 'despesas') + ' como do meu bolso' : 'Marcar tudo como do meu bolso') + '</button></div>';
    if (!list.length) h += '<div class="empty">Nenhuma compra registrada ainda.</div>';
    else h += '<div class="list">' + list.map(function (pu) {
      var total = E.round2(pu.items.reduce(function (a, i) { return a + E.num(i.total); }, 0));
      return '<div class="item"><div class="head"><b>' + E.fdate(pu.date) + (supName(pu.supplierId) ? ' · ' + esc(supName(pu.supplierId)) : '') + '</b><b>' + E.money(total) + '</b></div>' + purchPayBadge(pu) +
        (pu.note ? '<small>' + esc(pu.note) + '</small>' : '') +
        pu.items.map(function (it) {
          var p = prod(it.pid), uc = E.num(it.qty) > 0 ? E.num(it.total) / E.num(it.qty) : 0;
          return '<div class="line"><span>' + esc(p ? p.name : 'Produto removido') + '<br><small>' + fin(it.qty) + ' ' + (p ? p.unit : '') + ' · ' + E.money(uc) + ' por ' + (p ? p.unit : 'un') + '</small></span><span>' + E.money(it.total) + '</span></div>';
        }).join('') +
        convBoxHTML(pu) + '<div class="actions"><button class="btn small" data-act="edit-purch" data-id="' + pu.id + '">Editar</button>' + (pu.payableId ? '' : '<button class="btn small ghost" data-act="to-expense" data-id="' + pu.id + '">Foi despesa</button><button class="btn small ghost" data-act="purch-from" data-id="' + pu.id + '">' + (pu.paidFrom === 'pessoal' ? 'Foi do caixa da feira' : 'Foi do meu bolso') + '</button>') + '<button class="btn small danger" data-act="del" data-kind="purchase" data-id="' + pu.id + '" data-label="Excluir compra">Excluir compra</button></div></div>';
    }).join('') + '</div>';
    h += '</section>';
    return h;
  }


  function purchDraftFrom(pu) {
    var bill = pu.payableId ? E.byId(S.payables, pu.payableId) : null;
    return { editId: pu.id, date: pu.date, supplierId: pu.supplierId || '', note: pu.note || '', payHow: bill ? 'prazo' : (pu.paidFrom === 'pessoal' ? 'pessoal' : 'caixa'), payDue: bill ? bill.due : E.addDays(E.today(), 7), mode: 'total',
      rows: pu.items.map(function (it) { var r = newPurchRow(); r.pid = it.pid; r.qty = fin(it.qty); r.total = fin(it.total); return r; }) };
  }
  /* compra lançada por engano: vira despesa (sai do estoque e do custo dos produtos) */
  function convBoxHTML(pu) {
    var c = ui.conv; if (!c || c.id !== pu.id) return '';
    return '<div class="payline editing" style="margin:8px 0"><b>Transformar em despesa de ' + E.money(E.purchaseTotal(pu)) + '</b><br><small>Os itens saem do estoque e do custo dos produtos. O valor passa a contar como despesa.</small>' +
      '<div class="field" style="margin:8px 0"><label for="cv-cat">Tipo de despesa</label><select id="cv-cat" data-bind="conv.cat">' + E.EXPENSE_CATS.map(function (x) { return '<option' + (c.cat === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
      '<div class="field" style="margin:0 0 8px"><label for="cv-m">Como foi pago?</label><select id="cv-m" data-bind="conv.method"><option value="pix"' + (c.method === 'pix' ? ' selected' : '') + '>Pix</option><option value="dinheiro"' + (c.method === 'dinheiro' ? ' selected' : '') + '>Dinheiro</option></select></div>' +
      '<div class="actions" style="margin:0"><button type="button" class="btn small" data-act="conv-ok">Transformar em despesa</button><button type="button" class="btn small ghost" data-act="conv-cancel">Cancelar</button></div></div>';
  }

  function purchPayBadge(pu) {
    if (pu.payableId) { var b = E.byId(S.payables, pu.payableId); if (b) return '<div style="margin:4px 0">' + E.billStatus(b, E.today()).map(function (x) { return badge(x.cls, 'Conta: ' + x.text); }).join(' ') + ' <small>vence ' + E.fdate(b.due) + '</small></div>'; }
    return pu.paidFrom === 'pessoal' ? '<div style="margin:4px 0">' + badge('info', 'Pago do meu bolso') + '</div>' : '';
  }
  function submitPurch() {
    var d = ui.purch, errs = [], items = [], newProds = [];
    if (!E.validISO(d.date)) errs.push('Informe a data da compra.');
    if (d.payHow === 'prazo' && !E.validISO(d.payDue)) errs.push('Informe quando a compra vence.');
    d.rows.forEach(function (r, i) {
      var n = i + 1, empty = !r.pid && r.qty === '' && r.total === '';
      if (empty && d.rows.length > 1) return;
      var qty = E.parseNum(r.qty), total = rowTotal(r), pid = r.pid;
      if (!pid) { errs.push('Linha ' + n + ': escolha o produto.'); return; }
      if (isNaN(qty) || qty <= 0) { errs.push('Linha ' + n + ': informe uma quantidade maior que zero.'); return; }
      if (total == null) { errs.push('Linha ' + n + ': informe ' + (d.mode === 'unit' ? 'o preço da unidade.' : 'o total pago.')); return; }
      if (pid === '__new') {
        var nm = r.newName.trim();
        if (!nm) { errs.push('Linha ' + n + ': informe o nome do item novo.'); return; }
        var ex = S.products.filter(function (p) { return p.name.toLowerCase() === nm.toLowerCase(); })[0] || newProds.filter(function (p) { return p.name.toLowerCase() === nm.toLowerCase(); })[0];
        if (ex) pid = ex.id; else { var per = r.newPer === '' ? 0 : E.parseNum(r.newPer); if (isNaN(per) || per < 0) { errs.push('Linha ' + n + ': quantidade em cada cesta inválida.'); return; }
          var np = { id: E.uid(), name: nm, cat: r.newCat, unit: r.newUnit, perBasket: per, packSize: 1, packLabel: '' }; newProds.push(np); pid = np.id; }
      }
      items.push({ pid: pid, qty: qty, total: E.round2(total) });
    });
    if (!errs.length && !items.length) errs.push('Adicione ao menos um item.');
    if (errs.length) { setMsg('purch', 'bad', errs); $('#purchMsg').innerHTML = msgHTML('purch'); return; }
    if (d.editId) {
      var old = E.byId(S.purchases, d.editId); if (!old) { ui.purch = null; return render(); }
      var nt = E.round2(items.reduce(function (a, i) { return a + i.total; }, 0)), bl = old.payableId ? E.byId(S.payables, old.payableId) : null;
      if (bl && (bl.pays || []).length && Math.abs(nt - bl.amount) > 0.004) { setMsg('purch', 'bad', 'Esta compra já tem pagamento na conta a pagar. Desfaça o pagamento em Contas antes de mudar o valor.'); $('#purchMsg').innerHTML = msgHTML('purch'); return; }
      newProds.forEach(function (p) { S.products.push(p); });
      old.date = d.date; old.supplierId = d.supplierId; old.note = d.note.trim(); old.items = items;
      if (bl) { bl.amount = nt; if (!(bl.pays || []).length && E.validISO(d.payDue)) bl.due = d.payDue; bl.desc = 'Compra de ' + E.fdate(d.date) + (supName(d.supplierId) ? ' · ' + supName(d.supplierId) : ''); bl.supplierId = d.supplierId; }
      else if (d.payHow === 'pessoal') old.paidFrom = 'pessoal'; else delete old.paidFrom;
      setMsg('purch', null); ui.purch = null; toast('Compra atualizada.'); commit(); return;
    }
    newProds.forEach(function (p) { S.products.push(p); });
    var pu = { id: E.uid(), date: d.date, supplierId: d.supplierId, note: d.note.trim(), items: items };
    if (d.payHow === 'pessoal') pu.paidFrom = 'pessoal';
    if (d.payHow === 'prazo') {
      var bill = { id: E.uid(), desc: 'Compra de ' + E.fdate(d.date) + (supName(d.supplierId) ? ' · ' + supName(d.supplierId) : ''), supplierId: d.supplierId, amount: E.purchaseTotal(pu), due: d.payDue, note: '', purchaseId: pu.id, pays: [] };
      pu.payableId = bill.id; S.payables.push(bill);
    }
    if (d.fromExp) S.expenses = S.expenses.filter(function (x) { return x.id !== d.fromExp; });
    S.purchases.push(pu);
    var bought = {}; items.forEach(function (i) { bought[i.pid] = 1; });
    var nq = S.quotes.filter(function (q) { return bought[q.pid]; }).length;
    setMsg('purch', null); ui.purch = null; toast((d.fromExp ? 'Despesa convertida em compra.' : 'Compra registrada.') + (nq ? ' Há ' + nq + ' ' + plural(nq, 'cotação', 'cotações') + ' desses produtos em Cotar para você revisar.' : '')); commit();
  }

  /* ---------- CONTAS (a pagar, retiradas, caixa) ---------- */
  function newBillDraft() { return { desc: '', amount: '', due: E.addDays(E.today(), 7), supplierId: '', note: '' }; }
  function newWdDraft() { return { date: E.today(), amount: '', note: '', method: lastPayMode() }; }
  function billItemHTML(b, hoje) {
    var open = E.billIsOpen(b), sup = supName(b.supplierId);
    var st = E.billStatus(b, hoje).map(function (x) { return badge(x.cls, x.text); }).join(' ');
    var paid = (b.pays || []).map(function (x) { return (E.fdate(x.date) + (x.method ? ' · ' + E.methodName(x.method) : '') + (x.from === 'pessoal' ? ' · do meu bolso' : ' · do caixa')); }).join('; ');
    return '<div class="item"><div class="head"><b>' + esc(b.desc) + '</b><b>' + E.money(open ? E.billOpen(b) : b.amount) + '</b></div>' +
      '<small>' + (sup ? esc(sup) + ' · ' : '') + 'vence ' + E.fdate(b.due) + (b.note ? ' · ' + esc(b.note) : '') + '</small><div style="margin:6px 0">' + st + '</div>' +
      (!open && paid ? '<small>Pago em ' + esc(paid) + '</small>' : '') +
      '<div class="actions">' + (open ? '<button class="btn small" data-act="pay-bill" data-id="' + b.id + '">Pagar</button>' : '<button class="btn small ghost" data-act="undo-bill" data-id="' + b.id + '">Desfazer pagamento</button>') +
      '<button class="btn small danger" data-act="del" data-kind="bill" data-id="' + b.id + '" data-label="Excluir conta">Excluir conta</button></div></div>';
  }
  function viewContas() {
    if (!ui.bill) ui.bill = newBillDraft();
    if (!ui.wd) ui.wd = newWdDraft();
    var hoje = E.today(), ps = E.payablesSummary(S, hoje), cf = E.cashflow(S, null, null, hoje), free = E.round2(cf.balance - ps.open);
    var sec = { caixa: '', pagar: '', desp: '', plano: '' }; var h = '<section class="card"><h2>Caixa e contas</h2><div class="kpis">' +
      '<div class="kpi ' + (cf.balance < 0 ? 'bad' : 'ok') + '"><b>' + E.money(cf.balance) + '</b><span>Em caixa agora</span></div>' +
      '<div class="kpi ' + (ps.late > 0 ? 'bad' : '') + '"><b>' + E.money(ps.open) + '</b><span>A pagar' + (ps.late > 0 ? ' (' + E.money(ps.late) + ' vencido)' : '') + '</span></div>' +
      '<div class="kpi ' + (free < 0 ? 'bad' : 'ok') + '" style="grid-column:1/-1"><b>' + E.money(Math.max(0, free)) + '</b><span>' + (free < 0 ? 'Faltam ' + E.money(-free) + ' para cobrir as contas em aberto' : 'Pode retirar para a sua conta e ainda cobrir as contas em aberto') + '</span></div></div>' +
      '<p class="sub" style="margin-top:10px"><small>Em caixa = o que você recebeu das vendas, menos compras e contas pagas com o dinheiro da feira e menos as retiradas. O que você paga do seu bolso não diminui o caixa.</small></p></section>';

    var oc = E.ownerCapital(S), ct = ui.ct || (ui.ct = { date: E.today(), amount: '', note: '', method: lastPayMode() });
    sec.caixa += h; h = '';
    h += '<section class="card"><h2>Meu dinheiro no negócio</h2><div class="kpis">' +
      '<div class="kpi"><b>' + E.money(oc.total) + '</b><span>Coloquei até agora</span></div>' +
      '<div class="kpi"><b>' + E.money(oc.withdrawn) + '</b><span>Já retirei</span></div>' +
      '<div class="kpi ' + (oc.extra > 0 ? 'ok' : oc.toRecover > 0 ? '' : 'ok') + '" style="grid-column:1/-1"><b>' + E.money(oc.extra > 0 ? oc.extra : oc.toRecover) + '</b><span>' + (oc.extra > 0 ? 'Retirado além do que você colocou (lucro)' : oc.toRecover > 0 ? 'Falta recuperar do que você colocou' : 'Tudo o que você colocou já voltou') + '</span></div></div>' +
      '<div class="lines" style="margin-top:8px"><div class="line"><span>Aportes registrados</span><span>' + E.money(oc.contributions) + '</span></div>' +
      '<div class="line"><span>Compras pagas do seu bolso <small>(' + oc.purchasesCount + ')</small></span><span>' + E.money(oc.purchases) + '</span></div>' +
      '<div class="line"><span>Contas pagas do seu bolso</span><span>' + E.money(oc.bills) + '</span></div></div>' +
      '<h3 style="margin:16px 0 4px">Colocar dinheiro no negócio</h3><p class="sub"><small>Use quando você põe dinheiro seu no caixa da feira. Compras que você pagou do bolso já contam sozinhas.</small></p><form id="ctForm" novalidate>' +
      '<div class="row"><div class="field"><label for="k-amount">Valor (R$)</label><input id="k-amount" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" data-bind="ct.amount" value="' + esc(ct.amount) + '"></div>' +
      '<div class="field"><label for="k-date">Data</label><input id="k-date" type="date" data-bind="ct.date" value="' + ct.date + '"></div></div>' +
      '<div class="field"><label id="km-l">Como foi?</label><div class="seg" role="radiogroup" aria-labelledby="km-l" style="margin:0">' + [['pix', 'Pix'], ['dinheiro', 'Dinheiro']].map(function (m) { return '<button type="button" role="radio" aria-checked="' + (ct.method === m[0]) + '" data-act="ct-method" data-m="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label for="k-note">Observação (opcional)</label><input id="k-note" type="text" autocomplete="off" placeholder="Ex.: investimento inicial" data-bind="ct.note" value="' + esc(ct.note) + '"></div>' +
      '<div id="ctMsg">' + msgHTML('ct') + '</div><div class="actions"><button type="submit" class="btn">Registrar aporte</button></div></form>' +
      (S.contributions.length ? '<h3 style="margin:16px 0 8px">Aportes feitos</h3><div class="list">' + S.contributions.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).slice(0, 10).map(function (w) {
        return '<div class="item"><div class="head"><b>' + E.fdate(w.date) + (w.method ? ' · ' + E.methodName(w.method) : '') + '</b><b>' + E.money(w.amount) + '</b></div>' + (w.note ? '<small>' + esc(w.note) + '</small>' : '') +
          '<div class="actions"><button class="btn small danger" data-act="del" data-kind="ct" data-id="' + w.id + '" data-label="Excluir aporte">Excluir aporte</button></div></div>';
      }).join('') + '</div>' : '') + '</section>';

    var bd = ui.bill;
    sec.caixa += h; h = '';
    h += '<section class="card"><h2>Nova conta a pagar</h2><form id="billForm" novalidate>' +
      '<div class="field"><label for="b-desc">O que é?</label><input id="b-desc" type="text" autocomplete="off" placeholder="Ex.: Boleto Idelvon, frete, embalagem" data-bind="bill.desc" value="' + esc(bd.desc) + '"></div>' +
      '<div class="row"><div class="field"><label for="b-amount">Valor (R$)</label><input id="b-amount" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" data-bind="bill.amount" value="' + esc(bd.amount) + '"></div>' +
      '<div class="field"><label for="b-due">Vence em</label><input id="b-due" type="date" data-bind="bill.due" value="' + bd.due + '"></div></div>' +
      '<div class="field"><label for="b-sup">Fornecedor (opcional)</label><select id="b-sup" data-bind="bill.supplierId"><option value="">Nenhum</option>' + S.suppliers.map(function (x) { return '<option value="' + x.id + '"' + (bd.supplierId === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div>' +
      '<div id="billMsg">' + msgHTML('bill') + '</div><div class="actions"><button type="submit" class="btn">Salvar conta</button></div></form></section>';

    var open = S.payables.filter(E.billIsOpen).sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; });
    var paid = S.payables.filter(function (b) { return !E.billIsOpen(b); }).sort(function (a, b) { var la = a.pays.length ? a.pays[a.pays.length - 1].date : ''; var lb = b.pays.length ? b.pays[b.pays.length - 1].date : ''; return la < lb ? 1 : -1; });
    sec.pagar += h; h = '';
    h += '<section class="card"><h2>A pagar</h2>' + (open.length ? '<div class="list">' + open.map(function (b) { return billItemHTML(b, hoje); }).join('') + '</div>' : '<div class="empty">Nenhuma conta em aberto.</div>') + '</section>';
    if (paid.length) h += '<section class="card"><h2>Pagas</h2><div class="list">' + paid.slice(0, 10).map(function (b) { return billItemHTML(b, hoje); }).join('') + '</div>' + (paid.length > 10 ? '<p class="sub"><small>Mostrando as 10 mais recentes de ' + paid.length + '.</small></p>' : '') + '</section>';

    var wd = ui.wd, wl = S.withdrawals.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    sec.pagar += h; h = '';
    h += '<section class="card"><h2>Retirar para minha conta</h2><p class="sub"><small>Registre quando o dinheiro da feira vai para você, e não para novas compras.</small></p><form id="wdForm" novalidate>' +
      '<div class="row"><div class="field"><label for="w-amount">Valor (R$)</label><input id="w-amount" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" data-bind="wd.amount" value="' + esc(wd.amount) + '"></div>' +
      '<div class="field"><label for="w-date">Data</label><input id="w-date" type="date" data-bind="wd.date" value="' + wd.date + '"></div></div>' +
      '<div class="field"><label id="wm-l">Como foi?</label><div class="seg" role="radiogroup" aria-labelledby="wm-l" style="margin:0">' + [['pix', 'Pix'], ['dinheiro', 'Dinheiro']].map(function (m) { return '<button type="button" role="radio" aria-checked="' + (wd.method === m[0]) + '" data-act="wd-method" data-m="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label for="w-note">Observação (opcional)</label><input id="w-note" type="text" autocomplete="off" data-bind="wd.note" value="' + esc(wd.note) + '"></div>' +
      '<div id="wdMsg">' + msgHTML('wd') + '</div><div class="actions"><button type="submit" class="btn">Registrar retirada</button></div></form>' +
      (wl.length ? '<h3 style="margin:16px 0 8px">Retiradas feitas</h3><div class="list">' + wl.slice(0, 10).map(function (w) {
        return '<div class="item"><div class="head"><b>' + E.fdate(w.date) + (w.method ? ' · ' + E.methodName(w.method) : '') + '</b><b>' + E.money(w.amount) + '</b></div>' + (w.note ? '<small>' + esc(w.note) + '</small>' : '') +
          '<div class="actions"><button class="btn small danger" data-act="del" data-kind="wd" data-id="' + w.id + '" data-label="Excluir retirada">Excluir retirada</button></div></div>';
      }).join('') + '</div>' : '') + '</section>';
    sec.caixa += h;
    var cv = ui.cview || 'caixa';
    sec.desp = expensesHTML();
    sec.plano = cv === 'plano' ? projecaoHTML() : '';
    var seg = '<div class="seg four" role="tablist" aria-label="Parte de Contas" style="margin:0 0 12px">' + [['caixa', 'Caixa'], ['pagar', 'A pagar' + (ps.count ? ' (' + ps.count + ')' : '')], ['desp', 'Despesas'], ['plano', 'Plano']].map(function (x) { return '<button type="button" role="tab" aria-selected="' + (cv === x[0]) + '" data-act="contas-view" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    return seg + sec[cv];
  }

  /* ---------- planejamento: investimento, saldo e lucro por mês ---------- */
  function projecaoHTML() {
    var inp = S.settings.plan || {}, hoje = E.today(), pl = E.planner(S, inp, hoje), d = pl.defaults, v = pl.input;
    var fld = function (key, label, ph, hint, mode) {
      var cur = inp[key] != null ? inp[key] : '';
      return '<div class="field"><label for="pl-' + key + '">' + label + '</label><input id="pl-' + key + '" type="text" inputmode="' + (mode || 'decimal') + '" autocomplete="off" data-plan="' + key + '" placeholder="' + esc(ph) + '" value="' + esc(cur) + '">' + (hint ? '<small>' + hint + '</small>' : '') + '</div>';
    };
    var termOpts = [['30-60', '30 e 60 dias'], ['avista', 'À vista'], ['30', 'Em 30 dias'], ['fiado', 'Fiado (60 dias)']];
    var h = '<section class="card"><h2>Planejamento até dar lucro</h2><p class="sub"><small>Projeta mês a mês o que entra (pelas datas em que seus clientes pagam) e o que sai (reposição de estoque, contas e despesas), reinvestindo o dinheiro recebido. Deixe um campo vazio para usar o valor sugerido pelos seus dados.</small></p>' +
      '<div class="row">' + fld('target', 'Meta de clientes recorrentes', fin(d.target), '', 'numeric') + fld('start', 'Clientes hoje', fin(d.start), 'Compraram nos últimos 60 dias', 'numeric') + '</div>' +
      '<div class="row">' + fld('newPerMonth', 'Novos clientes por mês', fin(d.newPerMonth), '', 'numeric') + fld('perMonth', 'Cestas por cliente por mês', fin(d.perMonth), '') + '</div>' +
      '<div class="row">' + fld('price', 'Preço da cesta (R$)', fin(d.price), 'Última venda') + fld('expMonthly', 'Despesas por mês (R$)', fin(d.expMonthly), 'Média do que você já lançou') + '</div>' +
      '<div class="row"><div class="field"><label for="pl-term">Como os clientes pagam</label><select id="pl-term" data-plan="term">' + termOpts.map(function (o) { return '<option value="' + o[0] + '"' + (v.term === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="pl-months">Meses na projeção</label><select id="pl-months" data-plan="months">' + [3, 6, 9, 12].map(function (n) { return '<option value="' + n + '"' + (v.months === n ? ' selected' : '') + '>' + n + ' meses</option>'; }).join('') + '</select></div></div>' +
      (S.settings.plan ? '<div class="actions"><button type="button" class="btn small ghost" data-act="plan-reset">Voltar aos valores sugeridos</button></div>' : '') + '</section>';

    var warn = pl.missing.length ? '<div class="msg warn">Falta custo de ' + pl.missing.length + ' ' + plural(pl.missing.length, 'item', 'itens') + ' da cesta (registre as compras), então o custo por cesta e a projeção estão abaixo do real.</div>' : '';
    var kp = function (label, value, sub, cls, wide) { return '<div class="kpi dk ' + (cls || '') + '"' + (wide ? ' style="grid-column:1/-1"' : '') + '><span>' + label + '</span><b>' + value + '</b><div class="dk-foot"><small>' + sub + '</small></div></div>'; };
    h += '<section class="card"><h2>Quanto investir para manter as cestas</h2>' + warn + '<div class="kpis dks">' +
      kp('Custo médio da cesta', E.money(pl.cost), 'Lucro de ' + E.money(pl.margin) + ' (' + fin(Math.round(pl.marginPct * 1000) / 10) + '%) a ' + E.money(v.price), '') +
      kp('Reposição por mês', E.money(pl.steadyMonthly), fin(pl.steadyCestas) + ' ' + plural(pl.steadyCestas, 'cesta', 'cestas') + ' para ' + fin(v.target) + ' clientes', '') +
      kp('Estoque atual', fin(pl.stockBaskets) + ' ' + plural(pl.stockBaskets, 'cesta', 'cestas'), 'Comprar agora: ' + E.money(pl.buyNow) + ' (inclui reserva de ' + fin(S.settings.minCover) + ')', '') +
      kp('Em caixa agora', E.money(pl.opening), 'Dinheiro da feira, sem contas a pagar', pl.opening < 0 ? 'bad' : '') + '</div></section>';

    var minTxt = pl.minKey ? 'O saldo mais baixo é ' + E.money(pl.minBalance) + ' em ' + E.fmonth(pl.minKey) + '.' : 'O saldo não fica abaixo do que você tem hoje.';
    h += '<section class="card"><h2>Resultado estimado em ' + v.months + ' ' + plural(v.months, 'mês', 'meses') + '</h2><div class="kpis dks">' +
      kp('Investir do seu bolso', E.money(pl.fundingNeed), pl.fundingNeed > 0 ? minTxt + ' Esse é o valor para não faltar dinheiro.' : minTxt, pl.fundingNeed > 0 ? 'bad' : 'ok', true) +
      kp('Lucro estimado', E.money(pl.profitTotal), 'Vendas previstas menos custo das cestas e despesas', pl.profitTotal < 0 ? 'bad' : 'ok') +
      kp('Saldo em ' + E.fmonth(pl.rows[pl.rows.length - 1].key), E.money(pl.endBalance), 'Caixa no fim da projeção', pl.endBalance < 0 ? 'bad' : 'ok') +
      '</div><p class="sub" style="margin-top:10px"><small>' +
      (pl.balancedFrom ? 'A partir de <b>' + E.fmonth(pl.balancedFrom) + '</b> o que entra cobre o que sai (reposição, contas e despesas). ' : 'Nesse cenário o que entra não cobre o que sai em nenhum mês da projeção. ') +
      (pl.invested > 0 ? (pl.payback ? 'Seu investimento de ' + E.money(pl.invested) + ' volta em <b>' + E.fmonth(pl.payback) + '</b> (lucro já feito mais o estimado).' : 'Seu investimento de ' + E.money(pl.invested) + ' não volta dentro desses ' + v.months + ' meses.') : '') + '</small></p></section>';

    h += '<section class="card"><h2>Mês a mês</h2><div class="list">' + pl.rows.map(function (r, i) {
      var line = function (name, val, sign) { return '<div class="line"><span>' + name + '</span><span>' + (sign || '') + E.money(val) + '</span></div>'; };
      return '<details class="pm"' + (i === 0 ? ' open' : '') + '><summary><b>' + esc(r.label) + '</b><span class="in">+' + E.money(r.in) + '</span><span class="out">−' + E.money(r.out) + '</span><b class="bal' + (r.balance < 0 ? ' neg' : '') + '">' + E.money(r.balance) + '</b></summary>' +
        '<div class="dd" style="margin-top:0">' +
        '<small>' + fin(r.clients) + ' ' + plural(r.clients, 'cliente', 'clientes') + ' · ' + fin(r.cestas) + ' ' + plural(r.cestas, 'cesta', 'cestas') + ' vendidas · ' + E.money(r.revenue) + ' em vendas</small>' +
        line('Recebe de vendas já feitas', r.rcvOld, '+') + line('Recebe das vendas previstas', r.rcvNew, '+') +
        line('Repõe estoque', r.buy, '−') + line('Contas a pagar', r.bills, '−') + line('Despesas', r.exp, '−') +
        '<div class="line"><span><b>Lucro do mês (estimado)</b></span><span><b style="color:' + (r.profit < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + E.money(r.profit) + '</b></span></div></div></details>';
    }).join('') + '</div><p class="sub"><small>Saldo = caixa depois de receber e pagar no mês. O lucro conta a venda no mês em que acontece, e o saldo conta o dinheiro no mês em que entra. Clientes que já devem entram pela data de vencimento (vencidas, no mês atual). É uma estimativa: ajuste os campos acima para testar cenários.</small></p></section>';
    return h;
  }

  function newExpDraft(prev) { return { date: E.today(), amount: '', cat: prev ? prev.cat : E.EXPENSE_CATS[0], desc: '', method: prev ? prev.method : lastPayMode(), from: prev ? prev.from : 'caixa' }; }
  function expensesHTML() {
    var ed = ui.exp || (ui.exp = newExpDraft()), hoje = E.today(), rg = E.periodRange('mes', hoje);
    var mon = E.expensesSummary(S, rg.from, rg.to), all = E.expensesSummary(S, null, null);
    var seg = function (name, act, cur, opts) { return '<div class="field"><label id="' + name + '-l">' + opts.label + '</label><div class="seg" role="radiogroup" aria-labelledby="' + name + '-l" style="margin:0">' + opts.items.map(function (m) { return '<button type="button" role="radio" aria-checked="' + (cur === m[0]) + '" data-act="' + act + '" data-m="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div>' + (opts.hint ? '<small>' + opts.hint + '</small>' : '') + '</div>'; };
    var h = '<section class="card"><h2>Registrar despesa</h2><p class="sub"><small>Combustível, frete, itens extras e outros gastos que não são compra de mercadoria. Eles entram no lucro líquido.</small></p><form id="expForm" novalidate>' +
      '<div class="row"><div class="field"><label for="x-amount">Valor (R$)</label><input id="x-amount" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" data-bind="exp.amount" value="' + esc(ed.amount) + '"></div>' +
      '<div class="field"><label for="x-date">Data</label><input id="x-date" type="date" data-bind="exp.date" value="' + ed.date + '"></div></div>' +
      '<div class="field"><label for="x-cat">Tipo de despesa</label><select id="x-cat" data-bind="exp.cat">' + E.EXPENSE_CATS.map(function (c) { return '<option' + (ed.cat === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="x-desc">Descrição (opcional)</label><input id="x-desc" type="text" autocomplete="off" placeholder="Ex.: gasolina da ida à feira" data-bind="exp.desc" value="' + esc(ed.desc) + '"></div>' +
      seg('xm', 'exp-method', ed.method, { label: 'Como pagou?', items: [['pix', 'Pix'], ['dinheiro', 'Dinheiro']] }) +
      seg('xf', 'exp-from', ed.from, { label: 'De onde saiu o dinheiro?', items: [['caixa', 'Caixa da feira'], ['pessoal', 'Meu bolso']], hint: 'Do caixa da feira diminui o caixa. Do seu bolso, não, mas continua contando como despesa e como dinheiro que você colocou.' }) +
      '<div id="expMsg">' + msgHTML('exp') + '</div><div class="actions"><button type="submit" class="btn big">Registrar despesa</button></div></form></section>';
    h += '<section class="card"><h2>Despesas deste mês</h2>';
    if (!mon.count) h += '<div class="empty">Nenhuma despesa neste mês.</div>';
    else {
      var max = mon.byCat[0].amount;
      h += '<div class="big">' + E.money(mon.total) + '</div><small>' + mon.count + ' ' + plural(mon.count, 'despesa', 'despesas') + ' em ' + esc(rg.label) + '</small><div style="margin-top:8px">' +
        mon.byCat.map(function (c) { return '<div class="mrow wide"><span>' + esc(c.cat) + '</span><div class="mini"><i class="inv" style="width:' + (max > 0 ? c.amount / max * 100 : 0) + '%"></i></div><b>' + E.money(c.amount) + '</b></div>'; }).join('') + '</div>';
    }
    h += '</section>';
    var list = S.expenses.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    h += '<section class="card"><h2>Despesas registradas</h2>' + (list.length ? '<div class="list">' + list.slice(0, 15).map(function (x) {
      return '<div class="item"><div class="head"><b>' + esc(x.cat) + '</b><b>' + E.money(x.amount) + '</b></div><small>' + E.fdate(x.date) + (x.desc ? ' · ' + esc(x.desc) : '') + (x.method ? ' · ' + E.methodName(x.method) : '') + ' · ' + (x.from === 'pessoal' ? 'do meu bolso' : 'do caixa') + '</small>' +
        '<div class="actions"><button class="btn small" data-act="exp-to-purch" data-id="' + x.id + '">Virar compra de produtos</button><button class="btn small danger" data-act="del" data-kind="exp" data-id="' + x.id + '" data-label="Excluir despesa">Excluir despesa</button></div></div>';
    }).join('') + '</div>' + (list.length > 15 ? '<p class="sub"><small>Mostrando as 15 mais recentes de ' + list.length + '. Total geral: ' + E.money(all.total) + '.</small></p>' : '') : '<div class="empty">Nenhuma despesa registrada.</div>') + '</section>';
    return h;
  }
  function submitExp() {
    var d = ui.exp, v = E.parseNum(d.amount), errs = [];
    if (isNaN(v) || v <= 0) errs.push('Informe um valor maior que zero.');
    if (!E.validISO(d.date)) errs.push('Informe a data.');
    if (errs.length) { setMsg('exp', 'bad', errs); $('#expMsg').innerHTML = msgHTML('exp'); return; }
    S.expenses.push({ id: E.uid(), date: d.date, amount: E.round2(v), cat: d.cat, desc: d.desc.trim(), method: d.method, from: d.from });
    rememberPayMode(d.method);
    setMsg('exp', null); ui.exp = newExpDraft(d); toast('Despesa registrada.'); commit();
  }
  function submitBill() {
    var d = ui.bill, v = E.parseNum(d.amount), errs = [];
    if (!d.desc.trim()) errs.push('Diga o que é a conta.');
    if (isNaN(v) || v <= 0) errs.push('Informe um valor maior que zero.');
    if (!E.validISO(d.due)) errs.push('Informe o vencimento.');
    if (errs.length) { setMsg('bill', 'bad', errs); $('#billMsg').innerHTML = msgHTML('bill'); return; }
    S.payables.push({ id: E.uid(), desc: d.desc.trim(), supplierId: d.supplierId, amount: E.round2(v), due: d.due, note: '', pays: [] });
    setMsg('bill', null); ui.bill = null; toast('Conta salva.'); commit();
  }
  function submitCt() {
    var d = ui.ct, v = E.parseNum(d.amount), errs = [];
    if (isNaN(v) || v <= 0) errs.push('Informe um valor maior que zero.');
    if (!E.validISO(d.date)) errs.push('Informe a data.');
    if (errs.length) { setMsg('ct', 'bad', errs); $('#ctMsg').innerHTML = msgHTML('ct'); return; }
    S.contributions.push({ id: E.uid(), date: d.date, amount: E.round2(v), method: d.method, note: d.note.trim() });
    rememberPayMode(d.method);
    setMsg('ct', null); ui.ct = null; toast('Aporte registrado. O caixa aumentou.'); commit();
  }
  function submitWd() {
    var d = ui.wd, v = E.parseNum(d.amount), errs = [];
    if (isNaN(v) || v <= 0) errs.push('Informe um valor maior que zero.');
    if (!E.validISO(d.date)) errs.push('Informe a data.');
    if (errs.length) { setMsg('wd', 'bad', errs); $('#wdMsg').innerHTML = msgHTML('wd'); return; }
    var cf = E.cashflow(S, null, null, E.today());
    S.withdrawals.push({ id: E.uid(), date: d.date, amount: E.round2(v), method: d.method, note: d.note.trim() });
    rememberPayMode(d.method);
    setMsg('wd', null); ui.wd = null; toast(v > cf.balance + 0.004 ? 'Retirada registrada. Atenção: passou do que havia em caixa.' : 'Retirada registrada.'); commit();
  }

  /* ---------- busca de produtos ---------- */
  function byName(a, b) { return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }); }
  function prodMatches(p, q) {
    q = E.normText(q || ''); if (!q) return true;
    var hay = E.normText(p.name + ' ' + p.cat + ' ' + (p.packLabel || '') + ' ' + (p.group || ''));
    return q.split(' ').every(function (w) { return hay.indexOf(w) >= 0; });
  }
  function prodSearchHTML(scope) {
    return '<div class="field search" style="margin:12px 0 4px"><label for="prod-q-' + scope + '">Buscar produto</label><input id="prod-q-' + scope + '" type="search" autocomplete="off" placeholder="Nome ou categoria (ex.: feijão, sacola)" data-search="' + scope + '" value="' + esc(ui.prodQ || '') + '"></div>';
  }
  /* produto com estoque e custo, para o cadastro */
  function cadProdListHTML(q, d) {
    var out = '';
    E.CATS.forEach(function (cat) {
      var ps = S.products.filter(function (p) { return p.cat === cat && prodMatches(p, q); }).sort(byName);
      if (!ps.length) return;
      out += '<div class="cat">' + cat + ' <span class="muted">(' + ps.length + ')</span></div><div class="plist">' + ps.map(function (p) {
        var uc = E.unitCost(S, p.id), st = d.stock[p.id], cov = d.covOf[p.id], last = E.priceHistory(S, p.id).last;
        var sub = (p.perBasket > 0 ? fin(p.perBasket) + ' ' + esc(p.unit) + ' por cesta' : 'fora da cesta') + (p.group ? ' · ' + E.GROUPS[p.group].toLowerCase() : '');
        return '<details class="pl"><summary><span class="pl-n"><b>' + esc(p.name) + '</b><small>' + sub + '</small></span>' +
          '<span class="pl-v"><b>' + fin(st) + ' ' + esc(p.unit) + '</b>' + (cov == null ? '' : covBadge(cov)) + '</span></summary>' +
          '<div class="pl-b"><dl><div><dt>Custo por ' + esc(p.unit) + '</dt><dd>' + (uc == null ? '—' : E.money(uc)) + '</dd></div>' +
          '<div><dt>Valor em estoque</dt><dd>' + (uc == null ? '—' : E.money(Math.max(0, st) * uc)) + '</dd></div>' +
          '<div><dt>Compra</dt><dd>' + (p.packSize > 1 ? esc(p.packLabel || 'embalagem') + ' (' + fin(p.packSize) + ')' : 'avulsa') + '</dd></div>' +
          '<div><dt>Última compra</dt><dd>' + (last ? E.money(last.total) + ' por ' + fin(last.qty) + ' ' + esc(p.unit) + ' · ' + E.fdate(last.date) + (supName(last.supplierId) ? ' · ' + esc(supName(last.supplierId)) : '') : 'sem compra registrada') + '</dd></div></dl>' +
          '<div class="actions"><button class="btn small" data-act="edit-prod" data-id="' + p.id + '">Editar</button><button class="btn small danger" data-act="del" data-kind="product" data-id="' + p.id + '" data-label="Excluir">Excluir</button></div></div></details>';
      }).join('') + '</div>';
    });
    return out || '<div class="empty">Nenhum produto encontrado para "' + esc(q) + '". <button type="button" class="link-btn" data-act="new-prod">Cadastrar novo produto</button></div>';
  }

  /* ---------- ESTOQUE ---------- */
  function replHTML(rp, emptyText) {
    if (!rp.groups.length) return '<div class="empty">' + emptyText + '</div>';
    var h = rp.groups.map(function (g) {
      return '<div class="rgroup"><div class="rhead"><b>' + esc(g.name) + '</b><span>' + E.money(g.total) + '</span></div>' +
        g.items.map(function (r) {
          var how = r.packs ? r.packs + ' × ' + (r.packLabel || 'embalagem') + ' (' + fin(r.qty) + ' ' + r.unit + ')' : fin(r.qty) + ' ' + r.unit;
          var each = r.unitCost == null ? 'sem compra anterior' : E.money(r.unitCost) + ' por ' + r.unit;
          return '<div class="rrow"><div class="rn"><b>' + esc(r.name) + '</b><small>Falta ' + fin(r.falta) + ' ' + r.unit + ' · comprar ' + how + '</small></div>' +
            '<div class="rp"><b>' + (r.unitCost == null ? '—' : E.money(r.cost)) + '</b><small>' + each + '</small></div></div>';
        }).join('') + '</div>';
    }).join('');
    h += '<div class="rtotal"><span>Custo estimado</span><b>' + E.money(rp.total) + '</b></div>';
    if (rp.unknownCost) h += '<small>' + rp.unknownCost + ' ' + plural(rp.unknownCost, 'item sem compra anterior ficou', 'itens sem compra anterior ficaram') + ' fora do custo estimado.</small>';
    return h;
  }
  function replText(rp, title, withCost) {
    var out = ['*' + title + '*'];
    rp.groups.forEach(function (g) {
      out.push(''); out.push('*' + g.name + '*' + (withCost ? ' — ' + E.money(g.total) : ''));
      g.items.forEach(function (r) {
        out.push('• ' + r.name + ': ' + fin(r.qty) + ' ' + r.unit + (r.packs ? ' (' + r.packs + ' × ' + (r.packLabel || 'embalagem') + ')' : '') +
          (withCost && r.unitCost != null ? ' — ' + E.money(r.cost) + ' (' + E.money(r.unitCost) + '/' + r.unit + ')' : ''));
      });
    });
    if (withCost) { out.push(''); out.push('*Total estimado: ' + E.money(rp.total) + '*'); }
    return out.join('\n');
  }
  function planT() { var t = E.parseNum(ui.planT == null ? S.settings.target : ui.planT); return isNaN(t) || t < 0 ? 0 : t; }
  function planHTML(d) { var rp = E.replenish(S, planT(), d); return replHTML(rp, 'Nada a repor para essa meta.'); }
  function planMore() { var n = E.parseNum(ui.planMore == null ? '4' : ui.planMore); return isNaN(n) || n < 0 ? 0 : Math.floor(n); }
  function moreOutHTML(d) {
    var n = planMore(), T = d.total + n, rp = E.replenish(S, T, d, { lastCost: true });
    if (!(n > 0)) return '<div class="empty">Informe quantas cestas quer montar.</div>';
    return '<p class="rsum">Para ficar com <b>' + T + ' ' + plural(T, 'cesta pronta', 'cestas prontas') + '</b> (' + d.total + ' que já tem + ' + n + ' novas):</p>' + replHTML(rp, 'O estoque atual já cobre essas cestas. Nada a comprar.');
  }
  function evCurrent() { return ui.ev || 'pos'; }

  function viewEstoque(d) {
    var h = subSegHTML('estoque', 'Estoque', 'est-view'), v = evCurrent();
    if (v === 'repor') return h + estoqueReporHTML(d);
    if (v === 'ajuste') return h + estoqueAjusteHTML(d);
    return h + estoquePosicaoHTML(d);
  }

  function estoqueReporHTML(d) {
    var minRp = E.replenish(S, S.settings.minCover, d), n = planMore();
    var h = '<section class="card"><h2>Montar mais cestas</h2><p class="sub"><small>O estoque cobre hoje <b>' + d.total + ' ' + plural(d.total, 'cesta', 'cestas') + '</b> prontas. Escolha quantas quer montar além dessas e veja o que comprar, com o último preço pago.</small></p>' +
      '<div class="stepper"><button type="button" class="btn ghost" data-act="plan-step" data-d="-1" aria-label="Menos uma cesta">−</button>' +
      '<div class="field"><label for="plan-more">Quero montar mais</label><input id="plan-more" type="text" inputmode="numeric" value="' + n + '"></div>' +
      '<button type="button" class="btn ghost" data-act="plan-step" data-d="1" aria-label="Mais uma cesta">+</button></div>' +
      '<div id="planMoreOut">' + moreOutHTML(d) + '</div>' +
      '<div class="actions"><button class="btn" data-act="copy-repl" data-kind="more">Copiar lista para WhatsApp</button></div></section>';

    h += '<details class="card fold"><summary><h2>Reposição urgente</h2><small>Para chegar ao mínimo de ' + fin(S.settings.minCover) + ' ' + plural(S.settings.minCover, 'cesta', 'cestas') + '</small></summary>' +
      replHTML(minRp, 'O estoque está no mínimo ou acima. Nada urgente.') +
      (minRp.groups.length ? '<div class="actions"><button class="btn ghost" data-act="copy-repl" data-kind="min">Copiar para WhatsApp</button></div>' : '') + '</details>';

    h += '<details class="card fold"><summary><h2>Chegar a uma meta</h2><small>Quanto comprar para ter uma meta total de cestas</small></summary>' +
      '<div class="field"><label for="plan-t">Meta de estoque (cestas)</label><input id="plan-t" type="text" inputmode="decimal" value="' + esc(ui.planT == null ? fin(S.settings.target) : ui.planT) + '"></div>' +
      '<div id="planOut">' + planHTML(d) + '</div><div class="actions"><button class="btn ghost" data-act="copy-repl" data-kind="plan">Copiar para WhatsApp</button></div></details>';
    return h;
  }

  function estoquePosicaoHTML(d) {
    var stockValue = 0, low = 0;
    S.products.forEach(function (p) {
      var uc = E.unitCost(S, p.id); if (uc != null) stockValue += Math.max(0, d.stock[p.id]) * uc;
      var cov = d.covOf[p.id]; if (cov != null && E.statusOf(cov, S.settings) === 'urgent') low++;
    });
    var h = '<section class="card"><div class="kpis three"><div class="kpi"><b>' + d.total + '</b><span>' + plural(d.total, 'cesta pronta', 'cestas prontas') + '</span></div>' +
      '<div class="kpi"><b>' + E.money(stockValue) + '</b><span>Valor em estoque</span></div>' +
      '<div class="kpi"><b style="color:' + (low ? 'var(--bad)' : 'inherit') + '">' + low + '</b><span>' + plural(low, 'item abaixo do mínimo', 'itens abaixo do mínimo') + '</span></div></div>' +
      '<div class="actions"><button class="btn small ghost" data-act="new-prod">+ Novo produto da cesta</button><button class="btn small" data-act="go" data-tab="estoque" data-sub="repor">Planejar compras</button></div></section>';
    var stockList = function (q) {
      var out = '';
      E.CATS.forEach(function (cat) {
        var ps = S.products.filter(function (p) { return p.cat === cat && prodMatches(p, q); }).sort(byName);
        if (!ps.length) return;
        out += '<div class="cat">' + cat + '</div><div class="srows">' + ps.map(function (p) {
          var cov = d.covOf[p.id], uc = E.unitCost(S, p.id);
          return '<details class="srow"><summary><span class="sn"><b>' + esc(p.name) + '</b><small>' + (cov == null ? (p.perBasket > 0 || p.group ? 'Aguardando a primeira compra' : 'Fora da cesta') : 'Cobre ' + Math.max(0, cov) + ' ' + plural(Math.max(0, cov), 'cesta', 'cestas')) + '</small></span>' +
            '<span class="sq"><b>' + fin(d.stock[p.id]) + ' ' + esc(p.unit) + '</b>' + (cov == null ? '' : covBadge(cov)) + '</span></summary>' +
            '<div class="stats"><div><b>' + fin(d.bought[p.id]) + '</b><span>Comprado</span></div><div><b>' + fin(d.sold[p.id]) + '</b><span>Vendido</span></div>' +
            '<div><b>' + (uc == null ? '—' : E.money(uc)) + '</b><span>Custo por ' + esc(p.unit) + '</span></div><div><b>' + (uc == null ? '—' : E.money(Math.max(0, d.stock[p.id]) * uc)) + '</b><span>Valor em estoque</span></div>' +
            '<div><b>' + (uc == null || !(p.perBasket > 0) ? '—' : E.money(uc * p.perBasket)) + '</b><span>Custo na cesta</span></div></div>' +
            '<div class="actions"><button class="btn small ghost" data-act="edit-prod" data-id="' + p.id + '">Editar cadastro</button></div></details>';
        }).join('') + '</div>';
      });
      return out || '<div class="empty">Nenhum produto encontrado para essa busca.</div>';
    };
    h += '<section class="card"><h2>Itens em estoque</h2><small>Toque em um item para ver compras, vendas e custo. Custo pelo modo "' + (S.settings.costMode === 'avg' ? 'média das compras' : 'última compra') + '".</small>' +
      prodSearchHTML('stock') + '<div id="stockList">' + stockList(ui.prodQ || '') + '</div></section>';
    ui.stockListFn = stockList;
    return h;
  }

  function estoqueAjusteHTML(d) {
    var h = '';
    if (!ui.adj) ui.adj = { pid: S.products.length ? S.products[0].id : '', counted: '', note: '' };
    var a = ui.adj, cur = a.pid ? d.stock[a.pid] : 0, ap = prod(a.pid);
    h += '<section class="card"><h2>Ajuste de estoque</h2><form id="adjForm" novalidate>' +
      '<div class="field"><label for="a-pid">Produto</label><select id="a-pid" data-bind="adj.pid">' + S.products.map(function (p) { return '<option value="' + p.id + '"' + (a.pid === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select></div>' +
      '<p>Em estoque pelo sistema: <b>' + fin(cur) + ' ' + (ap ? ap.unit : '') + '</b></p>' +
      '<div class="row"><div class="field"><label for="a-cnt">Quantidade contada</label><input id="a-cnt" type="text" inputmode="decimal" data-bind="adj.counted" value="' + esc(a.counted) + '"></div>' +
      '<div class="field"><label for="a-note">Motivo</label><input id="a-note" type="text" data-bind="adj.note" value="' + esc(a.note) + '" placeholder="Ex.: perda, contagem"></div></div>' +
      '<div id="adjMsg">' + msgHTML('adj') + '</div><div class="actions"><button type="submit" class="btn">Gravar ajuste</button></div></form>';
    var adjs = S.adjustments.slice().sort(function (x, y) { return x.date < y.date ? 1 : x.date > y.date ? -1 : 0; });
    if (adjs.length) h += '<div class="cat">Ajustes gravados</div><div class="list">' + adjs.map(function (x) {
      var p = prod(x.pid);
      return '<div class="item"><div class="head"><b>' + esc(p ? p.name : 'Produto removido') + '</b><b style="color:' + (x.delta < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + (x.delta > 0 ? '+' : '') + fin(x.delta) + ' ' + (p ? p.unit : '') + '</b></div><small>' + E.fdate(x.date) + (x.note ? ' · ' + esc(x.note) : '') + '</small>' +
        '<div class="actions"><button class="btn small ghost" data-act="undo-adj" data-id="' + x.id + '">Desfazer</button></div></div>';
    }).join('') + '</div>';
    h += '</section>';
    return h;
  }

  /* ---------- CADASTROS ---------- */
  function newSupDraft() { return { id: null, name: '', address: '', phone: '', doc: '' }; }
  function newProdDraft() { return { id: null, name: '', cat: E.CATS[0], unit: 'un', perBasket: '', packSize: '1', packLabel: '', group: '' }; }

  function viewCadastros() {
    if (!ui.sup) ui.sup = newSupDraft();
    if (!ui.prod) ui.prod = newProdDraft();
    var sd = ui.sup, pd = ui.prod;
    var h = subSegHTML('cadastros', 'Cadastros', 'cad-view');
    var cv = ui.cadv || 'cli';
    if (cv === 'forn') return h + fornecedoresHTML(sd);
    if (cv === 'prod') return h + produtosHTML(pd);
    return h + clientesCadHTML();
  }
  function fornecedoresHTML(sd) {
    var h = '<section class="card"><h2>Fornecedores</h2>';
    h += S.suppliers.length ? '<div class="list">' + S.suppliers.map(function (s) {
      return '<div class="item"><div class="head"><b>' + esc(s.name) + '</b></div><small>' + [s.phone, s.doc, s.address].filter(Boolean).map(esc).join(' · ') + '</small>' +
        '<div class="actions"><button class="btn small ghost" data-act="edit-sup" data-id="' + s.id + '">Editar</button><button class="btn small danger" data-act="del" data-kind="supplier" data-id="' + s.id + '" data-label="Excluir">Excluir</button></div></div>';
    }).join('') + '</div>' : '<div class="empty">Nenhum fornecedor cadastrado.</div>';
    h += '<form id="supForm" novalidate style="margin-top:12px"><h3 style="margin-bottom:8px">' + (sd.id ? 'Editar fornecedor' : 'Novo fornecedor') + '</h3>' +
      '<div class="field"><label for="f-name">Nome</label><input id="f-name" type="text" data-bind="sup.name" value="' + esc(sd.name) + '"></div>' +
      '<div class="row"><div class="field"><label for="f-phone">Telefone</label><input id="f-phone" type="tel" data-bind="sup.phone" value="' + esc(sd.phone) + '"></div><div class="field"><label for="f-doc">Documento (CNPJ/CPF)</label><input id="f-doc" type="text" data-bind="sup.doc" value="' + esc(sd.doc) + '"></div></div>' +
      '<div class="field"><label for="f-addr">Endereço</label><input id="f-addr" type="text" data-bind="sup.address" value="' + esc(sd.address) + '"></div>' +
      '<div id="supMsg">' + msgHTML('sup') + '</div><div class="actions"><button type="submit" class="btn">' + (sd.id ? 'Salvar' : 'Cadastrar fornecedor') + '</button>' + (sd.id ? '<button type="button" class="btn ghost" data-act="cancel-sup">Cancelar</button>' : '') + '</div></form></section>';

    return h;
  }
  function produtosHTML(pd) {
    var h = '';
    h += '<section class="card" id="prodCard"><h2>Produtos da cesta</h2><p class="sub"><small>O que tem "Qtd por cesta" maior que zero entra no custo da cesta e baixa do estoque a cada cesta vendida. Sacolas e outras embalagens também entram aqui, na categoria Embalagens.</small></p><div class="actions" style="margin:0 0 8px"><button class="btn small" data-act="new-prod">+ Novo produto</button></div>';
    h += prodSearchHTML('cad') + '<div id="cadList">' + cadProdListHTML(ui.prodQ || '', E.derive(S)) + '</div>';
    h += '<form id="prodForm" novalidate style="margin-top:12px"><h3 style="margin-bottom:8px">' + (pd.id ? 'Editar produto' : 'Novo produto') + '</h3>' +
      '<div class="field"><label for="p-name">Nome</label><input id="p-name" type="text" data-bind="prod.name" value="' + esc(pd.name) + '"></div>' +
      '<div class="row"><div class="field"><label for="p-cat">Categoria</label><select id="p-cat" data-bind="prod.cat">' + E.CATS.map(function (c) { return '<option' + (pd.cat === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="p-unit">Unidade</label><select id="p-unit" data-bind="prod.unit"><option value="un"' + (pd.unit === 'un' ? ' selected' : '') + '>un</option><option value="kg"' + (pd.unit === 'kg' ? ' selected' : '') + '>kg</option></select></div></div>' +
      '<div class="row three"><div class="field"><label for="p-per">Qtd em cada cesta</label><input id="p-per" type="text" inputmode="decimal" data-bind="prod.perBasket" value="' + esc(pd.perBasket) + '"></div>' +
      '<div class="field"><label for="p-pack">Itens por embalagem</label><input id="p-pack" type="text" inputmode="numeric" data-bind="prod.packSize" value="' + esc(pd.packSize) + '"></div>' +
      '<div class="field"><label for="p-label">Nome da embalagem</label><input id="p-label" type="text" placeholder="fardo de 30" data-bind="prod.packLabel" value="' + esc(pd.packLabel) + '"></div></div>' +
      '<div class="field"><label for="p-group">Grupo</label><select id="p-group" data-bind="prod.group"><option value="">Nenhum</option>' + Object.keys(E.GROUPS).map(function (k) { return '<option value="' + k + '"' + (pd.group === k ? ' selected' : '') + '>' + E.GROUPS[k] + ' (um tipo ou outro por cesta)</option>'; }).join('') + '</select><small>Use para marcas que se alternam: ex. dois cafés. O total por cesta é a soma das quantidades dos produtos do grupo (no arroz, o kg definido nos Padrões).</small></div>' +
      '<div id="prodMsg">' + msgHTML('prod') + '</div><div class="actions"><button type="submit" class="btn">' + (pd.id ? 'Salvar' : 'Cadastrar produto') + '</button>' + (pd.id ? '<button type="button" class="btn ghost" data-act="cancel-prod">Cancelar</button>' : '') + '</div></form></section>';

    return h;
  }

  /* ---------- configurações do sistema ---------- */
  function subSegHTML(tab, label, act) {
    var cv = subCurrent(tab);
    return '<div class="seg scroll" role="tablist" aria-label="' + label + '">' + NAV_SUBS[tab].map(function (x) {
      return '<button type="button" role="tab" aria-selected="' + (cv === x[0]) + '" data-act="' + act + '" data-v="' + x[0] + '">' + x[1] + '</button>';
    }).join('') + '</div>';
  }
  function themeMode() { try { var t = localStorage.getItem(THEME_KEY); return t === 'dark' || t === 'light' ? t : 'auto'; } catch (e) { return 'auto'; } }
  function applyTheme() { var t = themeMode(), r = document.documentElement; if (t === 'auto') r.removeAttribute('data-theme'); else r.dataset.theme = t; }
  function dataSummaryHTML() {
    var rows = [['Clientes', S.customers.length], ['Fornecedores', S.suppliers.length], ['Produtos', S.products.length], ['Compras', S.purchases.length], ['Vendas', S.sales.length], ['Despesas', S.expenses.length], ['Contas a pagar', S.payables.length], ['Cotações', S.quotes.length]];
    return '<div class="stats" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + rows.map(function (r) { return '<div><b>' + r[1] + '</b><span>' + r[0] + '</span></div>'; }).join('') + '</div>';
  }
  function prevHTML() {
    var pv = loadPrev(); if (!pv || !pv.state) return '';
    var s = pv.state.state || pv.state, n = function (k) { return Array.isArray(s[k]) ? s[k].length : 0; };
    return '<div class="msg warn" role="note"><b>Cópia anterior guardada</b><br><small>' + esc(pv.reason || '') + ', em ' + new Date(pv.when).toLocaleString('pt-BR') + '. Tinha ' + n('products') + ' produtos, ' + n('customers') + ' clientes, ' + n('purchases') + ' compras e ' + n('sales') + ' vendas.</small>' +
      '<div class="actions"><button type="button" class="btn small danger" data-act="restore-prev" data-label="Restaurar esta cópia">Restaurar esta cópia</button></div></div>';
  }
  function segHTML(id, label, act, cur, opts, hint) {
    return '<div class="field"><label id="' + id + '-l">' + label + '</label><div class="seg' + (opts.length === 3 ? ' three' : '') + '" role="radiogroup" aria-labelledby="' + id + '-l" style="margin:0">' + opts.map(function (x) {
      return '<button type="button" role="radio" aria-checked="' + (cur === x[0]) + '" data-act="' + act + '" data-v="' + x[0] + '">' + x[1] + '</button>';
    }).join('') + '</div>' + (hint ? '<small>' + hint + '</small>' : '') + '</div>';
  }
  function empresaHTML() {
    var st = S.settings;
    return '<section class="card"><h2>Dados da empresa</h2><p class="sub"><small>Aparecem no topo dos comprovantes de venda e de pagamento. Tudo é opcional, mas quanto mais completo, mais oficial fica o documento.</small></p>' +
      '<form id="bizForm" novalidate><div class="field"><label for="biz-name">Nome da empresa</label><input id="biz-name" type="text" autocomplete="organization" placeholder="Razão social ou nome fantasia" value="' + esc(st.bizName || '') + '"></div>' +
      '<div class="field"><label for="biz-doc">CPF ou CNPJ</label><input id="biz-doc" type="text" inputmode="numeric" placeholder="Somente números" value="' + esc(st.bizDoc || '') + '"></div>' +
      '<div class="row"><div class="field"><label for="biz-phone">Telefone / WhatsApp</label><input id="biz-phone" type="tel" value="' + esc(st.bizPhone || '') + '"></div>' +
      '<div class="field"><label for="biz-email">E-mail</label><input id="biz-email" type="email" value="' + esc(st.bizEmail || '') + '"></div></div>' +
      '<div class="field"><label for="biz-addr">Endereço</label><input id="biz-addr" type="text" autocomplete="street-address" placeholder="Rua, número, bairro, cidade-UF" value="' + esc(st.bizAddress || '') + '"></div>' +
      '<div id="bizMsg">' + msgHTML('biz') + '</div><div class="actions"><button type="submit" class="btn">Salvar dados</button></div></form></section>';
  }
  function submitBiz() {
    var raw = $('#biz-doc').value.trim(), dd = E.parseDoc(raw);
    if (raw && !dd.ok) { setMsg('biz', 'bad', 'CPF ou CNPJ inválido. Confira os números (11 dígitos para CPF, 14 para CNPJ).'); $('#bizMsg').innerHTML = msgHTML('biz'); return; }
    S.settings = Object.assign({}, S.settings, { bizName: $('#biz-name').value.trim(), bizDoc: raw ? dd.text : '', bizPhone: $('#biz-phone').value.trim(), bizEmail: $('#biz-email').value.trim(), bizAddress: $('#biz-addr').value.trim() });
    setMsg('biz', 'ok', 'Dados salvos.'); toast('Dados da empresa salvos.'); commit();
  }
  function configHTML() {
    var st = S.settings;
    var cv = ui.cfgv || 'empresa', h = subSegHTML('config', 'Configurações', 'cfg-view');
    if (cv === 'conta') h += '<section class="card" id="syncCard">' + syncInnerHTML() + '</section>';
    else if (cv === 'empresa') h += empresaHTML();
    else if (cv === 'padroes') h += '<section class="card"><h2>Padrões do negócio</h2><p class="sub"><small>Valores usados como ponto de partida nas vendas, no estoque e nos custos. Dá para mudar em cada venda ou compra.</small></p><form id="setForm" novalidate><h3 style="margin-bottom:8px">Vendas</h3>' +
      '<div class="row"><div class="field"><label for="st-price">Preço da cesta (R$)</label><input id="st-price" type="text" inputmode="decimal" value="' + fin(st.price) + '"></div>' +
      '<div class="field"><label for="st-term">Prazo padrão</label><select id="st-term">' + [['30-60', '30 e 60 dias'], ['avista', 'À vista'], ['30', '30 dias'], ['fiado', 'Fiado']].map(function (o) { return '<option value="' + o[0] + '"' + (st.term === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>' +
      '<h3 style="margin:14px 0 8px">Estoque</h3><div class="row three"><div class="field"><label for="st-target">Meta de estoque (cestas)</label><input id="st-target" type="text" inputmode="decimal" value="' + fin(st.target) + '"></div>' +
      '<div class="field"><label for="st-min">Mínimo (cestas)</label><input id="st-min" type="text" inputmode="decimal" value="' + fin(st.minCover) + '"></div>' +
      '<div class="field"><label for="st-rice">Kg de arroz por cesta</label><input id="st-rice" type="text" inputmode="decimal" value="' + fin(st.riceKg) + '"></div></div>' +
      (E.groupKeys(S).filter(function (k) { return k !== 'arroz'; }).length ? '<div class="row">' + E.groupKeys(S).filter(function (k) { return k !== 'arroz'; }).map(function (k) {
        return '<div class="field"><label for="st-g-' + k + '">' + E.GROUPS[k] + ' por cesta (' + E.groupUnit(S, k) + ')</label><input id="st-g-' + k + '" type="text" inputmode="decimal" value="' + fin(E.groupTotal(S, k)) + '"></div>';
      }).join('') + '</div><small>Total por cesta somando as marcas do grupo: as marcas se alternam, não se somam.</small>' : '') +
      '<h3 style="margin:14px 0 8px">Custos</h3><div class="field"><label for="st-cost">Custo unitário</label><select id="st-cost"><option value="last"' + (st.costMode === 'last' ? ' selected' : '') + '>Última compra</option><option value="avg"' + (st.costMode === 'avg' ? ' selected' : '') + '>Média de todas as compras</option></select></div>' +
      '<div id="setMsg">' + msgHTML('set') + '</div><div class="actions"><button type="submit" class="btn">Salvar configurações</button></div></form></section>';

    else if (cv === 'aparencia') h += '<section class="card"><h2>Aparência</h2>' +
      segHTML('th', 'Tema', 'theme-mode', themeMode(), [['auto', 'Auto'], ['light', 'Claro'], ['dark', 'Escuro']], 'Auto segue o tema do aparelho.') +
      segHTML('nv', 'Menu no celular', 'nav-mode', navMode(), [['bottom', 'Embaixo'], ['side', 'Lateral']], 'Lateral: toque em ☰ no topo para abrir o menu com todas as seções e subseções. No computador o menu é sempre lateral.') + '</section>';
    else if (cv === 'dados') h += '<section class="card"><h2>Dados e backup</h2>'+dataSummaryHTML()+'<p class="sub"><small>Exporte para guardar uma cópia ou levar os dados a outro aparelho. Importar substitui tudo o que está salvo aqui.</small></p>' + prevHTML() +
      '<div class="field"><label for="bk-text">Dados em JSON</label><textarea id="bk-text" spellcheck="false">' + esc(ui.exportText) + '</textarea></div><div id="bkMsg">' + msgHTML('bk') + '</div>' +
      '<div class="actions"><button class="btn" data-act="export">Exportar</button><button class="btn ghost" data-act="download">Baixar arquivo</button><button class="btn danger" data-act="import" data-label="Importar dados">Importar dados</button></div></section>';
    else h += '<section class="card"><h2>Sobre o FeiraUP</h2><p class="sub"><small>Controle de estoque, compras, vendas, parcelas, contas e caixa de cestas básicas. Funciona sem internet: os dados ficam salvos neste aparelho e sincronizam com a nuvem quando você entra na conta.</small></p>' +
      '<div class="line2"><span>Conexão</span><b>' + (navigator.onLine === false ? 'Sem internet' : 'Online') + '</b></div>' +
      '<div class="line2"><span>Dados</span><b>Salvos neste aparelho</b></div>' +
      '<div class="actions"><button type="button" class="btn ghost" data-act="reload-app">Recarregar o app</button></div></section>';
    return h;
  }

  function submitSup() {
    var sd = ui.sup, name = sd.name.trim();
    if (!name) { setMsg('sup', 'bad', 'Informe o nome do fornecedor.'); $('#supMsg').innerHTML = msgHTML('sup'); return; }
    var rec = sd.id ? E.byId(S.suppliers, sd.id) : null, data = { name: name, address: sd.address.trim(), phone: sd.phone.trim(), doc: sd.doc.trim() };
    if (rec) Object.assign(rec, data); else S.suppliers.push(Object.assign({ id: E.uid() }, data));
    setMsg('sup', null); ui.sup = null; toast('Fornecedor salvo.'); commit();
  }
  function submitProd() {
    var pd = ui.prod, name = pd.name.trim(), errs = [];
    if (!name) errs.push('Informe o nome do produto.');
    var per = pd.perBasket === '' ? 0 : E.parseNum(pd.perBasket), pack = pd.packSize === '' ? 1 : E.parseNum(pd.packSize);
    if (isNaN(per) || per < 0) errs.push('Quantidade por cesta inválida.');
    if (isNaN(pack) || pack < 1) errs.push('Itens por embalagem deve ser 1 ou mais.');
    if (S.products.some(function (p) { return p.id !== pd.id && p.name.toLowerCase() === name.toLowerCase(); })) errs.push('Já existe um produto com esse nome.');
    if (errs.length) { setMsg('prod', 'bad', errs); $('#prodMsg').innerHTML = msgHTML('prod'); return; }
    var data = { name: name, cat: pd.cat, unit: pd.unit, perBasket: per, packSize: pack, packLabel: pd.packLabel.trim() };
    var rec = pd.id ? E.byId(S.products, pd.id) : null;
    if (rec) { Object.assign(rec, data); if (pd.group) rec.group = pd.group; else delete rec.group; }
    else { var np = Object.assign({ id: E.uid() }, data); if (pd.group) np.group = pd.group; S.products.push(np); }
    setMsg('prod', null); ui.prod = null; toast('Produto salvo.'); commit();
  }
  function submitSettings() {
    function v(id) { return E.parseNum($('#' + id).value); }
    var price = v('st-price'), target = v('st-target'), min = v('st-min'), rice = v('st-rice'), errs = [];
    if (isNaN(price) || price < 0) errs.push('Preço inválido.');
    if (isNaN(target) || target < 0) errs.push('Meta inválida.');
    if (isNaN(min) || min < 0) errs.push('Mínimo inválido.');
    if (isNaN(rice) || rice <= 0) errs.push('Kg de arroz por cesta deve ser maior que zero.');
    var gq = {};
    E.groupKeys(S).forEach(function (k) {
      var el = $('#st-g-' + k); if (!el) return;
      var n = E.parseNum(el.value);
      if (isNaN(n) || n <= 0) errs.push('Quantidade de ' + E.GROUPS[k].toLowerCase() + ' por cesta deve ser maior que zero.'); else gq[k] = n;
    });
    if (errs.length) { setMsg('set', 'bad', errs); $('#setMsg').innerHTML = msgHTML('set'); return; }
    S.settings = Object.assign({}, S.settings, { groupQty: gq, price: E.round2(price), term: $('#st-term').value, target: target, minCover: min, costMode: $('#st-cost').value, riceKg: rice });
    ui.planT = null; setMsg('set', 'ok', 'Configurações salvas.'); toast('Configurações salvas.'); commit();
  }

  /* ---------- exclusões ---------- */
  function doDelete(kind, id) {
    if (kind === 'sale') { S.sales = S.sales.filter(function (s) { return s.id !== id; }); ui.saleOpen = null; }
    else if (kind === 'quote') S.quotes = S.quotes.filter(function (q) { return q.id !== id; });
    else if (kind === 'purchase') { S.purchases = S.purchases.filter(function (p) { return p.id !== id; }); S.payables = S.payables.filter(function (b) { return b.purchaseId !== id; }); }
    else if (kind === 'bill') { S.payables = S.payables.filter(function (b) { return b.id !== id; }); S.purchases.forEach(function (pu) { if (pu.payableId === id) delete pu.payableId; }); }
    else if (kind === 'exp') S.expenses = S.expenses.filter(function (x) { return x.id !== id; });
    else if (kind === 'ct') S.contributions = S.contributions.filter(function (w) { return w.id !== id; });
    else if (kind === 'wd') S.withdrawals = S.withdrawals.filter(function (w) { return w.id !== id; });
    else if (kind === 'customer') {
      if (!E.canDeleteCustomer(S, id)) { toast('Este cliente tem vendas e não pode ser excluído.'); return; }
      S.customers = S.customers.filter(function (c) { return c.id !== id; });
      if (ui.cust && ui.cust.id === id) ui.cust = null;
      ui.custOpen = null;
    } else if (kind === 'supplier') {
      if (E.supplierUsed(S, id)) { toast('Este fornecedor tem compras e não pode ser excluído.'); return; }
      S.suppliers = S.suppliers.filter(function (s) { return s.id !== id; });
    } else if (kind === 'product') {
      if (E.productUsed(S, id)) { toast('Este produto já tem compras, vendas ou ajustes e não pode ser excluído.'); return; }
      S.products = S.products.filter(function (p) { return p.id !== id; });
      S.quotes = S.quotes.filter(function (q) { return q.pid !== id; });
      if (ui.sale) ui.sale = null;
    }
    toast('Excluído.'); commit();
  }

  /* ---------- render ---------- */
  function render() {
    var d = E.derive(S), h;
    $('#crumb').innerHTML = crumbHTML();
    $('#alerts').innerHTML = alertsHTML(d);
    if (ui.tab === 'painel') h = viewPainel(d);
    else if (ui.tab === 'vendas') h = viewVendas();
    else if (ui.tab === 'clientes') h = viewClientes();
    else if (ui.tab === 'compras') h = viewCompras();
    else if (ui.tab === 'contas') h = viewContas();
    else if (ui.tab === 'cotar') h = viewCotar();
    else if (ui.tab === 'estoque') h = viewEstoque(d);
    else if (ui.tab === 'config') h = configHTML();
    else if (ui.tab === 'mais') h = maisHTML();
    else h = viewCadastros();
    $('#view').innerHTML = h;
    $('#tabs').innerHTML = navHTML();
    document.title = 'FeiraUP';
    refreshSyncUI();
  }

  /* ---------- eventos ---------- */
  function setPath(path, value) {
    var p = path.split('.'), o = ui[p[0]];
    for (var i = 1; i < p.length - 1; i++) { if (!o[p[i]] || typeof o[p[i]] !== 'object') o[p[i]] = {}; o = o[p[i]]; }
    o[p[p.length - 1]] = value;
  }

  document.addEventListener('toggle', function (e) { var t = e.target; if (t && t.dataset && t.dataset.keep) ui[t.dataset.keep] = t.open; }, true);

  document.addEventListener('submit', function (e) {
    e.preventDefault();
    var id = e.target.id;
    if (id === 'saleForm') submitSale();
    else if (id === 'custFormEl') submitCust();
    else if (id === 'purchForm') submitPurch();
    else if (id === 'billForm') submitBill();
    else if (id === 'wdForm') submitWd();
    else if (id === 'expForm') submitExp();
    else if (id === 'ctForm') submitCt();
    else if (id === 'supForm') submitSup();
    else if (id === 'prodForm') submitProd();
    else if (id === 'setForm') submitSettings();
    else if (id === 'bizForm') submitBiz();
    else if (id === 'saleEditForm') submitSaleEdit();
    else if (id === 'adjForm') submitAdj();
    else if (id === 'loginForm') submitLogin();
    else if (id === 'signupForm') submitSignup();
    else if (id === 'quoteForm') submitQuote();
  });

  var EMAIL_KEY = 'controle-cestas:email';
  function savedEmail() { try { return localStorage.getItem(EMAIL_KEY) || ''; } catch (e) { return ''; } }
  function rememberEmail(m) { try { localStorage.setItem(EMAIL_KEY, m); } catch (e) { /* ignore */ } }
  function submitLogin() {
    var mail = $('#g-mail').value.trim(), pass = $('#g-pass').value;
    if (!mail || !pass) { setMsg('login', 'bad', 'Informe e-mail e senha.'); return refreshSyncUI(); }
    var btn = $('#loginForm button'); btn.disabled = true; btn.textContent = 'Entrando…';
    window.Sync.login(mail, pass).then(function (r) {
      setMsg('login', r.ok ? null : 'bad', r.ok ? '' : r.error);
      if (r.ok) { rememberEmail(mail); toast('Bem-vindo!'); }
      gateSig = null; refreshSyncUI(); render();
    });
  }
  function submitSignup() {
    var mail = $('#g-mail').value.trim(), pass = $('#g-pass').value, pass2 = $('#g-pass2').value;
    var err = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail) ? 'Informe um e-mail válido.' : pass.length < 8 ? 'A senha precisa ter pelo menos 8 caracteres.' : pass !== pass2 ? 'As senhas não são iguais.' : null;
    if (err) { setMsg('login', 'bad', err); gateSig = null; return refreshSyncUI(); }
    var btn = $('#signupForm button'); btn.disabled = true; btn.textContent = 'Criando…';
    window.Sync.signup(mail, pass).then(function (r) {
      if (r.ok && r.confirm) { ui.gateMode = 'login'; setMsg('login', 'ok', 'Conta criada. Enviamos um e-mail de confirmação para ' + mail + '. Confirme e depois entre.'); }
      else setMsg('login', r.ok ? null : 'bad', r.ok ? '' : r.error);
      if (r.ok) rememberEmail(mail);
      if (r.ok && !r.confirm) toast('Conta criada. Bem-vindo!');
      gateSig = null; refreshSyncUI(); render();
    });
  }

  function submitAdj() {
    var a = ui.adj, p = prod(a.pid), c = E.parseNum(a.counted);
    var err = !p ? 'Escolha o produto.' : (isNaN(c) || c < 0) ? 'Informe a quantidade contada (zero ou mais).' : null;
    if (err) { setMsg('adj', 'bad', err); $('#adjMsg').innerHTML = msgHTML('adj'); return; }
    var cur = E.derive(S).stock[a.pid], delta = Math.round((c - cur) * 1e6) / 1e6;
    if (Math.abs(delta) < 1e-9) { setMsg('adj', 'info', 'A contagem é igual ao estoque do sistema. Nada a ajustar.'); $('#adjMsg').innerHTML = msgHTML('adj'); return; }
    S.adjustments.push({ id: E.uid(), pid: a.pid, delta: delta, date: E.today(), note: a.note.trim() });
    setMsg('adj', null); ui.adj = { pid: a.pid, counted: '', note: '' }; toast('Ajuste gravado.'); commit();
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.dataset.act;
    if (act === 'back') return navBack();
    if (act === 'go') { ui.armBulk = false; return go(b.dataset.tab, b.dataset.sub); }
    if (act === 'rcpt-close') return closeReceipt();
    if (act === 'rcpt-sale') return openReceipt(E.saleReceipt(S, b.dataset.id, E.today()));
    if (act === 'rcpt-pay') { var rs = E.byId(S.sales, b.dataset.sale), rp = rs && E.byId(rs.parcels, b.dataset.parcel); if (!rp) return; return openReceipt(E.baixaReceipt(S, entriesOfPay(rs, rp, Number(b.dataset.i)), E.today())); }
    if (act === 'rcpt-copy') return copyText(E.receiptText(ui.rcpt, bizInfo()));
    if (act === 'rcpt-pdf') return shareOrSavePdf(false);
    if (act === 'rcpt-dl') return shareOrSavePdf(true);
    if (act === 'est-view') { ui.ev = b.dataset.v; return render(); }
    if (act === 'plan-step') { ui.planMore = String(Math.max(0, planMore() + Number(b.dataset.d))); return render(); }
    if (act === 'cad-view') { ui.cadv = b.dataset.v; return render(); }
    if (act === 'cfg-view') { ui.cfgv = b.dataset.v; return render(); }
    if (act === 'theme-mode') { try { localStorage.setItem(THEME_KEY, b.dataset.v); } catch (e) { /* ignore */ } applyTheme(); return render(); }
    if (act === 'reload-app') return location.reload();
    if (act === 'menu') return toggleMenu();
    if (act === 'menu-close') return closeMenu();
    if (act === 'nav-mode') { try { localStorage.setItem(NAV_KEY, b.dataset.v); } catch (e) { /* ignore */ } applyNav(); return render(); }
    if (act === 'gate-mode') { ui.gateMode = b.dataset.mode; setMsg('login', null); gateSig = null; return refreshSyncUI(); }
    if (act === 'guest') { ui.guest = true; setMsg('login', null); gateSig = null; return render(); }
    if (act === 'leave-guest') { ui.guest = false; gateSig = null; return render(); }
    if (act === 'quote-pick') { ui.quote.pid = b.dataset.id; ui.quote.price = ''; ui.quote.qty = '1';
      var pb = packBase(b.dataset.id); ui.quote.qty = fin(pb.base); ui.quote.qtyWhy = pb.why;
      if (ui.tab !== 'cotar') ui.tab = 'cotar';
      render(); window.scrollTo(0, 0); var qp = $('#q-price'); if (qp) qp.focus(); return; }
    if (act === 'pay-mode') {
      var pst = payScope(b.dataset.scope); if (!pst) return;
      pst.payMode = b.dataset.m; if (pst.err) pst.err = '';
      if (b.dataset.scope === 'sale') { var pb2 = $('#payBox'); if (pb2) pb2.innerHTML = payBoxHTML(); } else renderPay();
      var pin = $('#pay-pix-' + b.dataset.scope); if (pin) pin.focus();
      return;
    }
    if (act === 'toggle-pass') {
      var pw = $('#g-pass'), show = pw.type === 'password'; pw.type = show ? 'text' : 'password';
      b.textContent = show ? 'Ocultar' : 'Mostrar'; b.setAttribute('aria-pressed', String(show)); return;
    }
    if (act === 'pay-from') { if (ui.payDlg) { ui.payDlg.from = b.dataset.m; renderPay(); } return; }
    if (act === 'pay-bill') { var bl = E.byId(S.payables, b.dataset.id); if (bl) openPay({ kind: 'bill', billId: bl.id, total: E.billOpen(bl), title: bl.desc }); return; }
    if (act === 'undo-bill') { var bu = E.byId(S.payables, b.dataset.id); if (bu) { E.undoBill(bu); toast('Pagamento desfeito.'); commit(); } return; }
    if (act === 'purch-from') { var pf = E.byId(S.purchases, b.dataset.id); if (pf) { if (pf.paidFrom === 'pessoal') delete pf.paidFrom; else pf.paidFrom = 'pessoal'; toast(pf.paidFrom === 'pessoal' ? 'Compra marcada como paga do seu bolso.' : 'Compra marcada como paga do caixa da feira.'); commit(); } return; }
    if (act === 'purch-bulk') {
      if (!ui.armBulk) { ui.armBulk = true; render(); return; }
      var cnt = 0; S.purchases.forEach(function (x) { if (!x.payableId && x.paidFrom !== 'pessoal') { x.paidFrom = 'pessoal'; cnt++; } });
      S.expenses.forEach(function (x) { if (x.from !== 'pessoal') { x.from = 'pessoal'; cnt++; } });
      ui.armBulk = false; toast(cnt + ' ' + plural(cnt, 'lançamento marcado', 'lançamentos marcados') + ' como do seu bolso.'); commit(); return;
    }
    if (act === 'exp-to-purch') {
      var xe = E.byId(S.expenses, b.dataset.id); if (!xe) return;
      var dr = newPurchDraft(); dr.mode = 'total'; dr.date = xe.date; dr.payHow = xe.from === 'pessoal' ? 'pessoal' : 'caixa'; dr.note = xe.desc || '';
      dr.fromExp = xe.id; dr.rows = [newPurchRow()]; dr.rows[0].total = fin(xe.amount);
      ui.purch = dr; ui.pk = 'merc'; setMsg('purch', 'info', 'Escolha o produto e a quantidade. O valor da despesa (' + E.money(xe.amount) + ') já está no total pago. Ao registrar, a despesa é removida.'); render();
      var pc2 = $('#purchCard'); if (pc2) pc2.scrollIntoView({ block: 'start' }); return;
    }
    if (act === 'purch-kind') { ui.pk = b.dataset.k; return render(); }
    if (act === 'edit-purch') {
      var pe = E.byId(S.purchases, b.dataset.id); if (!pe) return;
      ui.purch = purchDraftFrom(pe); ui.conv = null; ui.pk = 'merc'; render();
      var pc = $('#purchCard'); if (pc) pc.scrollIntoView({ block: 'start' }); return;
    }
    if (act === 'cancel-edit-purch') { ui.purch = null; setMsg('purch', null); return render(); }
    if (act === 'to-expense') { ui.conv = { id: b.dataset.id, cat: E.EXPENSE_CATS[0], method: lastPayMode() }; return render(); }
    if (act === 'conv-cancel') { ui.conv = null; return render(); }
    if (act === 'conv-ok') {
      var cv = ui.conv, pq = cv && E.byId(S.purchases, cv.id); if (!pq) { ui.conv = null; return render(); }
      var names = pq.items.map(function (it) { var pd = prod(it.pid); return pd ? pd.name : 'item'; }).join(', ');
      S.expenses.push({ id: E.uid(), date: pq.date, amount: E.purchaseTotal(pq), cat: cv.cat, desc: (pq.note ? pq.note + ' · ' : '') + names, method: cv.method, from: pq.paidFrom === 'pessoal' ? 'pessoal' : 'caixa' });
      S.purchases = S.purchases.filter(function (x) { return x.id !== pq.id; });
      ui.conv = null; toast('Compra transformada em despesa.'); commit(); return;
    }
    if (act === 'new-expense') { ui.pk = 'desp'; go('compras'); var xa = $('#x-amount'); if (xa) xa.focus(); return; }
    if (act === 'contas-view') { ui.cview = b.dataset.v; return render(); }
    if (act === 'exp-method' || act === 'exp-from') {
      var key = act === 'exp-method' ? 'method' : 'from'; ui.exp[key] = b.dataset.m;
      document.querySelectorAll('[data-act=' + act + ']').forEach(function (x) { x.setAttribute('aria-checked', String(x.dataset.m === b.dataset.m)); }); return;
    }
    if (act === 'ct-method') { ui.ct.method = b.dataset.m; document.querySelectorAll('[data-act=ct-method]').forEach(function (x) { x.setAttribute('aria-checked', String(x.dataset.m === ui.ct.method)); }); return; }
    if (act === 'wd-method') { ui.wd.method = b.dataset.m; document.querySelectorAll('[data-act=wd-method]').forEach(function (x) { x.setAttribute('aria-checked', String(x.dataset.m === ui.wd.method)); }); return; }
    if (act === 'pay-ok') return confirmPay();
    if (act === 'pay-cancel') return closePay();
    if (act === 'plan-reset') { delete S.settings.plan; commit(); return; }
    if (act === 'dash-detail') { ui.dashDet = ui.dashDet === b.dataset.k ? '' : b.dataset.k; render(); var dd = $('#dashDetail'); if (dd && ui.dashDet) dd.scrollIntoView({ block: 'nearest' }); return; }
    if (act === 'dash-open') {
      if (b.dataset.to === 'desp') { ui.pk = 'desp'; return go('compras'); }
      ui.vview = 'feitas'; ui.vf = { p: ui.dashP, cust: '', st: 'todas' }; return go('vendas');
    }
    if (act === 'dash-period') { ui.dashP = b.dataset.p; try { localStorage.setItem(PERIOD_KEY, ui.dashP); } catch (e) { /* ignore */ } return render(); }
    if (act === 'quote-mode') {
      var nm = b.dataset.mode, pr0 = E.parseNum(ui.quote.price), q0 = E.parseNum(ui.quote.qty);
      if (nm !== ui.quote.mode && !isNaN(pr0) && pr0 > 0 && !isNaN(q0) && q0 > 0) ui.quote.price = fin(E.round2(nm === 'unit' ? pr0 / q0 : pr0 * q0));
      ui.quote.mode = nm; try { localStorage.setItem(MODE_KEY, nm); } catch (e) { /* ignore */ }
      render(); var qp2 = $('#q-price'); if (qp2) qp2.focus(); return;
    }
    if (act === 'quote-packs') {
      var pk = packBase(ui.quote.pid), n = Number(b.dataset.n), pr1 = E.parseNum(ui.quote.price), q1 = E.parseNum(ui.quote.qty);
      // no modo "por fardo", o valor digitado acompanha a quantidade nova
      if (ui.quote.mode === 'total' && !isNaN(pr1) && pr1 > 0 && !isNaN(q1) && q1 > 0) ui.quote.price = fin(E.round2(pr1 / q1 * n * pk.base));
      ui.quote.qty = fin(n * pk.base); ui.quote.qtyWhy = pk.why;
      render(); var qp3 = $('#q-price'); if (qp3) qp3.focus(); return;
    }
    if (act === 'quote-clear') { ui.quote = { q: '', pid: '', price: '', qty: '1', mode: ui.quote.mode }; render(); var qs = $('#q-search'); if (qs) qs.focus(); return; }
    if (act === 'sync-now') { window.Sync.syncNow(); return; }
    if (act === 'sync-logout') { window.Sync.logout(); ui.guest = false; gateSig = null; toast('Você saiu. Os dados continuam neste aparelho.'); return render(); }
    if (act === 'sync-cloud' || act === 'sync-local') { window.Sync.resolve(act === 'sync-cloud' ? 'cloud' : 'local'); return refreshSyncUI(); }
    if (act === 'recv-parcel' || act === 'undo-parcel') {
      var sale = E.byId(S.sales, b.dataset.sale), p = sale && E.byId(sale.parcels, b.dataset.parcel);
      if (!p) return;
      if (act === 'recv-parcel') return openPay({ kind: 'parcel', saleId: sale.id, parcelId: p.id, total: E.aberto(p), title: custName(sale.customerId) + ' · parcela de ' + E.fdate(p.due) });
      E.undoParcel(p); toast('Recebimento desfeito.'); commit();
      return;
    }
    if (act === 'recv-customer') {
      var inp = $('#rc-' + b.dataset.id), v = E.parseNum(inp.value), box = $('#rcmsg-' + b.dataset.id);
      if (isNaN(v) || v <= 0) { box.innerHTML = '<div class="msg bad">Informe um valor maior que zero.</div>'; return; }
      var bal = E.customerBalance(S, b.dataset.id, E.today());
      if (v > bal.open + 0.004) { box.innerHTML = '<div class="msg bad">O valor passa do saldo em aberto (' + E.money(bal.open) + ').</div>'; return; }
      return openPay({ kind: 'customer', customerId: b.dataset.id, total: v, title: custName(b.dataset.id) + ' · abate das parcelas mais antigas' });
    }
    if (act === 'del') {
      if (b.dataset.armed) { return doDelete(b.dataset.kind, b.dataset.id); }
      b.dataset.armed = '1'; b.classList.add('armed'); b.textContent = 'Confirmar exclusão';
      setTimeout(function () { if (b.isConnected && b.dataset.armed) { delete b.dataset.armed; b.classList.remove('armed'); b.textContent = b.dataset.label; } }, 4000);
      return;
    }
    if (act === 'copy-basket') return copyText(basketText(ui.sale.items));
    if (act === 'vendas-view') { ui.vview = b.dataset.v; ui.dateEdit = null; ui.saleOpen = null; return render(); }
    if (act === 'apply-swap') {
      var o = ui.swapAdv && ui.swapAdv.options[Number(b.dataset.i)]; if (!o) return;
      o.removals.forEach(function (r) { ui.sale.items[r.pid] = r.to; });
      refreshSaleItems(); toast('Troca aplicada na cesta.'); return;
    }
    if (act === 'sale-term') { ui.sale.term = b.dataset.v; ui.sale.dues = {}; var stb = $('#ckTerm'); if (stb) stb.innerHTML = saleTermHTML(); return refreshCheckout(); }
    if (act === 'sale-confirm') return confirmSale();
    if (act === 'sale-cancel') { ui.saleModal = null; setMsg('sale', null); return renderSaleModal(); }
    if (act === 'sale-done-new') { ui.saleModal = null; renderSaleModal(); return render(); }
    if (act === 'sale-done-list') { ui.saleModal = null; renderSaleModal(); return go('vendas', 'feitas'); }
    if (act === 'sale-done-receipt') { var sm = ui.saleModal; if (sm && sm.id) openReceipt(E.saleReceipt(S, sm.id, E.today()), true); return; }
    if (act === 'sale-qty') {
      var nq = Math.max(1, Math.round(saleQty()) + Number(b.dataset.d)); ui.sale.qty = String(nq);
      var qi = $('#s-qty'); if (qi) qi.value = ui.sale.qty; return refreshSaleDyn();
    }
    if (act === 'swap-price') {
      var pr0 = E.parseNum(ui.sale.price); if (isNaN(pr0) || !ui.swapAdv) return;
      ui.sale.price = fin(E.round2(pr0 + ui.swapAdv.delta)); render(); toast('Preço ajustado para manter o lucro.'); return;
    }
    if (act === 'edit-paydate') {
      var se = E.byId(S.sales, b.dataset.sale), pe = se && E.byId(se.parcels, b.dataset.parcel), ie = Number(b.dataset.i), xe = pe && E.paysOf(se, pe)[ie];
      if (!xe) return;
      ui.dateEdit = { sale: se.id, parcel: pe.id, i: ie, date: xe.date, err: '' }; render();
      var di = $('#pd-input'); if (di) di.focus(); return;
    }
    if (act === 'edit-due') {
      var sd = E.byId(S.sales, b.dataset.sale), pd2 = sd && E.byId(sd.parcels, b.dataset.parcel);
      if (!pd2) return;
      ui.dateEdit = { sale: sd.id, parcel: pd2.id, i: -1, date: pd2.due, err: '' }; render();
      var dj = $('#pd-input'); if (dj) dj.focus(); return;
    }
    if (act === 'cancel-paydate') { ui.dateEdit = null; return render(); }
    if (act === 'save-paydate') {
      var de = ui.dateEdit; if (!de) return;
      var sv = E.byId(S.sales, de.sale), pv = sv && E.byId(sv.parcels, de.parcel);
      if (!pv) { ui.dateEdit = null; return render(); }
      var rs = de.i === -1 ? E.setDue(pv, de.date) : E.setPayDate(sv, pv, de.i, de.date);
      if (rs.error) { de.err = rs.error; render(); return; }
      ui.dateEdit = null; toast(de.i === -1 ? 'Data prevista alterada.' : 'Data do recebimento alterada.'); commit(); return;
    }
    if (act === 'copy-shop') return copyText(shopText(shopPlan()));
    if (act === 'copy-repl') {
      var d = E.derive(S);
      if (b.dataset.kind === 'min') return copyText(replText(E.replenish(S, S.settings.minCover, d), 'Reposição urgente'));
      if (b.dataset.kind === 'more') return copyText(replText(E.replenish(S, d.total + planMore(), d, { lastCost: true }), 'Compras para montar mais ' + planMore() + ' ' + plural(planMore(), 'cesta', 'cestas'), true));
      return copyText(replText(E.replenish(S, planT(), d), 'Reposição de estoque (meta ' + fin(planT()) + ' cestas)'));
    }
    if (act === 'open-cust') return openCust(b.dataset.id);
    if (act === 'close-cust') { ui.custOpen = null; render(); return window.scrollTo(0, 0); }
    if (act === 'open-sale') return openSale(b.dataset.id);
    if (act === 'edit-sale') { startSaleEdit(E.byId(S.sales, b.dataset.id)); render(); return window.scrollTo(0, 0); }
    if (act === 'se-cancel') { ui.saleEdit = null; render(); return window.scrollTo(0, 0); }
    if (act === 'se-add') { var sd0 = ui.saleEdit, lastD = sd0.parcels.length ? sd0.parcels[sd0.parcels.length - 1].due : sd0.date; sd0.parcels.push({ id: null, amount: '', due: E.addDays(lastD, 30), got: 0, kind: '' }); $('#seRows').innerHTML = seRowsHTML(); $('#seSum').innerHTML = seSummaryHTML(); var na = $('#se-a' + (sd0.parcels.length - 1)); if (na) na.focus(); return; }
    if (act === 'se-del') { ui.saleEdit.parcels.splice(Number(b.dataset.i), 1); $('#seRows').innerHTML = seRowsHTML(); $('#seSum').innerHTML = seSummaryHTML(); return; }
    if (act === 'se-fit') {
      var sd1 = ui.saleEdit, tot = seTotal(), n = sd1.parcels.length; if (isNaN(tot) || !n) return;
      var others = 0; sd1.parcels.forEach(function (x, i) { if (i < n - 1) { var v = E.parseNum(x.amount); others += isNaN(v) ? 0 : v; } });
      sd1.parcels[n - 1].amount = fin(E.round2(tot - others)); $('#seRows').innerHTML = seRowsHTML(); $('#seSum').innerHTML = seSummaryHTML(); return;
    }
    if (act === 'se-replan') {
      var sd2 = ui.saleEdit, tot2 = seTotal(), sl = E.byId(S.sales, sd2.id); if (isNaN(tot2) || !sl || !E.validISO(sd2.date)) { sd2.err = ['Confira cestas, preço e data antes de refazer as parcelas.']; return render(); }
      var cur = sd2.parcels.map(function (x) { var o = E.byId(sl.parcels, x.id); return o ? { id: o.id, amount: E.parseNum(x.amount), due: x.due, received: o.received, paid: o.paid, kind: o.kind, pays: o.pays } : null; }).filter(Boolean);
      var np = E.replanOpen(cur, tot2, sd2.date, b.dataset.t);
      sd2.parcels = np.map(function (x) { var o = x.id && E.byId(sl.parcels, x.id); return { id: x.id, amount: fin(x.amount), due: x.due, got: o ? E.recebido(o) : 0, kind: x.kind || '' }; });
      sd2.err = []; return render();
    }
    if (act === 'close-sale') { ui.saleOpen = null; ui.saleEdit = null; ui.dateEdit = null; render(); return window.scrollTo(0, 0); }
    if (act === 'new-cust') { ui.cust = newCustDraft(); go('cadastros', 'cli'); var nf = $('#custForm'); if (nf) nf.scrollIntoView(); return; }
    if (act === 'edit-cust') { ui.cust = custDraftFrom(E.byId(S.customers, b.dataset.id)); go('cadastros', 'cli'); var f = $('#custForm'); if (f) f.scrollIntoView(); return; }
    if (act === 'cancel-cust') { ui.cust = null; setMsg('cust', null); return render(); }
    if (act === 'edit-sup') { var s = E.byId(S.suppliers, b.dataset.id); ui.sup = { id: s.id, name: s.name, address: s.address, phone: s.phone, doc: s.doc }; render(); return $('#supForm').scrollIntoView(); }
    if (act === 'cancel-sup') { ui.sup = null; return render(); }
    if (act === 'new-prod') { ui.prod = newProdDraft(); go('cadastros', 'prod'); var pn = $('#p-name'); if (pn) { pn.scrollIntoView({ block: 'center' }); pn.focus(); } return; }
    if (act === 'edit-prod') { var pr = prod(b.dataset.id); ui.prod = { id: pr.id, name: pr.name, cat: pr.cat, unit: pr.unit, perBasket: fin(pr.perBasket), packSize: fin(pr.packSize), packLabel: pr.packLabel, group: pr.group || '' }; go('cadastros', 'prod'); var pf0 = $('#p-name'); if (pf0) { pf0.scrollIntoView({ block: 'center' }); pf0.focus(); } return; }
    if (act === 'cancel-prod') { ui.prod = null; return render(); }
    if (act === 'add-row') { ui.purch.rows.push(newPurchRow()); $('#purchRows').innerHTML = purchRowsHTML(); var np = $('#pr-p' + (ui.purch.rows.length - 1)); if (np) np.focus(); return; }
    if (act === 'pr-mode') {
      var nm2 = b.dataset.m;
      if (nm2 !== ui.purch.mode) {
        ui.purch.rows.forEach(function (r) { var v = E.parseNum(r.total), q = E.parseNum(r.qty); if (!isNaN(v) && v > 0 && !isNaN(q) && q > 0) r.total = fin(E.round2(nm2 === 'unit' ? v / q : v * q)); });
        ui.purch.mode = nm2; try { localStorage.setItem(PMODE_KEY, nm2); } catch (e) { /* ignore */ }
        $('#purchRows').innerHTML = purchRowsHTML();
        document.querySelectorAll('[data-act=pr-mode]').forEach(function (x) { x.setAttribute('aria-checked', String(x.dataset.m === nm2)); });
        $('#purchTotal').textContent = E.money(purchTotal());
      }
      return;
    }
    if (act === 'pr-packs') {
      var pr0 = ui.purch.rows[Number(b.dataset.i)], pk0 = packBase(pr0.pid), n0 = Number(b.dataset.n), v0 = E.parseNum(pr0.total), q0p = E.parseNum(pr0.qty);
      if (ui.purch.mode === 'total' && !isNaN(v0) && v0 > 0 && !isNaN(q0p) && q0p > 0) pr0.total = fin(E.round2(v0 / q0p * n0 * pk0.base));
      pr0.qty = fin(n0 * pk0.base); pr0.qtyWhy = pk0.why;
      $('#purchRows').innerHTML = purchRowsHTML(); $('#purchTotal').textContent = E.money(purchTotal()); var tq = $('#pr-t' + b.dataset.i); if (tq) tq.focus(); return;
    }
    if (act === 'pr-uselast') {
      var pr1 = ui.purch.rows[Number(b.dataset.i)], ls = E.priceHistory(S, pr1.pid).last, q1p = E.parseNum(pr1.qty);
      if (ls) { if (isNaN(q1p) || q1p <= 0) { pr1.qty = fin(ls.qty); q1p = ls.qty; } pr1.total = fin(E.round2(ui.purch.mode === 'unit' ? ls.unit : ls.unit * q1p)); }
      $('#purchRows').innerHTML = purchRowsHTML(); $('#purchTotal').textContent = E.money(purchTotal()); return;
    }
    if (act === 'rm-row') { ui.purch.rows.splice(Number(b.dataset.i), 1); $('#purchRows').innerHTML = purchRowsHTML(); $('#purchTotal').textContent = E.money(purchTotal()); return; }
    if (act === 'undo-adj') { S.adjustments = S.adjustments.filter(function (a) { return a.id !== b.dataset.id; }); toast('Ajuste desfeito.'); return commit(); }
    if (act === 'export') { ui.exportText = JSON.stringify({ v: 1, state: S }, null, 2); setMsg('bk', 'ok', 'Dados exportados abaixo. Copie o texto ou baixe o arquivo.'); return render(); }
    if (act === 'download') {
      var blob = new Blob([JSON.stringify({ v: 1, state: S }, null, 2)], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'feiraup-' + E.today() + '.json'; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); return;
    }
    if (act === 'restore-prev') {
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Confirmar: trocar os dados atuais'; setTimeout(function () { if (b.isConnected) { delete b.dataset.armed; b.textContent = b.dataset.label; } }, 4000); return; }
      var pv = loadPrev(); if (!pv || !pv.state) return;
      savePrev('antes de restaurar uma cópia');
      S = E.migrate(pv.state.state ? pv.state : { v: 1, state: pv.state });
      ui.sale = ui.purch = ui.cust = ui.sup = ui.prod = ui.adj = null;
      toast('Cópia restaurada.'); return commit();
    }
    if (act === 'import') {
      if (!b.dataset.armed) {
        b.dataset.armed = '1'; b.classList.add('armed'); b.textContent = 'Confirmar importação';
        setTimeout(function () { if (b.isConnected && b.dataset.armed) { delete b.dataset.armed; b.classList.remove('armed'); b.textContent = b.dataset.label; } }, 4000);
        return;
      }
      var txt = $('#bk-text').value.trim(), parsed;
      try { parsed = JSON.parse(txt); if (!parsed || typeof parsed !== 'object') throw new Error('x'); } catch (er) { setMsg('bk', 'bad', 'O texto não é um JSON válido.'); return render(); }
      S = E.migrate(parsed); ui.sale = ui.purch = ui.cust = ui.sup = ui.prod = ui.adj = null; ui.exportText = '';
      setMsg('bk', 'ok', 'Dados importados.'); toast('Dados importados.'); return commit();
    }
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'q-place') { ui.place = t.value; savePlace(t.value); if (ui.quote.pid) $('#quoteOut').innerHTML = quoteHTML(); return; }
    if (t.id === 'q-search') { ui.quote.q = t.value; ui.quote.pid = ''; $('#quoteOut').innerHTML = quoteHTML(); return; }
    if (t.dataset.quote) { ui.quote[t.dataset.quote] = t.value; if (t.dataset.quote === 'qty') ui.quote.qtyWhy = ''; var qo = $('#quoteResult'); if (qo) qo.innerHTML = quoteResultHTML(); return; }
    if (t.dataset.sepf && ui.saleEdit) { ui.saleEdit.parcels[Number(t.dataset.sei)][t.dataset.sepf] = t.value; var ss = $('#seSum'); if (ss) ss.innerHTML = seSummaryHTML(); return; }
    if (t.dataset.bind && t.dataset.bind.indexOf('saleEdit.') === 0 && ui.saleEdit) { setPath(t.dataset.bind, t.value); var ss2 = $('#seSum'); if (ss2) ss2.innerHTML = seSummaryHTML(); return; }
    if (t.id === 'plan-more') { ui.planMore = t.value.replace(/\D/g, ''); $('#planMoreOut').innerHTML = moreOutHTML(E.derive(S)); return; }
    if (t.id === 'plan-t') { ui.planT = t.value; $('#planOut').innerHTML = planHTML(E.derive(S)); return; }
    if (t.dataset.search) {
      ui.prodQ = t.value;
      var box = t.dataset.search === 'cad' ? $('#cadList') : $('#stockList');
      if (box) box.innerHTML = t.dataset.search === 'cad' ? cadProdListHTML(ui.prodQ, E.derive(S)) : ui.stockListFn(ui.prodQ);
      return;
    }
    if (t.dataset.pay) {
      var ps = payScope(t.dataset.scope); if (!ps) return;
      ps.payPix = t.value; var pr = $('#pay-rest-' + t.dataset.scope); if (pr) pr.textContent = payRestText(Number(t.dataset.total), ps); return;
    }
    if (t.dataset.datefield) { if (ui.dateEdit) ui.dateEdit.date = t.value; return; }
    if (t.dataset.due != null && t.dataset.due !== '') { ui.sale.dues[t.dataset.due] = t.value; return; }
    if (t.dataset.item) { ui.sale.items[t.dataset.item] = Math.max(0, E.num(E.parseNum(t.value))); refreshSaleDyn(); return; }
    if (t.dataset.cmod) { ui.cust.modsStr[t.dataset.cmod] = t.value; return; }
    if (t.dataset.row != null) {
      var r = ui.purch.rows[Number(t.dataset.row)]; r[t.dataset.f] = t.value;
      if (t.dataset.f === 'qty' || t.dataset.f === 'total') { $('#purchTotal').textContent = E.money(purchTotal()); var lv = $('#pr-live-' + t.dataset.row); if (lv) lv.innerHTML = prLiveHTML(r); }
      return;
    }
    if (t.dataset.bind && t.tagName !== 'SELECT') {
      setPath(t.dataset.bind, t.value);
      if (t.dataset.bind === 'sale.qty' || t.dataset.bind === 'sale.price' || t.dataset.bind === 'sale.entrada' || t.dataset.bind === 'sale.fiadoDue' || t.dataset.bind === 'sale.date') refreshSaleDyn();
    }
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.row != null && t.tagName === 'SELECT') {
      var rw = ui.purch.rows[Number(t.dataset.row)]; rw[t.dataset.f] = t.value;
      if (t.dataset.f === 'pid') {
        var pkx = t.value && t.value !== '__new' ? packBase(t.value) : { base: 1, why: '' };
        if (pkx.why) { rw.qty = fin(pkx.base); rw.qtyWhy = pkx.why; } else { rw.qtyWhy = ''; }
        $('#purchRows').innerHTML = purchRowsHTML(); $('#purchTotal').textContent = E.money(purchTotal());
        var nq0 = $('#pr-' + (rw.qty ? 't' : 'q') + t.dataset.row); if (nq0 && t.value && t.value !== '__new') nq0.focus();
      }
      return;
    }
    if (t.dataset.plan) {
      var np = Object.assign({}, S.settings.plan || {}); np[t.dataset.plan] = t.value.trim(); S.settings.plan = np; commit(); return;
    }
    if (t.dataset.grp) { ui.sale.grp = ui.sale.grp || {}; ui.sale.grp[t.dataset.grp] = t.value; E.setGroupMode(S, t.dataset.grp, t.value, ui.sale.items); return refreshSaleItems(); }
    if (!t.dataset.bind) return;
    var path = t.dataset.bind;
    setPath(path, t.value);
    if (path === 'sale.customerId') {
      var c = E.byId(S.customers, t.value);
      ui.sale.items = E.buildSaleItems(S, c, null); ui.sale.grp = detectGrps(ui.sale.items);
      var nb = $('#newNameBox'); if (nb) nb.hidden = !!t.value;
      refreshSaleItems();
    } else if (path === 'purch.payHow') {
      var pdb = $('#payDueBox'); if (pdb) pdb.hidden = t.value !== 'prazo';
    } else if (path === 'sale.date') refreshSaleDyn();
    else if (path === 'adj.pid' || path.indexOf('vf.') === 0) render();
  });

  document.addEventListener('focusin', function (e) { if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) document.body.classList.add('kb'); });
  document.addEventListener('focusout', function () { setTimeout(function () { var a = document.activeElement; if (!a || !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) document.body.classList.remove('kb'); }, 50); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (ui.rcpt) closeReceipt(); else if (ui.payDlg) closePay(); } });
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });

  S = load();
  if (window.Sync) window.Sync.init({ getState: function () { return S; }, applyRemote: applyRemote, hadSavedData: hadSaved, onChange: refreshSyncUI });
  else window.Sync = { status: function () { return { code: 'off', signedIn: false }; }, changed: function () {}, init: function () {} };
  try { var qt = new URLSearchParams(location.search).get('tab'); if (qt && TABS.some(function (t) { return t[0] === qt; })) ui.tab = qt; } catch (e) { /* ignore */ }
  applyNav(); applyTheme();
  render();
  // depois de qualquer ação, se a tela mudou, guarda a anterior (ou volta, se a ação foi "fechar" e reabriu a tela de antes)
  document.addEventListener('click', function () {
    var before = navBefore; navBefore = null; if (!before) return;
    var now = navSnap(); if (navSame(before, now)) return;
    var top = navStack[navStack.length - 1];
    if (top && navSame(top, now)) { try { history.back(); } catch (e) { navRestore(); } return; }
    navPush(before); $('#crumb').innerHTML = crumbHTML();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
  var deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function (ev) { ev.preventDefault(); deferredInstall = ev; var b = $('#installBtn'); if (b) b.hidden = false; });
  window.addEventListener('appinstalled', function () { deferredInstall = null; var b = $('#installBtn'); if (b) b.hidden = true; toast('App instalado.'); });
  var ib = $('#installBtn'); if (ib) ib.addEventListener('click', function () { if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; ib.hidden = true; } });
  window.__app = { get state() { return S; }, render: render, go: go, commit: commit, applyRemote: applyRemote };
})();
