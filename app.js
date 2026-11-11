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
  function applyRemote(remoteState) {
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
    ['cotar', 'Cotar', '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.3"/>'],
    ['estoque', 'Estoque', '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>'],
    ['cadastros', 'Cadastros', '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>']
  ];
  function go(tab) { ui.tab = tab; render(); window.scrollTo(0, 0); }

  /* ---------- alertas ---------- */
  function alertsHTML(d) {
    var a = E.alerts(S, d), h = '';
    function ban(cls, html, label, tab) {
      return '<div class="banner ' + cls + '" role="status"><div>' + html + '</div><button class="btn small ' + (cls === 'bad' ? 'danger' : 'ghost') + '" data-act="go" data-tab="' + tab + '">' + label + '</button></div>';
    }
    if (a.urgent) {
      var names = a.urgent.items.map(function (i) { return esc(i.name) + ' (' + i.cov + ')'; }).join(', ');
      h += ban('bad', '<b>Reposição urgente.</b> O estoque cobre ' + a.urgent.total + ' ' + plural(a.urgent.total, 'cesta', 'cestas') + '; o mínimo é ' + fin(a.urgent.min) + '. Abaixo do mínimo: ' + names, 'Ver estoque', 'estoque');
    } else if (a.near) {
      h += ban('warn', '<b>Perto do mínimo.</b> O estoque cobre ' + a.near.total + ' ' + plural(a.near.total, 'cesta', 'cestas') + '; o mínimo é ' + fin(a.near.min) + '.', 'Ver estoque', 'estoque');
    }
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
  function ppHTML(cur, prev) {
    if (prev == null) return '';
    var d = Math.round((cur - prev) * 1000) / 10;
    if (Math.abs(d) < 0.05) return '<span class="delta flat">= igual</span>';
    return '<span class="delta ' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '▲ ' : '▼ ') + fin(Math.abs(d)) + ' p.p.</span>';
  }
  function dashKpisHTML(db) {
    var c = db.cur, pv = db.prev, cmp = db.cmp;
    function kpi(label, value, delta, prevTxt, cls) {
      return '<div class="kpi dk ' + (cls || '') + '"><span>' + label + '</span><b>' + value + '</b><div class="dk-foot">' + delta + (prevTxt ? '<small>' + prevTxt + '</small>' : '') + '</div></div>';
    }
    var pl = db.range.plabel ? 'antes: ' : '';
    var h = '<section class="card span2"><h2>Resultado do período</h2><div class="seg four" role="tablist" aria-label="Período">' +
      PERIODS.map(function (x) { return '<button type="button" role="tab" aria-selected="' + (ui.dashP === x[0]) + '" data-act="dash-period" data-p="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      (db.prev ? '<p class="sub"><small>Comparando ' + esc(db.range.label) + ' com ' + esc(db.range.plabel) + '.</small></p>' : '<p class="sub"><small>Todas as vendas registradas.</small></p>') +
      '<div class="kpis dks">' +
      kpi('Faturamento', E.money(c.revenue), deltaHTML(cmp.revenue), pv ? pl + E.money(pv.revenue) : '') +
      kpi('Lucro bruto', E.money(c.profit), deltaHTML(cmp.profit), pv ? pl + E.money(pv.profit) : '', c.profit < 0 ? 'bad' : 'ok') +
      kpi('Margem', fin(Math.round(c.margin * 1000) / 10) + '%', ppHTML(c.margin, pv ? pv.margin : null), pv ? pl + fin(Math.round(pv.margin * 1000) / 10) + '%' : '') +
      kpi('Cestas vendidas', fin(c.qty), deltaHTML(cmp.qty), pv ? pl + fin(pv.qty) : '') +
      kpi('Ticket médio', E.money(c.ticket), deltaHTML(cmp.ticket), pv ? pl + E.money(pv.ticket) : '') +
      kpi('Clientes atendidos', String(c.customers), '', c.sales + ' ' + plural(c.sales, 'venda', 'vendas')) +
      '</div>' +
      (c.sales === 0 ? '<div class="msg info">Nenhuma venda neste período.</div>' : '') +
      (c.partialCost && c.sales ? '<div class="msg warn">Lucro estimado: falta registrar a compra de alguns itens da cesta, então o custo está incompleto.</div>' : '') +
      '<p class="sub"><small>Lucro bruto = vendas menos o custo dos itens da cesta (pelo último preço de compra). Não inclui embalagem, transporte, taxas nem inadimplência.</small></p></section>';
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
    var h = '<div class="grid two">';

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
      '<p class="sub" style="margin-top:8px"><small>O lucro bruto não inclui embalagem, transporte, taxas nem inadimplência.</small></p></section>';

    h += '<section class="card"><h2>Caixa</h2><div class="kpis">' +
      '<div class="kpi"><b>' + E.money(cash.invested) + '</b><span>Investido em compras</span></div>' +
      '<div class="kpi ok"><b>' + E.money(cash.received) + '</b><span>Já recebido</span></div>' +
      '<div class="kpi"><b>' + E.money(cash.open) + '</b><span>A receber</span></div>' +
      '<div class="kpi ' + (cash.late > 0 ? 'bad' : '') + '"><b>' + E.money(cash.late) + '</b><span>Atrasado</span></div>' +
      '<div class="kpi ' + (cash.balance < 0 ? 'bad' : 'ok') + '" style="grid-column:1/-1"><b>' + E.money(cash.balance) + '</b><span>Saldo (recebido − investido)</span></div></div></section>';

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
    var t = E.today();
    return { date: t, qty: '1', customerId: '', newName: '', price: fin(S.settings.price), term: S.settings.term, fiadoDue: E.addDays(t, 30), entrada: '', payMode: lastPayMode(), payPix: '', rice: 'mix', items: E.buildSaleItems(S, null, null) };
  }
  function detectRice(items) {
    var rice = S.products.filter(E.isRice), kg = E.num(S.settings.riceKg);
    for (var i = 0; i < rice.length; i++) {
      var ok = Math.abs(E.num(items[rice[i].id]) - kg) < 1e-9;
      for (var j = 0; j < rice.length && ok; j++) if (j !== i && E.num(items[rice[j].id]) > 1e-9) ok = false;
      if (ok) return rice[i].id;
    }
    return 'mix';
  }
  function saleQty() { var q = E.parseNum(ui.sale.qty); return isNaN(q) ? 0 : q; }

  function saleItemsHTML() {
    var d = ui.sale, rice = S.products.filter(E.isRice), h = '';
    if (rice.length) {
      h += '<div class="field"><label for="s-rice">Tipo do arroz (' + fin(S.settings.riceKg) + ' kg por cesta)</label><select id="s-rice" data-bind="sale.rice">' +
        rice.map(function (p) { return '<option value="' + p.id + '"' + (d.rice === p.id ? ' selected' : '') + '>Só ' + esc(p.name) + '</option>'; }).join('') +
        '<option value="mix"' + (d.rice === 'mix' ? ' selected' : '') + '>Misturar tipos</option></select></div>';
    }
    h += '<label>Itens por cesta</label><div class="items-edit">' + S.products.map(function (p) {
      var isR = E.isRice(p), editable = !isR || d.rice === 'mix';
      return '<div class="ie"><span>' + esc(p.name) + '<small>' + (isR ? 'arroz, kg' : 'padrão ' + fin(p.perBasket) + ' ' + p.unit) + '</small></span>' +
        '<input type="text" inputmode="decimal" aria-label="' + esc(p.name) + ' por cesta" data-item="' + p.id + '" value="' + fin(d.items[p.id] || 0) + '"' + (editable ? '' : ' readonly') + '></div>';
    }).join('') + '</div><small>Para tirar um item da cesta, deixe em 0.</small>';
    return h;
  }

  function saleCheckHTML() {
    var d = ui.sale, qty = saleQty(), chk = E.checkSale(S, qty, d.items), h = '<label>Conferência antes de vender</label>';
    var rice = S.products.filter(E.isRice);
    if (rice.length) h += '<div class="check-row' + (chk.riceOk ? '' : ' bad') + '"><span>Arroz da cesta</span><span>' + fin(chk.riceSum) + ' de ' + fin(S.settings.riceKg) + ' kg ' + (chk.riceOk ? badge('ok', 'ok') : badge('bad', 'ajustar')) + '</span></div>';
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
  function payLabel(sale, p) {
    var list = E.paysOf(sale, p), by = {};
    list.forEach(function (x) { var k = x.method || ''; by[k] = E.round2((by[k] || 0) + x.amount); });
    var keys = Object.keys(by).filter(function (k) { return k; });
    if (!keys.length) return '';
    return keys.map(function (k) { return E.methodName(k) + (keys.length > 1 || by[''] ? ' ' + E.money(by[k]) : ''); }).join(' + ');
  }

  /* janela para escolher como o valor foi recebido */
  function openPay(cfg) {
    ui.payDlg = { kind: cfg.kind, saleId: cfg.saleId, parcelId: cfg.parcelId, customerId: cfg.customerId, total: E.round2(cfg.total), title: cfg.title, payMode: lastPayMode(), payPix: '', err: '' };
    renderPay();
    var f = document.querySelector('#payModal [data-act="pay-ok"]'); if (f) f.focus();
  }
  function closePay() { ui.payDlg = null; renderPay(); }
  function renderPay() {
    var root = $('#payModal'), d = ui.payDlg;
    if (!root) { root = document.createElement('div'); root.id = 'payModal'; document.body.appendChild(root); }
    if (!d) { root.innerHTML = ''; root.hidden = true; document.body.classList.remove('modal-open'); return; }
    root.hidden = false; document.body.classList.add('modal-open');
    root.innerHTML = '<div class="scrim" data-act="pay-cancel"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="pay-title">' +
      '<h2 id="pay-title">Receber ' + E.money(d.total) + '</h2><p class="sub">' + esc(d.title) + '</p>' +
      '<div class="field"><label>Como foi pago?</label>' + payPickerHTML('dlg', d.total) + '</div>' +
      (d.err ? '<div class="msg bad" role="alert">' + esc(d.err) + '</div>' : '') +
      '<div class="actions"><button type="button" class="btn big" data-act="pay-ok">Confirmar recebimento</button><button type="button" class="btn ghost" data-act="pay-cancel">Cancelar</button></div></div>';
  }
  function confirmPay() {
    var d = ui.payDlg; if (!d) return;
    var sp = E.splitPay(d.total, d.payMode, d.payPix);
    if (sp.error) { d.err = sp.error; return renderPay(); }
    rememberPayMode(d.payMode);
    if (d.kind === 'parcel') {
      var sale = E.byId(S.sales, d.saleId), p = sale && E.byId(sale.parcels, d.parcelId);
      if (!p) return closePay();
      E.receiveParcel(p, E.today(), sp.splits);
      toast('Recebimento registrado.');
    } else {
      var r = E.receiveForCustomer(S, d.customerId, d.total, E.today(), sp.splits);
      var ci = $('#rc-' + d.customerId); if (ci) ci.value = '';
      toast(E.money(r.applied) + ' abatidos das parcelas mais antigas.');
    }
    closePay(); commit();
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

  function refreshSaleDyn() { var a = $('#saleCheck'), b = $('#salePreview'), c = $('#payBox'); if (a) a.innerHTML = saleCheckHTML(); if (b) b.innerHTML = salePreviewHTML(); if (c) c.innerHTML = payBoxHTML(); }
  function refreshSaleItems() { var a = $('#saleItems'); if (a) a.innerHTML = saleItemsHTML(); refreshSaleDyn(); }

  function viewVendas() {
    if (!ui.sale) ui.sale = newSaleDraft();
    var d = ui.sale;
    var custs = S.customers.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'pt-BR'); });
    var h = '<section class="card"><h2>Nova venda</h2><form id="saleForm" novalidate>' +
      '<div class="row"><div class="field"><label for="s-date">Data</label><input id="s-date" type="date" data-bind="sale.date" value="' + d.date + '"></div>' +
      '<div class="field"><label for="s-qty">Nº de cestas</label><input id="s-qty" type="text" inputmode="numeric" data-bind="sale.qty" value="' + esc(d.qty) + '"></div></div>' +
      '<div class="field"><label for="s-cust">Cliente</label><select id="s-cust" data-bind="sale.customerId"><option value="">— Novo cliente —</option>' +
      custs.map(function (c) { return '<option value="' + c.id + '"' + (d.customerId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field" id="newNameBox"' + (d.customerId ? ' hidden' : '') + '><label for="s-new">Nome do novo cliente</label><input id="s-new" type="text" autocomplete="off" data-bind="sale.newName" value="' + esc(d.newName) + '"></div>' +
      '<div class="row"><div class="field"><label for="s-price">Preço por cesta (R$)</label><input id="s-price" type="text" inputmode="decimal" data-bind="sale.price" value="' + esc(d.price) + '"></div>' +
      '<div class="field"><label for="s-term">Prazo</label><select id="s-term" data-bind="sale.term">' +
      [['30-60', '30 e 60 dias'], ['avista', 'À vista'], ['30', '30 dias'], ['fiado', 'Fiado (vencimento escolhido)']].map(function (o) { return '<option value="' + o[0] + '"' + (d.term === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="row"><div class="field" id="fiadoBox"' + (d.term === 'fiado' ? '' : ' hidden') + '><label for="s-fiado">Vencimento do fiado</label><input id="s-fiado" type="date" data-bind="sale.fiadoDue" value="' + d.fiadoDue + '"></div>' +
      '<div class="field" id="entradaBox"' + (d.term === 'avista' ? ' hidden' : '') + '><label for="s-entrada">Entrada (R$, opcional)</label><input id="s-entrada" type="text" inputmode="decimal" data-bind="sale.entrada" value="' + esc(d.entrada) + '"></div></div>' +
      '<div id="payBox">' + payBoxHTML() + '</div>' +
      '<div id="salePreview">' + salePreviewHTML() + '</div>' +
      '<div id="saleItems" style="margin-top:12px">' + saleItemsHTML() + '</div>' +
      '<div id="saleCheck" style="margin-top:12px">' + saleCheckHTML() + '</div>' +
      '<div id="saleMsg">' + msgHTML('sale') + '</div>' +
      '<div class="actions"><button type="submit" class="btn">Registrar venda</button><button type="button" class="btn ghost" data-act="copy-basket">Copiar conteúdo da cesta</button></div></form></section>';

    var sales = S.sales.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    h += '<section class="card"><h2>Vendas registradas</h2>';
    if (!sales.length) h += '<div class="empty">Nenhuma venda registrada ainda.</div>';
    else h += '<div class="list">' + sales.map(function (s) {
      var parcels = s.parcels.slice().sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; });
      return '<div class="item"><div class="head"><b>' + esc(custName(s.customerId)) + '</b><small>' + E.fdate(s.date) + '</small></div>' +
        '<small>' + s.qty + ' ' + plural(s.qty, 'cesta', 'cestas') + ' × ' + E.money(s.price) + (s.mods && s.mods.length ? ' · cesta personalizada' : '') + '</small>' +
        '<div class="stats" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div><b>' + E.money(E.saleTotal(s)) + '</b><span>Total</span></div><div><b style="color:' + (E.saleProfit(s) < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + E.money(E.saleProfit(s)) + '</b><span>Lucro bruto</span></div></div>' +
        parcels.map(function (p) {
          var st = E.parcelStatus(p).map(function (x) { return badge(x.cls, x.text); }).join(' ');
          var open = E.isOpen(p), rec = E.recebido(p);
          return '<div class="parcel"><div class="info"><b>' + E.money(p.amount) + '</b> <small>' + (p.kind === 'entrada' ? 'entrada' : p.kind === 'avista' ? 'à vista' : 'vence ' + E.fdate(p.due)) + '</small><br>' + st + (open && rec > 0.004 ? ' <small>recebido ' + E.money(rec) + '</small>' : '') + (rec > 0.004 && payLabel(s, p) ? ' <small>· ' + esc(payLabel(s, p)) + '</small>' : '') + '</div>' +
            '<div class="btns">' + (open ? '<button class="btn small" data-act="recv-parcel" data-sale="' + s.id + '" data-parcel="' + p.id + '">Receber</button>' : '') +
            (rec > 0.004 ? '<button class="btn small ghost" data-act="undo-parcel" data-sale="' + s.id + '" data-parcel="' + p.id + '">Desfazer</button>' : '') + '</div></div>';
        }).join('') +
        '<div class="actions"><button class="btn small danger" data-act="del" data-kind="sale" data-id="' + s.id + '" data-label="Excluir venda">Excluir venda</button></div></div>';
    }).join('') + '</div>';
    h += '</section>';
    return h;
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

  function submitSale() {
    var d = ui.sale;
    var entrada = E.parseNum(d.entrada), cash = saleCashNow(), pay = null;
    if (cash > 0) {
      var sp = E.splitPay(cash, d.payMode, d.payPix);
      if (sp.error) { setMsg('sale', 'bad', sp.error); var m0 = $('#saleMsg'); if (m0) m0.innerHTML = msgHTML('sale'); return; }
      pay = sp.splits;
    }
    var res = E.makeSale(S, {
      qty: saleQty(), date: d.date, price: E.parseNum(d.price), customerId: d.customerId, newName: d.newName,
      items: d.items, term: d.term, entrada: isNaN(entrada) ? 0 : entrada, fiadoDue: d.fiadoDue, pay: pay
    });
    if (res.errors.length) { setMsg('sale', 'bad', res.errors); var m = $('#saleMsg'); if (m) m.innerHTML = msgHTML('sale'); return; }
    if (res.newCustomer) S.customers.push(res.newCustomer);
    S.sales.push(res.sale);
    if (pay) rememberPayMode(d.payMode);
    setMsg('sale', null); ui.sale = null;
    toast('Venda registrada.'); commit();
  }

  /* ---------- CLIENTES ---------- */
  function riceModeOf(mods) { return detectRice(mods || {}); }
  function newCustDraft() { return { id: null, name: '', phone: '', address: '', note: '', rice: '', modsStr: {} }; }
  function custDraftFrom(c) {
    var rice = S.products.filter(E.isRice), hasRice = rice.some(function (p) { return c.mods && c.mods[p.id] != null; });
    var ms = {};
    Object.keys(c.mods || {}).forEach(function (pid) { var p = prod(pid); if (p && !E.isRice(p)) ms[pid] = fin(c.mods[pid]); });
    var rm = hasRice ? riceModeOf(c.mods) : '';
    return { id: c.id, name: c.name, phone: c.phone, address: c.address, note: c.note, rice: rm === 'mix' ? '' : rm, modsStr: ms };
  }
  function custPrefText(c) {
    var parts = [], rice = S.products.filter(E.isRice);
    if (rice.some(function (p) { return c.mods[p.id] != null; })) { var m = riceModeOf(c.mods); if (m !== 'mix') parts.push('arroz: só ' + (prod(m) || {}).name); }
    Object.keys(c.mods).forEach(function (pid) {
      var p = prod(pid); if (!p || E.isRice(p)) return;
      parts.push(E.num(c.mods[pid]) === 0 ? 'sem ' + p.name : p.name + ': ' + fin(c.mods[pid]));
    });
    return parts.join('; ');
  }

  function viewClientes() {
    if (!ui.cust) ui.cust = newCustDraft();
    var cash = E.cash(S), hoje = E.today(), cd = ui.cust;
    var rows = S.customers.map(function (c) { return { c: c, bal: E.customerBalance(S, c.id, hoje) }; });
    rows.sort(function (a, b) { return b.bal.open - a.bal.open || a.c.name.localeCompare(b.c.name, 'pt-BR'); });
    var h = '<div class="grid two"><section class="card"><h2>Contas a receber</h2><div class="big">' + E.money(cash.open) + '</div></section>' +
      '<section class="card"><h2>Atrasado</h2><div class="big" style="color:' + (cash.late > 0 ? 'var(--bad)' : 'inherit') + '">' + E.money(cash.late) + '</div></section></div>';

    h += '<section class="card" style="margin-top:12px"><h2>Clientes</h2>';
    if (!rows.length) h += '<div class="empty">Nenhum cliente cadastrado. Eles são criados ao registrar a primeira venda.</div>';
    else h += '<div class="list">' + rows.map(function (r) {
      var c = r.c, parcels = E.allParcels(S).filter(function (x) { return x.customerId === c.id && E.isOpen(x.parcel); }).sort(function (a, b) { return a.parcel.due < b.parcel.due ? -1 : a.parcel.due > b.parcel.due ? 1 : 0; });
      var pref = custPrefText(c);
      return '<div class="item"><div class="head"><b>' + esc(c.name) + '</b><b>' + E.money(r.bal.open) + '</b></div>' +
        (c.phone ? '<small>' + esc(c.phone) + '</small><br>' : '') + (r.bal.late > 0 ? badge('bad', 'Atrasado ' + E.money(r.bal.late)) : r.bal.open > 0 ? badge('info', 'Em dia') : badge('ok', 'Sem saldo')) +
        (pref ? '<p style="margin-top:6px"><small>Cesta própria: ' + esc(pref) + '</small></p>' : '') +
        parcels.map(function (x) {
          return '<div class="parcel"><div class="info"><small>Venda de ' + E.fdate(x.sale.date) + ' · vence ' + E.fdate(x.parcel.due) + '</small><br><b>' + E.money(E.aberto(x.parcel)) + '</b> ' + E.parcelStatus(x.parcel).map(function (s) { return badge(s.cls, s.text); }).join(' ') + '</div></div>';
        }).join('') +
        (r.bal.open > 0 ? '<div class="row" style="margin-top:8px;align-items:end"><div class="field" style="margin:0"><label for="rc-' + c.id + '">Valor recebido (R$)</label><input id="rc-' + c.id + '" type="text" inputmode="decimal" placeholder="0,00"></div><button class="btn" data-act="recv-customer" data-id="' + c.id + '">Registrar</button></div><div id="rcmsg-' + c.id + '"></div>' : '') +
        '<div class="actions"><button class="btn small ghost" data-act="edit-cust" data-id="' + c.id + '">Editar</button><button class="btn small danger" data-act="del" data-kind="customer" data-id="' + c.id + '" data-label="Excluir">Excluir</button></div></div>';
    }).join('') + '</div>';
    h += '</section>';

    var rice = S.products.filter(E.isRice);
    h += '<section class="card" id="custForm"><h2>' + (cd.id ? 'Editar cliente' : 'Novo cliente') + '</h2><form id="custFormEl" novalidate>' +
      '<div class="field"><label for="c-name">Nome</label><input id="c-name" type="text" data-bind="cust.name" value="' + esc(cd.name) + '"></div>' +
      '<div class="row"><div class="field"><label for="c-phone">Telefone</label><input id="c-phone" type="tel" data-bind="cust.phone" value="' + esc(cd.phone) + '"></div>' +
      '<div class="field"><label for="c-addr">Endereço</label><input id="c-addr" type="text" data-bind="cust.address" value="' + esc(cd.address) + '"></div></div>' +
      '<div class="field"><label for="c-note">Observação</label><input id="c-note" type="text" data-bind="cust.note" value="' + esc(cd.note) + '"></div>' +
      (rice.length ? '<div class="field"><label for="c-rice">Tipo de arroz</label><select id="c-rice" data-bind="cust.rice"><option value="">Sem preferência (padrão da cesta)</option>' + rice.map(function (p) { return '<option value="' + p.id + '"' + (cd.rice === p.id ? ' selected' : '') + '>Só ' + esc(p.name) + '</option>'; }).join('') + '</select></div>' : '') +
      '<details><summary>Itens que troca ou não quer</summary><small>Deixe em branco para usar o padrão. Use 0 para tirar o item.</small><div class="items-edit" style="margin-top:8px">' +
      S.products.filter(function (p) { return !E.isRice(p); }).map(function (p) {
        return '<div class="ie"><span>' + esc(p.name) + '<small>padrão ' + fin(p.perBasket) + ' ' + p.unit + '</small></span><input type="text" inputmode="decimal" aria-label="' + esc(p.name) + ' para este cliente" data-cmod="' + p.id + '" value="' + esc(cd.modsStr[p.id] || '') + '"></div>';
      }).join('') + '</div></details>' +
      '<div id="custMsg">' + msgHTML('cust') + '</div>' +
      '<div class="actions"><button type="submit" class="btn">' + (cd.id ? 'Salvar alterações' : 'Cadastrar cliente') + '</button>' + (cd.id ? '<button type="button" class="btn ghost" data-act="cancel-cust">Cancelar</button>' : '') + '</div></form></section>';
    return h;
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
    if (cd.rice) S.products.filter(E.isRice).forEach(function (p) { mods[p.id] = p.id === cd.rice ? E.num(S.settings.riceKg) : 0; });
    var rec = cd.id ? E.byId(S.customers, cd.id) : null;
    if (rec) { rec.name = name; rec.phone = cd.phone.trim(); rec.address = cd.address.trim(); rec.note = cd.note.trim(); rec.mods = mods; }
    else S.customers.push({ id: E.uid(), name: name, phone: cd.phone.trim(), address: cd.address.trim(), note: cd.note.trim(), mods: mods });
    setMsg('cust', null); ui.cust = null; toast(rec ? 'Cliente atualizado.' : 'Cliente cadastrado.'); commit();
  }

  /* ---------- COMPRAS ---------- */
  var PMODE_KEY = 'controle-cestas:pmode';
  function loadPMode() { try { return localStorage.getItem(PMODE_KEY) === 'unit' ? 'unit' : 'total'; } catch (e) { return 'total'; } }
  function newPurchRow() { return { pid: '', qty: '', total: '', qtyWhy: '', newName: '', newUnit: 'un', newCat: E.CATS[0] }; }
  function newPurchDraft() { return { date: E.today(), supplierId: '', note: '', mode: loadPMode(), rows: [newPurchRow()] }; }
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
        return '<optgroup label="' + cat + '">' + S.products.filter(function (p) { return p.cat === cat; }).map(function (p) { return '<option value="' + p.id + '"' + (r.pid === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</optgroup>';
      }).join('') + '<option value="__new"' + (r.pid === '__new' ? ' selected' : '') + '>+ Item novo…</option>';
      var p = prod(r.pid), unit = p ? p.unit : (r.pid === '__new' ? r.newUnit : 'un');
      var last = p ? E.priceHistory(S, p.id).last : null, pk = p ? packBase(p.id) : { base: 1, why: '' };
      var h = '<div class="prow"><div class="prow-head"><label for="pr-p' + i + '">Item ' + (i + 1) + '</label>' + (rows.length > 1 ? '<button type="button" class="link-btn" data-act="rm-row" data-i="' + i + '" aria-label="Remover o item ' + (i + 1) + '">Remover</button>' : '') + '</div>' +
        '<div class="field" style="margin:0"><select id="pr-p' + i + '" data-row="' + i + '" data-f="pid">' + opts + '</select></div>';
      if (r.pid === '__new') {
        h += '<div class="row"><div class="field" style="margin:10px 0 0"><label>Nome do item novo</label><input type="text" autocomplete="off" data-row="' + i + '" data-f="newName" value="' + esc(r.newName) + '"></div>' +
          '<div class="field" style="margin:10px 0 0"><label>Unidade</label><select data-row="' + i + '" data-f="newUnit"><option value="un"' + (r.newUnit === 'un' ? ' selected' : '') + '>un</option><option value="kg"' + (r.newUnit === 'kg' ? ' selected' : '') + '>kg</option></select></div></div>';
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
    var h = '';
    h += '<section class="card"><h2>Nova compra</h2><form id="purchForm" novalidate>' +
      '<div class="field"><label for="pu-date">Data</label><input id="pu-date" type="date" data-bind="purch.date" value="' + d.date + '"></div>' +
      '<div class="field"><label for="pu-sup">Fornecedor</label><select id="pu-sup" data-bind="purch.supplierId"><option value="">Sem fornecedor</option>' + S.suppliers.map(function (s) { return '<option value="' + s.id + '"' + (d.supplierId === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="pu-note">Observação (opcional)</label><input id="pu-note" type="text" autocomplete="off" placeholder="Ex.: pedido 123, pago no débito" data-bind="purch.note" value="' + esc(d.note) + '"></div>' +
      '<div class="field"><label id="pmode-l">Como você vai digitar o valor?</label><div class="seg" role="radiogroup" aria-labelledby="pmode-l" style="margin:0">' +
      [['total', 'Total pago'], ['unit', 'Preço da unidade']].map(function (m) { return '<button type="button" role="radio" aria-checked="' + (d.mode === m[0]) + '" data-act="pr-mode" data-m="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div></div>' +
      '<div id="purchRows">' + purchRowsHTML() + '</div>' +
      '<div class="actions"><button type="button" class="btn ghost" data-act="add-row">+ Adicionar item</button></div>' +
      '<small>Itens novos entram com 0 por cesta. Ajuste a quantidade por cesta em Cadastros.</small>' +
      '<div id="purchMsg">' + msgHTML('purch') + '</div>' +
      '<div class="stickybar"><div class="sb-total"><small>Total da compra</small><b id="purchTotal">' + E.money(purchTotal()) + '</b></div><button type="submit" class="btn big">Registrar compra</button></div></form></section>';

    var list = S.purchases.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    h += '<section class="card"><h2>Compras registradas</h2>';
    if (!list.length) h += '<div class="empty">Nenhuma compra registrada ainda.</div>';
    else h += '<div class="list">' + list.map(function (pu) {
      var total = E.round2(pu.items.reduce(function (a, i) { return a + E.num(i.total); }, 0));
      return '<div class="item"><div class="head"><b>' + E.fdate(pu.date) + (supName(pu.supplierId) ? ' · ' + esc(supName(pu.supplierId)) : '') + '</b><b>' + E.money(total) + '</b></div>' +
        (pu.note ? '<small>' + esc(pu.note) + '</small>' : '') +
        pu.items.map(function (it) {
          var p = prod(it.pid), uc = E.num(it.qty) > 0 ? E.num(it.total) / E.num(it.qty) : 0;
          return '<div class="line"><span>' + esc(p ? p.name : 'Produto removido') + '<br><small>' + fin(it.qty) + ' ' + (p ? p.unit : '') + ' · ' + E.money(uc) + ' por ' + (p ? p.unit : 'un') + '</small></span><span>' + E.money(it.total) + '</span></div>';
        }).join('') +
        '<div class="actions"><button class="btn small danger" data-act="del" data-kind="purchase" data-id="' + pu.id + '" data-label="Excluir compra">Excluir compra</button></div></div>';
    }).join('') + '</div>';
    h += '</section>';
    return h;
  }

  function submitPurch() {
    var d = ui.purch, errs = [], items = [], newProds = [];
    if (!E.validISO(d.date)) errs.push('Informe a data da compra.');
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
        if (ex) pid = ex.id; else { var np = { id: E.uid(), name: nm, cat: r.newCat, unit: r.newUnit, perBasket: 0, packSize: 1, packLabel: '' }; newProds.push(np); pid = np.id; }
      }
      items.push({ pid: pid, qty: qty, total: E.round2(total) });
    });
    if (!errs.length && !items.length) errs.push('Adicione ao menos um item.');
    if (errs.length) { setMsg('purch', 'bad', errs); $('#purchMsg').innerHTML = msgHTML('purch'); return; }
    newProds.forEach(function (p) { S.products.push(p); });
    S.purchases.push({ id: E.uid(), date: d.date, supplierId: d.supplierId, note: d.note.trim(), items: items });
    var bought = {}; items.forEach(function (i) { bought[i.pid] = 1; });
    var nq = S.quotes.filter(function (q) { return bought[q.pid]; }).length;
    setMsg('purch', null); ui.purch = null; toast('Compra registrada.' + (nq ? ' Há ' + nq + ' ' + plural(nq, 'cotação', 'cotações') + ' desses produtos em Cotar para você revisar.' : '')); commit();
  }

  /* ---------- ESTOQUE ---------- */
  function replHTML(rp, emptyText) {
    if (!rp.groups.length) return '<div class="empty">' + emptyText + '</div>';
    var h = rp.groups.map(function (g) {
      return '<div class="item" style="margin-bottom:8px"><div class="head"><b>' + esc(g.name) + '</b><b>' + E.money(g.total) + '</b></div>' +
        g.items.map(function (r) {
          return '<div class="line"><span>' + esc(r.name) + (r.packs ? '<br><small>' + r.packs + ' × ' + esc(r.packLabel || 'embalagem') + '</small>' : '') + '</span><span>' + fin(r.qty) + ' ' + r.unit + '<br><small>' + (r.unitCost == null ? 'sem custo' : E.money(r.cost)) + '</small></span></div>';
        }).join('') + '</div>';
    }).join('');
    h += '<div class="total">Custo estimado: ' + E.money(rp.total) + '</div>';
    if (rp.unknownCost) h += '<small>' + rp.unknownCost + ' ' + plural(rp.unknownCost, 'item sem compra anterior', 'itens sem compra anterior') + ' ficaram sem custo estimado.</small>';
    return h;
  }
  function replText(rp, title) {
    var out = ['*' + title + '*'];
    rp.groups.forEach(function (g) {
      out.push(''); out.push('*' + g.name + '*');
      g.items.forEach(function (r) { out.push('• ' + r.name + ': ' + fin(r.qty) + ' ' + r.unit + (r.packs ? ' (' + r.packs + ' × ' + (r.packLabel || 'embalagem') + ')' : '')); });
    });
    return out.join('\n');
  }
  function planT() { var t = E.parseNum(ui.planT == null ? S.settings.target : ui.planT); return isNaN(t) || t < 0 ? 0 : t; }
  function planHTML(d) { var rp = E.replenish(S, planT(), d); return replHTML(rp, 'Nada a repor para essa meta.'); }

  function viewEstoque(d) {
    var minRp = E.replenish(S, S.settings.minCover, d), T = planT();
    var h = '<section class="card"><h2>Reposição urgente</h2><p class="sub"><small>O que comprar para chegar ao mínimo de ' + fin(S.settings.minCover) + ' ' + plural(S.settings.minCover, 'cesta', 'cestas') + '.</small></p>' +
      replHTML(minRp, 'O estoque está no mínimo ou acima. Nada urgente.') +
      (minRp.groups.length ? '<div class="actions"><button class="btn" data-act="copy-repl" data-kind="min">Copiar para WhatsApp</button></div>' : '') + '</section>';

    h += '<section class="card"><h2>Planejar reposição</h2><div class="field"><label for="plan-t">Meta de estoque (cestas)</label><input id="plan-t" type="text" inputmode="decimal" value="' + esc(ui.planT == null ? fin(S.settings.target) : ui.planT) + '"></div>' +
      '<div id="planOut">' + planHTML(d) + '</div><div class="actions"><button class="btn" data-act="copy-repl" data-kind="plan">Copiar para WhatsApp</button></div></section>';

    var repT = E.replenish(S, T, d), faltaOf = {};
    repT.rows.forEach(function (r) { faltaOf[r.pid] = r.falta; });
    var stockValue = 0;
    S.products.forEach(function (p) { var uc = E.unitCost(S, p.id); if (uc != null) stockValue += Math.max(0, d.stock[p.id]) * uc; });
    h += '<section class="card"><h2>Conferência por item</h2><small>Meta usada: ' + fin(T) + ' ' + plural(T, 'cesta', 'cestas') + '. Custo pelo modo "' + (S.settings.costMode === 'avg' ? 'média das compras' : 'última compra') + '".</small>' +
      '<div class="kpis" style="margin-top:10px"><div class="kpi"><b>' + E.money(stockValue) + '</b><span>Valor do estoque a preço de custo</span></div></div>';
    E.CATS.forEach(function (cat) {
      var ps = S.products.filter(function (p) { return p.cat === cat; });
      if (!ps.length) return;
      h += '<div class="cat">' + cat + '</div><div class="list">' + ps.map(function (p) {
        var cov = d.covOf[p.id], uc = E.unitCost(S, p.id);
        return '<div class="item"><div class="head"><b>' + esc(p.name) + '</b>' + (cov == null ? badge('info', 'Fora da cesta') : covBadge(cov)) + '</div>' +
          '<div class="stats"><div><b>' + fin(d.bought[p.id]) + '</b><span>Comprado</span></div><div><b>' + fin(d.sold[p.id]) + '</b><span>Vendido</span></div><div><b>' + fin(d.adj[p.id]) + '</b><span>Ajuste</span></div>' +
          '<div><b>' + fin(d.stock[p.id]) + ' ' + p.unit + '</b><span>Em estoque</span></div><div><b>' + (faltaOf[p.id] != null ? fin(faltaOf[p.id]) : '—') + '</b><span>Falta p/ meta</span></div><div><b>' + (cov == null ? '—' : Math.max(0, cov)) + '</b><span>Cobertura</span></div>' +
          '<div><b>' + (uc == null ? '—' : E.money(uc)) + '</b><span>Custo por ' + esc(p.unit) + '</span></div><div><b>' + (uc == null ? '—' : E.money(Math.max(0, d.stock[p.id]) * uc)) + '</b><span>Valor em estoque</span></div><div><b>' + (uc == null || !(p.perBasket > 0) ? '—' : E.money(uc * p.perBasket)) + '</b><span>Custo na cesta</span></div></div></div>';
      }).join('') + '</div>';
    });
    h += '</section>';

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
    var sd = ui.sup, pd = ui.prod, st = S.settings;
    var h = '<section class="card" id="syncCard">' + syncInnerHTML() + '</section>';
    h += '<section class="card"><h2>Fornecedores</h2>';
    h += S.suppliers.length ? '<div class="list">' + S.suppliers.map(function (s) {
      return '<div class="item"><div class="head"><b>' + esc(s.name) + '</b></div><small>' + [s.phone, s.doc, s.address].filter(Boolean).map(esc).join(' · ') + '</small>' +
        '<div class="actions"><button class="btn small ghost" data-act="edit-sup" data-id="' + s.id + '">Editar</button><button class="btn small danger" data-act="del" data-kind="supplier" data-id="' + s.id + '" data-label="Excluir">Excluir</button></div></div>';
    }).join('') + '</div>' : '<div class="empty">Nenhum fornecedor cadastrado.</div>';
    h += '<form id="supForm" novalidate style="margin-top:12px"><h3 style="margin-bottom:8px">' + (sd.id ? 'Editar fornecedor' : 'Novo fornecedor') + '</h3>' +
      '<div class="field"><label for="f-name">Nome</label><input id="f-name" type="text" data-bind="sup.name" value="' + esc(sd.name) + '"></div>' +
      '<div class="row"><div class="field"><label for="f-phone">Telefone</label><input id="f-phone" type="tel" data-bind="sup.phone" value="' + esc(sd.phone) + '"></div><div class="field"><label for="f-doc">Documento (CNPJ/CPF)</label><input id="f-doc" type="text" data-bind="sup.doc" value="' + esc(sd.doc) + '"></div></div>' +
      '<div class="field"><label for="f-addr">Endereço</label><input id="f-addr" type="text" data-bind="sup.address" value="' + esc(sd.address) + '"></div>' +
      '<div id="supMsg">' + msgHTML('sup') + '</div><div class="actions"><button type="submit" class="btn">' + (sd.id ? 'Salvar' : 'Cadastrar fornecedor') + '</button>' + (sd.id ? '<button type="button" class="btn ghost" data-act="cancel-sup">Cancelar</button>' : '') + '</div></form></section>';

    h += '<section class="card"><h2>Produtos</h2>';
    E.CATS.forEach(function (cat) {
      var ps = S.products.filter(function (p) { return p.cat === cat; });
      if (!ps.length) return;
      h += '<div class="cat">' + cat + '</div><div class="list">' + ps.map(function (p) {
        return '<div class="item"><div class="head"><b>' + esc(p.name) + '</b><small>' + fin(p.perBasket) + ' ' + p.unit + ' por cesta</small></div><small>' + (p.packSize > 1 ? 'Compra em ' + esc(p.packLabel || 'embalagem') + ' (' + fin(p.packSize) + ')' : 'Compra avulsa') + (p.group === 'arroz' ? ' · grupo arroz' : '') + '</small>' +
          '<div class="actions"><button class="btn small ghost" data-act="edit-prod" data-id="' + p.id + '">Editar</button><button class="btn small danger" data-act="del" data-kind="product" data-id="' + p.id + '" data-label="Excluir">Excluir</button></div></div>';
      }).join('') + '</div>';
    });
    h += '<form id="prodForm" novalidate style="margin-top:12px"><h3 style="margin-bottom:8px">' + (pd.id ? 'Editar produto' : 'Novo produto') + '</h3>' +
      '<div class="field"><label for="p-name">Nome</label><input id="p-name" type="text" data-bind="prod.name" value="' + esc(pd.name) + '"></div>' +
      '<div class="row"><div class="field"><label for="p-cat">Categoria</label><select id="p-cat" data-bind="prod.cat">' + E.CATS.map(function (c) { return '<option' + (pd.cat === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="p-unit">Unidade</label><select id="p-unit" data-bind="prod.unit"><option value="un"' + (pd.unit === 'un' ? ' selected' : '') + '>un</option><option value="kg"' + (pd.unit === 'kg' ? ' selected' : '') + '>kg</option></select></div></div>' +
      '<div class="row three"><div class="field"><label for="p-per">Qtd por cesta</label><input id="p-per" type="text" inputmode="decimal" data-bind="prod.perBasket" value="' + esc(pd.perBasket) + '"></div>' +
      '<div class="field"><label for="p-pack">Itens por embalagem</label><input id="p-pack" type="text" inputmode="numeric" data-bind="prod.packSize" value="' + esc(pd.packSize) + '"></div>' +
      '<div class="field"><label for="p-label">Nome da embalagem</label><input id="p-label" type="text" placeholder="fardo de 30" data-bind="prod.packLabel" value="' + esc(pd.packLabel) + '"></div></div>' +
      '<div class="field"><label for="p-group">Grupo</label><select id="p-group" data-bind="prod.group"><option value="">Nenhum</option><option value="arroz"' + (pd.group === 'arroz' ? ' selected' : '') + '>Arroz (um tipo ou outro por cesta)</option></select></div>' +
      '<div id="prodMsg">' + msgHTML('prod') + '</div><div class="actions"><button type="submit" class="btn">' + (pd.id ? 'Salvar' : 'Cadastrar produto') + '</button>' + (pd.id ? '<button type="button" class="btn ghost" data-act="cancel-prod">Cancelar</button>' : '') + '</div></form></section>';

    h += '<section class="card"><h2>Configurações</h2><form id="setForm" novalidate>' +
      '<div class="row"><div class="field"><label for="st-price">Preço da cesta (R$)</label><input id="st-price" type="text" inputmode="decimal" value="' + fin(st.price) + '"></div>' +
      '<div class="field"><label for="st-term">Prazo padrão</label><select id="st-term">' + [['30-60', '30 e 60 dias'], ['avista', 'À vista'], ['30', '30 dias'], ['fiado', 'Fiado']].map(function (o) { return '<option value="' + o[0] + '"' + (st.term === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="row three"><div class="field"><label for="st-target">Meta de estoque (cestas)</label><input id="st-target" type="text" inputmode="decimal" value="' + fin(st.target) + '"></div>' +
      '<div class="field"><label for="st-min">Mínimo (cestas)</label><input id="st-min" type="text" inputmode="decimal" value="' + fin(st.minCover) + '"></div>' +
      '<div class="field"><label for="st-rice">Kg de arroz por cesta</label><input id="st-rice" type="text" inputmode="decimal" value="' + fin(st.riceKg) + '"></div></div>' +
      '<div class="field"><label for="st-cost">Custo unitário</label><select id="st-cost"><option value="last"' + (st.costMode === 'last' ? ' selected' : '') + '>Última compra</option><option value="avg"' + (st.costMode === 'avg' ? ' selected' : '') + '>Média de todas as compras</option></select></div>' +
      '<div id="setMsg">' + msgHTML('set') + '</div><div class="actions"><button type="submit" class="btn">Salvar configurações</button></div></form></section>';

    h += '<section class="card"><h2>Backup dos dados</h2><p class="sub"><small>Exporte para guardar uma cópia ou levar os dados a outro aparelho. Importar substitui tudo o que está salvo aqui.</small></p>' +
      '<div class="field"><label for="bk-text">Dados em JSON</label><textarea id="bk-text" spellcheck="false">' + esc(ui.exportText) + '</textarea></div><div id="bkMsg">' + msgHTML('bk') + '</div>' +
      '<div class="actions"><button class="btn" data-act="export">Exportar</button><button class="btn ghost" data-act="download">Baixar arquivo</button><button class="btn danger" data-act="import" data-label="Importar dados">Importar dados</button></div></section>';
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
    if (errs.length) { setMsg('set', 'bad', errs); $('#setMsg').innerHTML = msgHTML('set'); return; }
    S.settings = { price: E.round2(price), term: $('#st-term').value, target: target, minCover: min, costMode: $('#st-cost').value, riceKg: rice };
    ui.planT = null; setMsg('set', 'ok', 'Configurações salvas.'); toast('Configurações salvas.'); commit();
  }

  /* ---------- exclusões ---------- */
  function doDelete(kind, id) {
    if (kind === 'sale') S.sales = S.sales.filter(function (s) { return s.id !== id; });
    else if (kind === 'quote') S.quotes = S.quotes.filter(function (q) { return q.id !== id; });
    else if (kind === 'purchase') S.purchases = S.purchases.filter(function (p) { return p.id !== id; });
    else if (kind === 'customer') {
      if (!E.canDeleteCustomer(S, id)) { toast('Este cliente tem vendas e não pode ser excluído.'); return; }
      S.customers = S.customers.filter(function (c) { return c.id !== id; });
      if (ui.cust && ui.cust.id === id) ui.cust = null;
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
    $('#alerts').innerHTML = alertsHTML(d);
    if (ui.tab === 'painel') h = viewPainel(d);
    else if (ui.tab === 'vendas') h = viewVendas();
    else if (ui.tab === 'clientes') h = viewClientes();
    else if (ui.tab === 'compras') h = viewCompras();
    else if (ui.tab === 'cotar') h = viewCotar();
    else if (ui.tab === 'estoque') h = viewEstoque(d);
    else h = viewCadastros();
    $('#view').innerHTML = h;
    $('#tabs').innerHTML = TABS.map(function (t) {
      return '<button data-act="go" data-tab="' + t[0] + '"' + (ui.tab === t[0] ? ' aria-current="page"' : '') + '><svg viewBox="0 0 24 24" aria-hidden="true">' + t[2] + '</svg>' + t[1] + '</button>';
    }).join('');
    document.title = 'FeiraUP';
    refreshSyncUI();
  }

  /* ---------- eventos ---------- */
  function setPath(path, value) {
    var p = path.split('.'); ui[p[0]][p[1]] = value;
  }

  document.addEventListener('submit', function (e) {
    e.preventDefault();
    var id = e.target.id;
    if (id === 'saleForm') submitSale();
    else if (id === 'custFormEl') submitCust();
    else if (id === 'purchForm') submitPurch();
    else if (id === 'supForm') submitSup();
    else if (id === 'prodForm') submitProd();
    else if (id === 'setForm') submitSettings();
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
    if (act === 'go') return go(b.dataset.tab);
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
    if (act === 'pay-ok') return confirmPay();
    if (act === 'pay-cancel') return closePay();
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
    if (act === 'copy-shop') return copyText(shopText(shopPlan()));
    if (act === 'copy-repl') {
      var d = E.derive(S);
      if (b.dataset.kind === 'min') return copyText(replText(E.replenish(S, S.settings.minCover, d), 'Reposição urgente'));
      return copyText(replText(E.replenish(S, planT(), d), 'Reposição de estoque (meta ' + fin(planT()) + ' cestas)'));
    }
    if (act === 'edit-cust') { ui.cust = custDraftFrom(E.byId(S.customers, b.dataset.id)); render(); var f = $('#custForm'); if (f) f.scrollIntoView(); return; }
    if (act === 'cancel-cust') { ui.cust = null; setMsg('cust', null); return render(); }
    if (act === 'edit-sup') { var s = E.byId(S.suppliers, b.dataset.id); ui.sup = { id: s.id, name: s.name, address: s.address, phone: s.phone, doc: s.doc }; render(); return $('#supForm').scrollIntoView(); }
    if (act === 'cancel-sup') { ui.sup = null; return render(); }
    if (act === 'edit-prod') { var pr = prod(b.dataset.id); ui.prod = { id: pr.id, name: pr.name, cat: pr.cat, unit: pr.unit, perBasket: fin(pr.perBasket), packSize: fin(pr.packSize), packLabel: pr.packLabel, group: pr.group || '' }; render(); return $('#prodForm').scrollIntoView(); }
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
    if (t.id === 'plan-t') { ui.planT = t.value; $('#planOut').innerHTML = planHTML(E.derive(S)); return; }
    if (t.dataset.pay) {
      var ps = payScope(t.dataset.scope); if (!ps) return;
      ps.payPix = t.value; var pr = $('#pay-rest-' + t.dataset.scope); if (pr) pr.textContent = payRestText(Number(t.dataset.total), ps); return;
    }
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
    if (!t.dataset.bind) return;
    var path = t.dataset.bind;
    setPath(path, t.value);
    if (path === 'sale.customerId') {
      var c = E.byId(S.customers, t.value);
      ui.sale.items = E.buildSaleItems(S, c, null); ui.sale.rice = detectRice(ui.sale.items);
      var nb = $('#newNameBox'); if (nb) nb.hidden = !!t.value;
      refreshSaleItems();
    } else if (path === 'sale.rice') {
      var rice = S.products.filter(E.isRice);
      rice.forEach(function (p) { ui.sale.items[p.id] = t.value === 'mix' ? E.num(p.perBasket) : (p.id === t.value ? E.num(S.settings.riceKg) : 0); });
      refreshSaleItems();
    } else if (path === 'sale.term') {
      $('#fiadoBox').hidden = t.value !== 'fiado'; $('#entradaBox').hidden = t.value === 'avista'; refreshSaleDyn();
    } else if (path === 'sale.date') refreshSaleDyn();
    else if (path === 'adj.pid') render();
  });

  document.addEventListener('focusin', function (e) { if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) document.body.classList.add('kb'); });
  document.addEventListener('focusout', function () { setTimeout(function () { var a = document.activeElement; if (!a || !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) document.body.classList.remove('kb'); }, 50); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ui.payDlg) closePay(); });
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });

  S = load();
  if (window.Sync) window.Sync.init({ getState: function () { return S; }, applyRemote: applyRemote, hadSavedData: hadSaved, onChange: refreshSyncUI });
  else window.Sync = { status: function () { return { code: 'off', signedIn: false }; }, changed: function () {}, init: function () {} };
  try { var qt = new URLSearchParams(location.search).get('tab'); if (qt && TABS.some(function (t) { return t[0] === qt; })) ui.tab = qt; } catch (e) { /* ignore */ }
  render();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
  var deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function (ev) { ev.preventDefault(); deferredInstall = ev; var b = $('#installBtn'); if (b) b.hidden = false; });
  window.addEventListener('appinstalled', function () { deferredInstall = null; var b = $('#installBtn'); if (b) b.hidden = true; toast('App instalado.'); });
  var ib = $('#installBtn'); if (ib) ib.addEventListener('click', function () { if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; ib.hidden = true; } });
  window.__app = { get state() { return S; }, render: render, go: go, commit: commit };
})();
