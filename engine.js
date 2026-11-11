/* FeiraUP - núcleo de cálculo (funções puras, sem DOM) */
(function (root) {
  'use strict';

  var TZ = 'America/Sao_Paulo';
  var EPS = 1e-9;

  /* ---------- utilidades ---------- */
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function round2(n) { n = num(n); return Math.round(n * 100 + (n >= 0 ? 1e-9 : -1e-9)) / 100; }
  function r6(n) { return Math.round(num(n) * 1e6) / 1e6; }
  function r3(n) { return Math.round(num(n) * 1e3) / 1e3; }
  function floorCov(x) { return Math.floor(x + EPS); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function today() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  function parseISO(iso) { var p = String(iso).split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); }
  function addDays(iso, n) {
    var p = String(iso).split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10);
  }
  function daysBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 864e5); }
  function validISO(iso) { return /^\d{4}-\d{2}-\d{2}$/.test(String(iso || '')); }

  var moneyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var numFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
  function money(n) { return moneyFmt.format(round2(n)); }
  function fnum(n) { return numFmt.format(r3(n)); }
  function fdate(iso) { if (!validISO(iso)) return '';var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function monthKey(iso) { return String(iso).slice(0, 7); }
  function fmonth(key) {
    var p = key.split('-');
    var nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return nomes[Number(p[1]) - 1] + '/' + p[0];
  }

  /* aceita "1.234,56", "12,5" e "12.5" */
  function parseNum(str) {
    if (typeof str === 'number') return isFinite(str) ? str : NaN;
    var s = String(str == null ? '' : str).trim().replace(/\s/g, '').replace(/^R\$/, '');
    if (s === '') return NaN;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }

  /* ---------- padrões ---------- */
  var DEFAULT_SETTINGS = { price: 340, term: '30-60', target: 10, minCover: 4, costMode: 'last', riceKg: 12 };
  var TERMS = ['30-60', 'avista', '30', 'fiado'];
  var CATS = ['Alimentos', 'Limpeza e higiene'];

  function defaultProducts() {
    var A = CATS[0], L = CATS[1];
    function p(id, name, cat, unit, perBasket, packSize, packLabel, group) {
      var o = { id: id, name: name, cat: cat, unit: unit, perBasket: perBasket, packSize: packSize || 1, packLabel: packLabel || '' };
      if (group) o.group = group;
      return o;
    }
    return [
      p('p_arroz_pb', 'Arroz parboilizado (PB)', A, 'kg', 6, 30, 'fardo de 30', 'arroz'),
      p('p_arroz_br', 'Arroz branco', A, 'kg', 6, 30, 'fardo de 30', 'arroz'),
      p('p_acucar', 'Açúcar', A, 'kg', 3),
      p('p_flocao', 'Flocão de milho 500 g', A, 'un', 3),
      p('p_feijao', 'Feijão', A, 'kg', 1),
      p('p_tapioca', 'Goma de tapioca', A, 'kg', 1),
      p('p_cracker', 'Biscoito cream cracker', A, 'un', 1),
      p('p_maria', 'Biscoito Maria', A, 'un', 1),
      p('p_leite', 'Leite em pó Purelac 200 g', A, 'un', 2),
      p('p_cafe', 'Café moído 250 g', A, 'un', 2),
      p('p_macarrao', 'Macarrão espaguete 400 g', A, 'un', 2),
      p('p_sal', 'Sal refinado 1 kg', A, 'un', 1, 30, 'fardo de 30'),
      p('p_pimenta', 'Condimento pimenta', A, 'un', 1, 10, 'fardo de 10'),
      p('p_corante', 'Corante (colorau)', A, 'un', 1, 10, 'fardo de 10'),
      p('p_oleo', 'Óleo de soja 900 ml', A, 'un', 2),
      p('p_goiaba', 'Doce de goiaba 250 g', A, 'un', 1),
      p('p_margarina', 'Margarina 500 g', A, 'un', 1, 12, 'caixa de 12'),
      p('p_esponja', 'Esponja de lavar louça', L, 'un', 2, 80, 'caixa de 80'),
      p('p_sabao_po', 'Sabão em pó sachê 400 g', L, 'un', 1, 30, 'fardo de 30'),
      p('p_sabao_barra', 'Sabão em barra 450 g', L, 'un', 0.5),
      p('p_sabonete', 'Sabonete Ypê 85 g', L, 'un', 2, 12, 'dúzia de 12'),
      p('p_pasta', 'Pasta de dente 90 g', L, 'un', 1),
      p('p_detergente', 'Detergente Ypê 500 ml', L, 'un', 1),
      p('p_papel', 'Papel higiênico (pacote com 4)', L, 'un', 1),
      p('p_agua_san', 'Água sanitária', L, 'un', 1)
    ];
  }

  function newState() {
    return {
      settings: Object.assign({}, DEFAULT_SETTINGS),
      customers: [], suppliers: [], products: defaultProducts(),
      purchases: [], sales: [], adjustments: [], quotes: []
    };
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ---------- migração de dados antigos ---------- */
  function normSettings(s) {
    var o = Object.assign({}, DEFAULT_SETTINGS, s || {});
    ['price', 'target', 'minCover', 'riceKg'].forEach(function (k) {
      var n = Number(o[k]);
      o[k] = isFinite(n) && n >= 0 ? n : DEFAULT_SETTINGS[k];
    });
    if (TERMS.indexOf(o.term) < 0) o.term = DEFAULT_SETTINGS.term;
    if (o.costMode !== 'avg' && o.costMode !== 'last') o.costMode = 'last';
    return o;
  }

  function normProduct(p) {
    var o = Object.assign({}, p);
    o.id = o.id || uid();
    o.name = String(o.name || 'Produto');
    o.cat = CATS.indexOf(o.cat) >= 0 ? o.cat : CATS[0];
    o.unit = o.unit === 'kg' ? 'kg' : 'un';
    o.perBasket = Math.max(0, num(o.perBasket));
    o.packSize = Math.max(1, num(o.packSize) || 1);
    o.packLabel = String(o.packLabel || '');
    if (!o.group && /arroz/i.test(o.name)) o.group = 'arroz';
    if (!o.group) delete o.group;
    return o;
  }

  function migrate(raw) {
    var st = raw && typeof raw === 'object' ? (raw.state && typeof raw.state === 'object' ? raw.state : raw) : {};
    var out = newState();
    out.settings = normSettings(st.settings);
    out.products = Array.isArray(st.products) && st.products.length ? st.products.map(normProduct) : defaultProducts();
    // o arroz parboilizado também é comprado em fardo de 30 kg (igual ao arroz branco)
    out.products.forEach(function (p) { if (p.id === 'p_arroz_pb' && !(p.packSize > 1) && !p.packLabel) { p.packSize = 30; p.packLabel = 'fardo de 30'; } });

    out.suppliers = (Array.isArray(st.suppliers) ? st.suppliers : []).map(function (s) {
      return { id: s.id || uid(), name: String(s.name || 'Fornecedor'), address: String(s.address || ''), phone: String(s.phone || ''), doc: String(s.doc || '') };
    });

    out.customers = (Array.isArray(st.customers) ? st.customers : []).map(function (c) {
      var mods = {};
      if (c.mods && typeof c.mods === 'object') Object.keys(c.mods).forEach(function (k) { mods[k] = Math.max(0, num(c.mods[k])); });
      return { id: c.id || uid(), name: String(c.name || 'Cliente'), phone: String(c.phone || ''), address: String(c.address || ''), note: String(c.note || ''), mods: mods };
    });

    out.purchases = (Array.isArray(st.purchases) ? st.purchases : []).map(function (pu) {
      return {
        id: pu.id || uid(), date: validISO(pu.date) ? pu.date : today(), supplierId: pu.supplierId || '', note: String(pu.note || ''),
        items: (Array.isArray(pu.items) ? pu.items : []).map(function (it) { return { pid: it.pid, qty: num(it.qty), total: round2(it.total) }; })
      };
    });

    out.adjustments = (Array.isArray(st.adjustments) ? st.adjustments : []).map(function (a) {
      return { id: a.id || uid(), pid: a.pid, delta: r6(a.delta), date: validISO(a.date) ? a.date : today(), note: String(a.note || '') };
    });

    // cotações feitas andando de comércio em comércio (não mexem no estoque)
    out.quotes = (Array.isArray(st.quotes) ? st.quotes : []).filter(function (q) {
      return q && typeof q.pid === 'string' && String(q.place || '').trim() && num(q.price) > 0 && num(q.qty) > 0;
    }).map(function (q) {
      return { id: q.id || uid(), pid: q.pid, place: String(q.place).trim().slice(0, 60), price: round2(q.price), qty: r3(q.qty), date: validISO(q.date) ? q.date : today() };
    });

    var defItems = {};
    out.products.forEach(function (p) { if (p.perBasket > 0) defItems[p.id] = p.perBasket; });

    out.sales = (Array.isArray(st.sales) ? st.sales : []).map(function (s) {
      var sale = Object.assign({}, s);
      sale.id = sale.id || uid();
      sale.date = validISO(sale.date) ? sale.date : today();
      sale.qty = num(sale.qty) > 0 ? num(sale.qty) : 1;
      sale.price = sale.price != null && isFinite(Number(sale.price)) ? num(sale.price) : out.settings.price;
      if (!sale.items || typeof sale.items !== 'object' || Array.isArray(sale.items) || !Object.keys(sale.items).length) sale.items = Object.assign({}, defItems);
      else { var it = {}; Object.keys(sale.items).forEach(function (k) { it[k] = Math.max(0, num(sale.items[k])); }); sale.items = it; }
      sale.mods = Array.isArray(sale.mods) ? sale.mods : [];
      sale.parcels = (Array.isArray(sale.parcels) ? sale.parcels : []).map(function (p) {
        var q = { id: p.id || uid(), due: validISO(p.due) ? p.due : sale.date, amount: round2(p.amount), paid: !!p.paid, received: round2(p.received) };
        if (p.kind === 'entrada' || p.kind === 'avista') q.kind = p.kind;
        if (Array.isArray(p.pays)) q.pays = p.pays.filter(function (x) { return x && validISO(x.date) && num(x.amount) > 0; }).map(function (x) { var y = { date: x.date, amount: round2(x.amount) }; if (METHODS[x.method]) y.method = x.method; return y; });
        return q;
      });
      if (!sale.customerId || !byId(out.customers, sale.customerId)) {
        var nm = String(sale.customerName || sale.customer || sale.cliente || sale.name || '').trim();
        var found = null;
        if (nm) {
          out.customers.forEach(function (c) { if (c.name.toLowerCase() === nm.toLowerCase()) found = c; });
          if (!found) { found = { id: uid(), name: nm, phone: '', address: '', note: '', mods: {} }; out.customers.push(found); }
        }
        sale.customerId = found ? found.id : '';
      }
      if (!isFinite(Number(sale.costSnap)) || sale.costSnap === '' || sale.costSnap == null) sale.costSnap = 0;
      sale._needCost = !(s.costSnap != null && isFinite(Number(s.costSnap)));
      return sale;
    });

    out.sales.forEach(function (s) {
      if (s._needCost) s.costSnap = round2(basketCost(out, s.items).cost);
      delete s._needCost;
    });
    out.v = 1;
    delete out.v;
    return out;
  }

  /* ---------- estoque e cobertura ---------- */
  function derive(state) {
    var products = state.products || [];
    var bought = {}, sold = {}, adj = {}, stock = {};
    (state.purchases || []).forEach(function (pu) {
      (pu.items || []).forEach(function (it) { bought[it.pid] = (bought[it.pid] || 0) + num(it.qty); });
    });
    (state.sales || []).forEach(function (s) {
      var q = num(s.qty), items = s.items || {};
      Object.keys(items).forEach(function (pid) { sold[pid] = (sold[pid] || 0) + q * num(items[pid]); });
    });
    (state.adjustments || []).forEach(function (a) { adj[a.pid] = (adj[a.pid] || 0) + num(a.delta); });
    products.forEach(function (p) {
      bought[p.id] = r6(bought[p.id] || 0); sold[p.id] = r6(sold[p.id] || 0); adj[p.id] = r6(adj[p.id] || 0);
      stock[p.id] = r6(bought[p.id] - sold[p.id] + adj[p.id]);
    });
    var riceKg = num(state.settings.riceKg);
    var rice = products.filter(function (p) { return p.group === 'arroz'; });
    var groups = [];
    products.forEach(function (p) {
      if (p.group === 'arroz' || !(num(p.perBasket) > 0)) return;
      groups.push({ key: p.id, name: p.name, pids: [p.id], cov: floorCov(stock[p.id] / p.perBasket) });
    });
    if (rice.length && riceKg > 0) {
      var sum = rice.reduce(function (a, p) { return a + stock[p.id]; }, 0);
      groups.unshift({ key: 'arroz', name: 'Arroz', pids: rice.map(function (p) { return p.id; }), cov: floorCov(sum / riceKg) });
    }
    var covOf = {};
    groups.forEach(function (g) { g.pids.forEach(function (pid) { covOf[pid] = g.cov; }); });
    var total = groups.length ? Math.max(0, Math.min.apply(null, groups.map(function (g) { return g.cov; }))) : 0;
    var limiting = groups.filter(function (g) { return g.cov === Math.min.apply(null, groups.map(function (x) { return x.cov; })); });
    return { bought: bought, sold: sold, adj: adj, stock: stock, groups: groups, covOf: covOf, total: total, limiting: limiting };
  }

  function statusOf(cov, settings) {
    var m = num(settings.minCover);
    if (cov < m) return 'urgent';
    if (cov <= m + 2) return 'near';
    return 'ok';
  }

  /* ---------- custos ---------- */
  /* Histórico de preço de um produto: custo unitário da última compra de cada fornecedor (para cotação). */
  function priceHistory(state, pid) {
    var per = {};
    (state.purchases || []).forEach(function (pu, idx) {
      var q = 0, t = 0;
      (pu.items || []).forEach(function (it) { if (it.pid === pid && num(it.qty) > 0) { q += num(it.qty); t += num(it.total); } });
      if (q <= 0) return;
      var key = pu.supplierId || '', cur = per[key];
      if (!cur || pu.date > cur.date || (pu.date === cur.date && idx > cur.idx)) per[key] = { supplierId: key, date: pu.date, idx: idx, qty: q, total: round2(t), unit: t / q };
    });
    var rows = Object.keys(per).map(function (k) { return per[k]; });
    rows.sort(function (a, b) { return a.unit - b.unit; });
    var last = null;
    rows.forEach(function (r) { if (!last || r.date > last.date || (r.date === last.date && r.idx > last.idx)) last = r; });
    return { rows: rows, last: last, best: rows.length ? rows[0] : null };
  }

  function normText(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  /* Quadro de preços de um produto: última compra de cada fornecedor + última cotação de cada comércio, do menor para o maior. */
  function priceBoard(state, pid) {
    var hist = priceHistory(state, pid), rows = [], latest = {};
    hist.rows.forEach(function (r) {
      var sup = (state.suppliers || []).filter(function (x) { return x.id === r.supplierId; })[0];
      rows.push({ source: 'compra', place: sup ? sup.name : 'Compra sem fornecedor', unit: r.unit, date: r.date, qty: r.qty, total: r.total });
    });
    (state.quotes || []).forEach(function (q, i) {
      if (q.pid !== pid) return;
      var k = normText(q.place), cur = latest[k];
      if (!cur || q.date > cur.q.date || (q.date === cur.q.date && i > cur.i)) latest[k] = { q: q, i: i };
    });
    Object.keys(latest).forEach(function (k) {
      var q = latest[k].q;
      rows.push({ source: 'cotação', place: q.place, unit: q.price / q.qty, date: q.date, qty: q.qty, total: q.price, id: q.id });
    });
    rows.sort(function (a, b) { return a.unit - b.unit; });
    return { rows: rows, best: rows.length ? rows[0] : null, lastBuy: hist.last };
  }
  /* Nomes de comércio já usados (fornecedores + cotações), os mais recentes primeiro. */
  function knownPlaces(state) {
    var seen = {}, out = [];
    function add(n) { var k = normText(n); if (k && !seen[k]) { seen[k] = 1; out.push(String(n).trim()); } }
    (state.quotes || []).slice().reverse().forEach(function (q) { add(q.place); });
    (state.suppliers || []).forEach(function (x) { add(x.name); });
    return out;
  }

  function unitCost(state, pid) {
    var lines = [];
    (state.purchases || []).forEach(function (pu, idx) {
      (pu.items || []).forEach(function (it) {
        if (it.pid === pid && num(it.qty) > 0) lines.push({ date: pu.date, idx: idx, qty: num(it.qty), total: num(it.total) });
      });
    });
    if (!lines.length) return null;
    if (state.settings.costMode === 'avg') {
      var q = 0, t = 0;
      lines.forEach(function (l) { q += l.qty; t += l.total; });
      return q > 0 ? t / q : null;
    }
    var best = lines[0];
    lines.forEach(function (l) { if (l.date > best.date || (l.date === best.date && l.idx > best.idx)) best = l; });
    var qq = 0, tt = 0;
    lines.forEach(function (l) { if (l.idx === best.idx) { qq += l.qty; tt += l.total; } });
    return qq > 0 ? tt / qq : null;
  }

  function defaultItems(state) {
    var o = {};
    state.products.forEach(function (p) { if (num(p.perBasket) > 0) o[p.id] = num(p.perBasket); });
    return o;
  }

  function basketCost(state, items) {
    items = items || defaultItems(state);
    var cost = 0, missing = [];
    Object.keys(items).forEach(function (pid) {
      var q = num(items[pid]);
      if (q <= 0) return;
      var c = unitCost(state, pid);
      if (c == null) missing.push(pid); else cost += q * c;
    });
    return { cost: cost, missing: missing };
  }

  /* ---------- reposição ---------- */
  function lastSupplier(state, pid) {
    var best = null;
    (state.purchases || []).forEach(function (pu, idx) {
      var has = (pu.items || []).some(function (it) { return it.pid === pid; });
      if (has && (!best || pu.date > best.date || (pu.date === best.date && idx > best.idx))) best = { date: pu.date, idx: idx, supplierId: pu.supplierId || '' };
    });
    return best ? best.supplierId : '';
  }

  function replenish(state, T, d) {
    d = d || derive(state);
    T = Math.max(0, num(T));
    var riceKg = num(state.settings.riceKg);
    var falta = {};
    state.products.forEach(function (p) {
      if (p.group === 'arroz' || !(num(p.perBasket) > 0)) return;
      falta[p.id] = Math.max(0, T * p.perBasket - d.stock[p.id]);
    });
    var rice = state.products.filter(function (p) { return p.group === 'arroz'; });
    if (rice.length && riceKg > 0) {
      var stockR = rice.reduce(function (a, p) { return a + d.stock[p.id]; }, 0);
      var grp = Math.max(0, T * riceKg - stockR);
      var soldSum = rice.reduce(function (a, p) { return a + d.sold[p.id]; }, 0);
      var pbSum = rice.reduce(function (a, p) { return a + num(p.perBasket); }, 0);
      rice.forEach(function (p) {
        var w = soldSum > 0 ? d.sold[p.id] / soldSum : (pbSum > 0 ? num(p.perBasket) / pbSum : 1 / rice.length);
        falta[p.id] = grp * w;
      });
    }
    var rows = [];
    state.products.forEach(function (p) {
      if (!(p.id in falta)) return;
      var f = falta[p.id];
      var row = { pid: p.id, name: p.name, unit: p.unit, falta: r3(f), qty: 0, packs: null, packLabel: p.packLabel || '', supplierId: '', unitCost: null, cost: 0 };
      if (f > EPS) {
        if (p.packSize > 1) { row.packs = Math.ceil(f / p.packSize - EPS); row.qty = row.packs * p.packSize; }
        else row.qty = r3(f);
        row.supplierId = lastSupplier(state, p.id);
        row.unitCost = unitCost(state, p.id);
        row.cost = round2(row.qty * (row.unitCost || 0));
      }
      rows.push(row);
    });
    var need = rows.filter(function (r) { return r.qty > 0; });
    var map = {};
    need.forEach(function (r) {
      var k = r.supplierId || '';
      if (!map[k]) map[k] = { supplierId: k, name: k ? ((byId(state.suppliers, k) || {}).name || 'Fornecedor removido') : 'Sem fornecedor definido', items: [], total: 0 };
      map[k].items.push(r); map[k].total = round2(map[k].total + r.cost);
    });
    var groups = Object.keys(map).map(function (k) { return map[k]; });
    groups.sort(function (a, b) { return a.name.localeCompare(b.name, 'pt-BR'); });
    var total = round2(need.reduce(function (a, r) { return a + r.cost; }, 0));
    var unknown = need.filter(function (r) { return r.unitCost == null; }).length;
    return { rows: rows, items: need, groups: groups, total: total, unknownCost: unknown };
  }

  /* ---------- parcelas ---------- */
  function recebido(p) { return round2(p.paid ? p.amount : Math.min(num(p.amount), num(p.received))); }
  function aberto(p) { return round2(num(p.amount) - recebido(p)); }
  function isOpen(p) { return aberto(p) > 0.004; }
  function isOverdue(p, hoje) { return isOpen(p) && p.due < (hoje || today()); }

  function allParcels(state) {
    var rows = [];
    (state.sales || []).forEach(function (s) {
      (s.parcels || []).forEach(function (p) { rows.push({ sale: s, parcel: p, customerId: s.customerId }); });
    });
    return rows;
  }

  function customerBalance(state, customerId, hoje) {
    var open = 0, late = 0, count = 0;
    allParcels(state).forEach(function (r) {
      if (r.customerId !== customerId || !isOpen(r.parcel)) return;
      var a = aberto(r.parcel);
      open += a; count++;
      if (isOverdue(r.parcel, hoje)) late += a;
    });
    return { open: round2(open), late: round2(late), count: count };
  }

  function lateSummary(state, hoje) {
    var count = 0, sum = 0;
    allParcels(state).forEach(function (r) {
      if (isOverdue(r.parcel, hoje)) { count++; sum += aberto(r.parcel); }
    });
    return { count: count, sum: round2(sum) };
  }

  /* abate primeiro as parcelas abertas mais antigas */
  function receiveForCustomer(state, customerId, value, date, splits) {
    var rem = round2(value);
    var queue = (splits && splits.length ? splits : [{ amount: rem }]).map(function (x) { return { method: x.method, amount: x.amount }; });
    if (!(rem > 0)) return { applied: 0, leftover: 0 };
    var rows = allParcels(state).filter(function (r) { return r.customerId === customerId && isOpen(r.parcel); });
    rows.sort(function (a, b) { return a.parcel.due < b.parcel.due ? -1 : a.parcel.due > b.parcel.due ? 1 : (a.sale.date < b.sale.date ? -1 : a.sale.date > b.sale.date ? 1 : 0); });
    var applied = 0;
    for (var i = 0; i < rows.length && rem > 0.004; i++) {
      var p = rows[i].parcel, open = aberto(p), use = round2(Math.min(open, rem));
      var need = use;
      while (need > 0.004 && queue.length) {
        var q = queue[0], t = round2(Math.min(need, q.amount));
        addPay(p, t, date, q.method); q.amount = round2(q.amount - t); need = round2(need - t);
        if (q.amount <= 0.004) queue.shift();
      }
      p.received = round2(num(p.received) + use);
      if (p.received >= p.amount - 0.004) { p.received = p.amount; p.paid = true; }
      rem = round2(rem - use); applied = round2(applied + use);
    }
    return { applied: applied, leftover: rem };
  }

  var METHODS = { pix: 'Pix', dinheiro: 'Dinheiro' };
  function methodName(m) { return METHODS[m] || 'Sem forma informada'; }
  function addPay(p, amount, date, method) {
    if (!(amount > 0.004)) return;
    var x = { date: validISO(date) ? date : today(), amount: round2(amount) };
    if (METHODS[method]) x.method = method;
    (p.pays = p.pays || []).push(x);
  }
  /* divide um valor entre Pix e dinheiro. mode: 'pix' | 'dinheiro' | 'dividir' (pix = valor no Pix) */
  function splitPay(total, mode, pix) {
    total = round2(total);
    if (mode === 'pix') return { splits: [{ method: 'pix', amount: total }] };
    if (mode === 'dinheiro') return { splits: [{ method: 'dinheiro', amount: total }] };
    if (mode !== 'dividir') return { error: 'Escolha a forma de pagamento.' };
    var v = typeof pix === 'number' ? pix : parseNum(pix);
    if (isNaN(v) || v <= 0 || v >= total - 0.004) return { error: 'Dividindo, o valor no Pix precisa ser maior que zero e menor que ' + money(total) + '.' };
    v = round2(v);
    return { splits: [{ method: 'pix', amount: v }, { method: 'dinheiro', amount: round2(total - v) }] };
  }
  function receiveParcel(p, date, splits) {
    var open = aberto(p), list = splits && splits.length ? splits : [{ amount: open }];
    var sum = list.reduce(function (a, x) { return a + x.amount; }, 0);
    if (Math.abs(sum - open) > 0.01) list = [{ amount: open }];
    list.forEach(function (x) { addPay(p, x.amount, date, x.method); });
    p.paid = true; p.received = p.amount;
  }
  function undoParcel(p) { p.paid = false; p.received = 0; p.pays = []; }
  /* recebimentos de uma parcela, cada um com data. Parcelas antigas, sem data guardada, usam uma data estimada. */
  function paysOf(sale, p, hoje) {
    hoje = hoje || today();
    var list = (p.pays || []).map(function (x) { return { date: x.date, amount: num(x.amount), method: x.method }; });
    var got = list.reduce(function (a, x) { return a + x.amount; }, 0), diff = round2(recebido(p) - got);
    if (diff > 0.004) {
      var d = (p.kind === 'entrada' || p.kind === 'avista') ? sale.date : (p.due < hoje ? p.due : hoje);
      list.push({ date: d, amount: diff, est: true });
    }
    return list;
  }

  function parcelStatus(p, hoje) {
    hoje = hoje || today();
    var out = [];
    if (!isOpen(p)) { out.push({ cls: 'ok', text: 'Recebida' }); return out; }
    if (recebido(p) > 0.004) out.push({ cls: 'warn', text: 'Parcial' });
    var d = daysBetween(hoje, p.due);
    if (d < 0) out.push({ cls: 'bad', text: 'Atrasada ' + (-d) + ' d' });
    else if (d === 0) out.push({ cls: 'warn', text: 'Vence hoje' });
    else out.push({ cls: 'info', text: 'em ' + d + ' d' });
    return out;
  }

  /* gera as parcelas de uma venda */
  function buildParcels(o) {
    var total = round2(o.total), term = o.term, date = o.date;
    var entrada = round2(isNaN(o.entrada) ? 0 : o.entrada);
    if (entrada < 0) return { error: 'A entrada não pode ser negativa.' };
    var parcels = [];
    function mk(due, amount, paid, kind) {
      var p = { id: uid(), due: due, amount: round2(amount), paid: paid, received: paid ? round2(amount) : 0 };
      if (paid) {
        var sp = o.pay && o.pay.length ? o.pay : null;
        if (sp && Math.abs(sp.reduce(function (a, x) { return a + x.amount; }, 0) - amount) > 0.01) sp = null;
        p.pays = (sp || [{ amount: amount }]).map(function (x) { var y = { date: date, amount: round2(x.amount) }; if (METHODS[x.method]) y.method = x.method; return y; });
      }
      if (kind) p.kind = kind;
      return p;
    }
    if (term === 'avista') {
      if (total > 0) parcels.push(mk(date, total, true, 'avista'));
      return { parcels: parcels };
    }
    if (entrada > total + 0.004) return { error: 'A entrada (' + money(entrada) + ') é maior que o total da venda (' + money(total) + ').' };
    if (entrada > 0.004) parcels.push(mk(date, entrada, true, 'entrada'));
    var rest = round2(total - entrada);
    if (rest <= 0.004) return { parcels: parcels };
    if (term === '30-60') {
      var p1 = Math.floor(rest * 100 / 2 + 1e-9) / 100, p2 = round2(rest - p1);
      parcels.push(mk(addDays(date, 30), p1, false));
      parcels.push(mk(addDays(date, 60), p2, false));
    } else if (term === '30') {
      parcels.push(mk(addDays(date, 30), rest, false));
    } else if (term === 'fiado') {
      if (!validISO(o.fiadoDue)) return { error: 'Informe o vencimento do fiado.' };
      parcels.push(mk(o.fiadoDue, rest, false));
    } else return { error: 'Prazo inválido.' };
    return { parcels: parcels };
  }

  /* ---------- venda ---------- */
  function isRice(p) { return p.group === 'arroz'; }

  function buildSaleItems(state, customer, riceMode) {
    var items = defaultItems(state);
    var rice = state.products.filter(isRice);
    if (customer && customer.mods) Object.keys(customer.mods).forEach(function (pid) { if (byId(state.products, pid)) items[pid] = num(customer.mods[pid]); });
    if (riceMode && riceMode !== 'mix') {
      rice.forEach(function (p) { items[p.id] = p.id === riceMode ? num(state.settings.riceKg) : 0; });
    }
    return items;
  }

  function diffMods(state, items) {
    var def = defaultItems(state), mods = [];
    state.products.forEach(function (p) {
      var a = num(def[p.id]), b = num(items[p.id]);
      if (Math.abs(a - b) > EPS) mods.push({ pid: p.id, de: a, para: b });
    });
    return mods;
  }

  function checkSale(state, qty, items, d) {
    d = d || derive(state);
    var errors = [], lines = [];
    state.products.forEach(function (p) {
      var per = num(items[p.id]);
      if (per <= 0) return;
      var need = r6(qty * per), have = d.stock[p.id];
      lines.push({ pid: p.id, name: p.name, unit: p.unit, need: need, have: have, ok: need <= have + 1e-9 });
    });
    var rice = state.products.filter(isRice);
    var riceKg = num(state.settings.riceKg);
    var riceSum = rice.reduce(function (a, p) { return a + num(items[p.id]); }, 0);
    var riceOk = !rice.length || Math.abs(riceSum - riceKg) < 1e-6;
    if (!riceOk) errors.push('O arroz da cesta deve somar ' + fnum(riceKg) + ' kg (hoje soma ' + fnum(riceSum) + ' kg).');
    lines.forEach(function (l) {
      if (!l.ok) errors.push('Estoque insuficiente de ' + l.name + ': precisa de ' + fnum(l.need) + ' ' + l.unit + ' e há ' + fnum(Math.max(0, l.have)) + ' ' + l.unit + '.');
    });
    return { errors: errors, lines: lines, riceSum: riceSum, riceOk: riceOk };
  }

  function makeSale(state, input) {
    var qty = input.qty;
    if (!(qty >= 1) || Math.floor(qty) !== qty) return { errors: ['Informe um número inteiro de cestas (mínimo 1).'] };
    if (!validISO(input.date)) return { errors: ['Informe a data da venda.'] };
    if (!(input.price >= 0) || isNaN(input.price)) return { errors: ['Informe o preço por cesta.'] };
    var customer = input.customerId ? byId(state.customers, input.customerId) : null;
    var newName = String(input.newName || '').trim();
    if (!customer && !newName) return { errors: ['Escolha um cliente ou informe o nome do novo cliente.'] };
    var chk = checkSale(state, qty, input.items);
    if (chk.errors.length) return { errors: chk.errors };
    var total = round2(qty * input.price);
    var pr = buildParcels({ total: total, term: input.term, date: input.date, entrada: input.entrada, fiadoDue: input.fiadoDue, pay: input.pay });
    if (pr.error) return { errors: [pr.error] };
    var newCustomer = null;
    if (!customer) {
      var exist = state.customers.filter(function (c) { return c.name.toLowerCase() === newName.toLowerCase(); })[0];
      if (exist) customer = exist; else { newCustomer = { id: uid(), name: newName, phone: '', address: '', note: '', mods: {} }; customer = newCustomer; }
    }
    var items = {};
    Object.keys(input.items).forEach(function (pid) { if (num(input.items[pid]) > 0) items[pid] = num(input.items[pid]); });
    var sale = {
      id: uid(), date: input.date, qty: qty, price: round2(input.price),
      costSnap: round2(basketCost(state, items).cost), customerId: customer.id,
      items: items, mods: diffMods(state, items), parcels: pr.parcels
    };
    if (input.term === 'fiado') sale.fiado = true;
    return { sale: sale, newCustomer: newCustomer, errors: [] };
  }

  function saleTotal(s) { return round2(num(s.qty) * num(s.price)); }
  function saleProfit(s) { return round2(saleTotal(s) - num(s.qty) * num(s.costSnap)); }

  /* ---------- painel ---------- */
  /* ---------- painel (dashboard) ---------- */
  function monthAdd(key, n) {
    var y = Number(key.slice(0, 4)), m = Number(key.slice(5, 7)) - 1 + n;
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return y + '-' + (m + 1 < 10 ? '0' : '') + (m + 1);
  }
  function monthEnd(key) { return addDays(monthAdd(key, 1) + '-01', -1); }
  /* período escolhido e o período anterior equivalente, para comparar */
  function periodRange(kind, hoje) {
    var cur = monthKey(hoje), r;
    if (kind === 'mes_ant') { var k1 = monthAdd(cur, -1), k2 = monthAdd(cur, -2); r = { from: k1 + '-01', to: monthEnd(k1), pfrom: k2 + '-01', pto: monthEnd(k2), label: fmonth(k1), plabel: fmonth(k2) }; }
    else if (kind === '3m') { var a = monthAdd(cur, -2), b = monthAdd(cur, -5), c = monthAdd(cur, -3); r = { from: a + '-01', to: monthEnd(cur), pfrom: b + '-01', pto: monthEnd(c), label: 'últimos 3 meses', plabel: '3 meses anteriores' }; }
    else if (kind === 'tudo') r = { from: '0000-01-01', to: '9999-12-31', pfrom: null, pto: null, label: 'tudo', plabel: '' };
    else { var p1 = monthAdd(cur, -1); r = { from: cur + '-01', to: monthEnd(cur), pfrom: p1 + '-01', pto: monthEnd(p1), label: 'este mês', plabel: 'mês passado' }; }
    return r;
  }
  function salesMetrics(state, from, to) {
    var rev = 0, qty = 0, n = 0, cost = 0, missing = false, custs = {};
    (state.sales || []).forEach(function (sa) {
      if (!from || sa.date < from || sa.date > to) return;
      var bc = basketCost(state, sa.items);
      rev += saleTotal(sa); qty += num(sa.qty); n++; cost += num(sa.qty) * bc.cost; if (bc.missing.length) missing = true;
      if (sa.customerId) custs[sa.customerId] = 1;
    });
    rev = round2(rev); cost = round2(cost);
    var profit = round2(rev - cost);
    return { revenue: rev, qty: r3(qty), sales: n, cost: cost, profit: profit, margin: rev > 0 ? profit / rev : 0, ticket: n ? round2(rev / n) : 0, customers: Object.keys(custs).length, partialCost: missing };
  }
  /* recebimentos e vencimentos de um período */
  function receiptsMetrics(state, from, to, hoje) {
    var got = 0, n = 0, est = false, due = 0, open = 0, dueN = 0, by = { pix: 0, dinheiro: 0, outro: 0 };
    allParcels(state).forEach(function (r) {
      paysOf(r.sale, r.parcel, hoje).forEach(function (x) {
        if (x.date >= from && x.date <= to) { got += x.amount; n++; if (x.est) est = true; by[METHODS[x.method] ? x.method : 'outro'] += x.amount; }
      });
      if (!r.parcel.kind && r.parcel.due >= from && r.parcel.due <= to) { due += num(r.parcel.amount); open += aberto(r.parcel); dueN++; }
    });
    return { received: round2(got), byMethod: { pix: round2(by.pix), dinheiro: round2(by.dinheiro), outro: round2(by.outro) }, count: n, estimated: est, due: round2(due), dueOpen: round2(open), dueCount: dueN };
  }
  /* variação em relação ao período anterior: { pct, dir } ; dir = 'up' | 'down' | 'flat' | 'new' | 'none' */
  function variation(cur, prev) {
    if (prev == null) return { dir: 'none', pct: 0 };
    if (Math.abs(prev) < 0.005) return Math.abs(cur) < 0.005 ? { dir: 'flat', pct: 0 } : { dir: 'new', pct: 0 };
    var pct = (cur - prev) / Math.abs(prev) * 100;
    return { dir: Math.abs(pct) < 0.05 ? 'flat' : pct > 0 ? 'up' : 'down', pct: Math.round(pct * 10) / 10 };
  }
  function dashboard(state, kind, hoje) {
    hoje = hoje || today();
    var rg = periodRange(kind, hoje);
    var cur = salesMetrics(state, rg.from, rg.to), prev = rg.pfrom ? salesMetrics(state, rg.pfrom, rg.pto) : null;
    cur.rcv = receiptsMetrics(state, rg.from, rg.to, hoje); if (prev) prev.rcv = receiptsMetrics(state, rg.pfrom, rg.pto, hoje);
    var cmp = {};
    ['revenue', 'profit', 'qty', 'ticket', 'margin'].forEach(function (k) { cmp[k] = variation(cur[k], prev ? prev[k] : null); });

    // últimos 6 meses
    var thisKey = monthKey(hoje), series = [];
    for (var i = 5; i >= 0; i--) {
      var k = monthAdd(thisKey, -i), m = salesMetrics(state, k + '-01', monthEnd(k)), pur = 0;
      (state.purchases || []).forEach(function (pu) { if (monthKey(pu.date) === k) (pu.items || []).forEach(function (it) { pur += num(it.total); }); });
      series.push({ key: k, revenue: m.revenue, profit: m.profit, purchases: round2(pur) });
    }

    // contas a receber
    var open = 0, late = 0, lateCount = 0, d7 = 0, d30 = 0, aging = [0, 0, 0, 0], future = {}, debtors = {};
    allParcels(state).forEach(function (r) {
      var a = aberto(r.parcel); if (a <= 0.004) return;
      open += a;
      var dd = daysBetween(hoje, r.parcel.due);
      var cid = r.customerId || '';
      var db = debtors[cid] || (debtors[cid] = { customerId: cid, open: 0, late: 0, oldest: 0, parcels: 0 });
      db.open += a; db.parcels++;
      if (dd < 0) {
        late += a; lateCount++; db.late += a; db.oldest = Math.max(db.oldest, -dd);
        var days = -dd; aging[days <= 15 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : 3] += a;
      } else {
        if (dd <= 7) d7 += a;
        if (dd <= 30) d30 += a;
        var mk = monthKey(r.parcel.due); future[mk] = (future[mk] || 0) + a;
      }
    });
    var months = [];
    for (var j = 0; j < 6; j++) { var kk = monthAdd(thisKey, j); months.push({ key: kk, amount: round2(future[kk] || 0) }); }
    var list = Object.keys(debtors).map(function (c) { var d = debtors[c]; d.open = round2(d.open); d.late = round2(d.late); return d; });
    list.sort(function (x, y) { return y.late - x.late || y.open - x.open; });
    cmp.received = variation(cur.rcv.received, prev ? prev.rcv.received : null);
    return {
      range: rg, cur: cur, prev: prev, cmp: cmp, series: series,
      receivable: { open: round2(open), late: round2(late), lateCount: lateCount, latePct: open > 0 ? late / open : 0, next7: round2(d7), next30: round2(d30), aging: aging.map(round2), months: months },
      debtors: list
    };
  }

  function cash(state) {
    var invested = 0, got = 0, open = 0, late = 0, hoje = today();
    (state.purchases || []).forEach(function (pu) { (pu.items || []).forEach(function (it) { invested += num(it.total); }); });
    allParcels(state).forEach(function (r) {
      got += recebido(r.parcel);
      var a = aberto(r.parcel);
      if (a > 0.004) { open += a; if (r.parcel.due < hoje) late += a; }
    });
    return { invested: round2(invested), received: round2(got), open: round2(open), late: round2(late), balance: round2(got - invested) };
  }

  function monthlyFlow(state) {
    var m = {};
    function get(k) { return m[k] || (m[k] = { key: k, purchases: 0, inflow: 0 }); }
    (state.purchases || []).forEach(function (pu) {
      var t = (pu.items || []).reduce(function (a, it) { return a + num(it.total); }, 0);
      get(monthKey(pu.date)).purchases += t;
    });
    allParcels(state).forEach(function (r) { get(monthKey(r.parcel.due)).inflow += num(r.parcel.amount); });
    var rows = Object.keys(m).sort().map(function (k) { return m[k]; });
    var acc = 0;
    rows.forEach(function (r) { r.purchases = round2(r.purchases); r.inflow = round2(r.inflow); acc = round2(acc + r.inflow - r.purchases); r.balance = acc; });
    return rows;
  }

  function nextParcels(state, n) {
    var rows = allParcels(state).filter(function (r) { return isOpen(r.parcel); });
    rows.sort(function (a, b) { return a.parcel.due < b.parcel.due ? -1 : a.parcel.due > b.parcel.due ? 1 : 0; });
    return rows.slice(0, n || 6);
  }

  function alerts(state, d, hoje) {
    d = d || derive(state);
    var out = { urgent: null, near: null, late: null };
    var min = num(state.settings.minCover);
    var st = d.groups.length ? statusOf(d.total, state.settings) : 'ok';
    if (st === 'urgent') {
      out.urgent = { total: d.total, min: min, items: d.groups.filter(function (g) { return g.cov < min; }).map(function (g) { return { name: g.name, cov: Math.max(0, g.cov) }; }) };
    } else if (st === 'near') out.near = { total: d.total, min: min };
    var l = lateSummary(state, hoje);
    if (l.count > 0) out.late = l;
    return out;
  }

  /* ---------- exclusões ---------- */
  function canDeleteCustomer(state, id) { return !state.sales.some(function (s) { return s.customerId === id; }); }
  function productUsed(state, id) {
    return state.purchases.some(function (p) { return p.items.some(function (i) { return i.pid === id; }); }) ||
      state.sales.some(function (s) { return s.items && s.items[id] != null; }) ||
      state.adjustments.some(function (a) { return a.pid === id; });
  }
  function supplierUsed(state, id) { return state.purchases.some(function (p) { return p.supplierId === id; }); }

  var api = {
    TZ: TZ, EPS: EPS, DEFAULT_SETTINGS: DEFAULT_SETTINGS, TERMS: TERMS, CATS: CATS,
    num: num, round2: round2, r3: r3, uid: uid, today: today, addDays: addDays, daysBetween: daysBetween, validISO: validISO,
    money: money, fnum: fnum, fdate: fdate, fmonth: fmonth, monthKey: monthKey, parseNum: parseNum,
    defaultProducts: defaultProducts, newState: newState, byId: byId, migrate: migrate,
    derive: derive, statusOf: statusOf, dashboard: dashboard, periodRange: periodRange, variation: variation, monthAdd: monthAdd, unitCost: unitCost, priceHistory: priceHistory, priceBoard: priceBoard, knownPlaces: knownPlaces, normText: normText, defaultItems: defaultItems, basketCost: basketCost,
    replenish: replenish, lastSupplier: lastSupplier,
    recebido: recebido, aberto: aberto, isOpen: isOpen, isOverdue: isOverdue, allParcels: allParcels,
    customerBalance: customerBalance, lateSummary: lateSummary, receiveForCustomer: receiveForCustomer,
    receiveParcel: receiveParcel, paysOf: paysOf, splitPay: splitPay, methodName: methodName, METHODS: METHODS, undoParcel: undoParcel, parcelStatus: parcelStatus, buildParcels: buildParcels,
    isRice: isRice, buildSaleItems: buildSaleItems, diffMods: diffMods, checkSale: checkSale, makeSale: makeSale,
    saleTotal: saleTotal, saleProfit: saleProfit, cash: cash, monthlyFlow: monthlyFlow, nextParcels: nextParcels,
    alerts: alerts, canDeleteCustomer: canDeleteCustomer, productUsed: productUsed, supplierUsed: supplierUsed
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
