/* Controle de Cestas - núcleo de cálculo (funções puras, sem DOM) */
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
      p('p_arroz_pb', 'Arroz parboilizado (PB)', A, 'kg', 6, 1, '', 'arroz'),
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
      purchases: [], sales: [], adjustments: []
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
  function receiveForCustomer(state, customerId, value) {
    var rem = round2(value);
    if (!(rem > 0)) return { applied: 0, leftover: 0 };
    var rows = allParcels(state).filter(function (r) { return r.customerId === customerId && isOpen(r.parcel); });
    rows.sort(function (a, b) { return a.parcel.due < b.parcel.due ? -1 : a.parcel.due > b.parcel.due ? 1 : (a.sale.date < b.sale.date ? -1 : a.sale.date > b.sale.date ? 1 : 0); });
    var applied = 0;
    for (var i = 0; i < rows.length && rem > 0.004; i++) {
      var p = rows[i].parcel, open = aberto(p), use = round2(Math.min(open, rem));
      p.received = round2(num(p.received) + use);
      if (p.received >= p.amount - 0.004) { p.received = p.amount; p.paid = true; }
      rem = round2(rem - use); applied = round2(applied + use);
    }
    return { applied: applied, leftover: rem };
  }

  function receiveParcel(p) { p.paid = true; p.received = p.amount; }
  function undoParcel(p) { p.paid = false; p.received = 0; }

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
    var pr = buildParcels({ total: total, term: input.term, date: input.date, entrada: input.entrada, fiadoDue: input.fiadoDue });
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
    derive: derive, statusOf: statusOf, unitCost: unitCost, defaultItems: defaultItems, basketCost: basketCost,
    replenish: replenish, lastSupplier: lastSupplier,
    recebido: recebido, aberto: aberto, isOpen: isOpen, isOverdue: isOverdue, allParcels: allParcels,
    customerBalance: customerBalance, lateSummary: lateSummary, receiveForCustomer: receiveForCustomer,
    receiveParcel: receiveParcel, undoParcel: undoParcel, parcelStatus: parcelStatus, buildParcels: buildParcels,
    isRice: isRice, buildSaleItems: buildSaleItems, diffMods: diffMods, checkSale: checkSale, makeSale: makeSale,
    saleTotal: saleTotal, saleProfit: saleProfit, cash: cash, monthlyFlow: monthlyFlow, nextParcels: nextParcels,
    alerts: alerts, canDeleteCustomer: canDeleteCustomer, productUsed: productUsed, supplierUsed: supplierUsed
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
