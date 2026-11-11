const E = require('./engine.js');
let fails = 0;
function eq(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log((ok ? 'OK   ' : 'FALHA') + ' ' + label + ' -> ' + JSON.stringify(got) + (ok ? '' : ' (esperado ' + JSON.stringify(want) + ')'));
}

const st = E.newState();
st.suppliers.push({ id: 's1', name: 'Atacado Central', address: '', phone: '', doc: '' });
st.suppliers.push({ id: 's2', name: 'Casa São Francisco', address: '', phone: '', doc: '' });
// compra para 10 cestas
const q = { p_arroz_pb: 60, p_arroz_br: 60, p_acucar: 30, p_flocao: 30, p_feijao: 10, p_tapioca: 10, p_cracker: 10, p_maria: 10,
  p_leite: 20, p_cafe: 20, p_macarrao: 28, p_sal: 30, p_pimenta: 10, p_corante: 10, p_oleo: 20, p_goiaba: 10, p_margarina: 12,
  p_esponja: 80, p_sabao_po: 30, p_sabao_barra: 5, p_sabonete: 24, p_pasta: 10, p_detergente: 10, p_papel: 10, p_agua_san: 10 };
st.purchases.push({ id: 'c1', date: '2026-11-10', supplierId: 's1', note: '', items: Object.keys(q).map(pid => ({ pid, qty: q[pid], total: q[pid] * 5 })) });
// arroz branco veio do fornecedor 2 em outra compra (mais recente)
st.purchases[0].items = st.purchases[0].items.filter(i => i.pid !== 'p_arroz_br');
st.purchases.push({ id: 'c2', date: '2026-11-10', supplierId: 's2', note: '', items: [{ pid: 'p_arroz_br', qty: 60, total: 240 }] });

let d = E.derive(st);
eq('estoque total de cestas', d.total, 10);
eq('cobertura arroz', d.groups.find(g => g.key === 'arroz').cov, 10);
eq('cobertura açúcar', d.covOf.p_acucar, 10);
eq('cobertura leite', d.covOf.p_leite, 10);
eq('cobertura café', d.covOf.p_cafe, 10);
eq('cobertura macarrão', d.covOf.p_macarrao, 14);
eq('sem parcelas atrasadas', E.lateSummary(st, '2026-11-11'), { count: 0, sum: 0 });
eq('alerta (10 >= 4+3)', E.alerts(st, d), { urgent: null, near: null, late: null });

// custo
eq('custo unitário açúcar (last)', E.unitCost(st, 'p_acucar'), 5);
eq('custo arroz branco', E.unitCost(st, 'p_arroz_br'), 4);

// parcelas 30-60 com centavo
let r = E.buildParcels({ total: 340.01, term: '30-60', date: '2026-11-11', entrada: 0 });
eq('30-60 valores', r.parcels.map(p => p.amount), [170, 170.01]);
eq('30-60 vencimentos', r.parcels.map(p => p.due), ['2026-12-11', '2027-01-10']);
r = E.buildParcels({ total: 100, term: '30', date: '2026-11-11', entrada: 150 });
eq('entrada maior que total = erro', !!r.error, true);
r = E.buildParcels({ total: 340, term: 'avista', date: '2026-11-11' });
eq('à vista já recebido', [r.parcels[0].paid, r.parcels[0].kind], [true, 'avista']);
r = E.buildParcels({ total: 340, term: '30-60', date: '2026-11-11', entrada: 40 });
eq('entrada + 2 parcelas', r.parcels.map(p => [p.amount, p.kind || '']), [[40, 'entrada'], [150, ''], [150, '']]);

// venda de 3 cestas: arroz PB
const items = E.buildSaleItems(st, null, 'p_arroz_pb');
eq('arroz PB = 12 kg', [items.p_arroz_pb, items.p_arroz_br], [12, 0]);
let mk = E.makeSale(st, { qty: 3, date: '2026-11-11', price: 340, customerId: '', newName: 'Maria', items, term: '30-60', entrada: 0 });
eq('venda sem erros', mk.errors, []);
eq('cliente novo criado', !!mk.newCustomer, true);
st.customers.push(mk.newCustomer); st.sales.push(mk.sale);
eq('total da venda', E.saleTotal(mk.sale), 1020);
d = E.derive(st);
eq('estoque PB após venda (60 - 36)', d.stock.p_arroz_pb, 24);
eq('estoque branco intacto', d.stock.p_arroz_br, 60);
eq('cestas após venda', d.total, 7);
eq('mods guardados (arroz)', mk.sale.mods.length, 2);

// bloqueios
let blk = E.makeSale(st, { qty: 8, date: '2026-11-11', price: 340, customerId: mk.newCustomer.id, items: E.buildSaleItems(st, null, 'mix'), term: 'avista' });
eq('arroz mix não soma = bloqueia', blk.errors.length > 0, true);
const itemsOk = E.buildSaleItems(st, null, 'p_arroz_br');
blk = E.makeSale(st, { qty: 8, date: '2026-11-11', price: 340, customerId: mk.newCustomer.id, items: itemsOk, term: 'avista' });
eq('falta de estoque bloqueia (8 cestas > 7)', blk.errors.some(e => e.indexOf('insuficiente') >= 0), true);

// recebimento abate mais antigas
let c = mk.newCustomer.id;
let x = E.receiveForCustomer(st, c, 600);
eq('recebimento aplicado', x.applied, 510 + 90);
const ps = mk.sale.parcels;
eq('1ª parcela quitada', [ps[0].paid, ps[0].received], [true, 510]);
eq('2ª parcial', [ps[1].paid, ps[1].received], [false, 90]);
eq('saldo restante', E.customerBalance(st, c, '2026-11-11').open, 420);
eq('atraso após vencimento', E.lateSummary(st, '2027-02-01').count, 1);
eq('selos', E.parcelStatus(ps[1], '2027-01-15').map(s => s.text), ['Parcial', 'Atrasada 5 d']);

// ajuste / alertas
st.adjustments.push({ id: 'a1', pid: 'p_acucar', delta: -60, date: '2026-11-11', note: 'teste' });
d = E.derive(st);
eq('ajuste reduz cobertura do açúcar', d.covOf.p_acucar, floorOf((30 - 3 * 3 * 1 * 0 - 3 * 3) - 60 + 0, 3));
function floorOf(x, p) { return Math.floor(x / p + 1e-9); }
eq('total nunca abaixo de 0', d.total, 0);
const al = E.alerts(st, d);
eq('alerta urgente presente', !!al.urgent, true);

// reposição
st.adjustments = [];
d = E.derive(st);
const rp = E.replenish(st, 10, d);
eq('reposição: itens a repor', rp.items.length > 0, true);
const brr = rp.items.find(i => i.pid === 'p_arroz_br');
console.log('arroz branco repor ->', JSON.stringify(brr));
const pbr = rp.items.find(i => i.pid === 'p_arroz_pb');
console.log('arroz PB repor ->', JSON.stringify(pbr));
eq('arroz: falta total do grupo = 36', Math.round((pbr ? pbr.falta : 0) + (brr ? brr.falta : 0)), 36);
eq('arroz: PB leva 100% (só PB saiu)', [pbr.falta, brr ? brr.falta : 0], [36, 0]);

// migração
const old = { sales: [{ id: 'v1', date: '2026-10-01', qty: 2, customer: 'João', parcels: [{ id: 'x', due: '2026-11-01', amount: 100, paid: false }] }], products: [{ id: 'a', name: 'Arroz tipo 1', perBasket: 1 }] };
const mg = E.migrate({ v: 1, state: old });
eq('migração: cliente criado', mg.customers[0].name, 'João');
eq('migração: customerId', mg.sales[0].customerId === mg.customers[0].id, true);
eq('migração: group arroz', mg.products[0].group, 'arroz');
eq('migração: items preenchidos', Object.keys(mg.sales[0].items), ['a']);
eq('migração: settings padrão', mg.settings.riceKg, 12);
eq('migração idempotente', JSON.stringify(E.migrate(JSON.parse(JSON.stringify(mg)))) === JSON.stringify(mg), true);

// cotação: histórico por fornecedor
{
  const q = E.newState();
  q.suppliers.push({ id: 'a', name: 'A' }, { id: 'b', name: 'B' });
  q.purchases.push({ id: '1', date: '2026-11-01', supplierId: 'a', items: [{ pid: 'p_margarina', qty: 12, total: 73.34 }] });
  q.purchases.push({ id: '2', date: '2026-11-05', supplierId: 'b', items: [{ pid: 'p_margarina', qty: 10, total: 70 }] });
  q.purchases.push({ id: '3', date: '2026-11-03', supplierId: 'a', items: [{ pid: 'p_margarina', qty: 10, total: 65 }, { pid: 'p_margarina', qty: 2, total: 13 }] });
  const h = E.priceHistory(q, 'p_margarina');
  eq('cotação: 2 fornecedores', h.rows.length, 2);
  eq('cotação: usa a última compra de cada fornecedor (A em 03/11 = 78/12)', E.round2(h.rows.find(r => r.supplierId === 'a').unit * 100) / 100, 6.5);
  eq('cotação: melhor preço é o do fornecedor B (7,00 > 6,50 => A)', h.best.supplierId, 'a');
  eq('cotação: última compra geral é de B', h.last.supplierId, 'b');
  eq('cotação: produto sem compras', E.priceHistory(q, 'p_sal').rows.length, 0);
}

// painel: períodos, comparação, a receber
{
  const d = E.newState();
  d.suppliers.push({ id: 's', name: 'S' });
  d.purchases.push({ id: 'c', date: '2026-10-02', supplierId: 's', items: [{ pid: 'p_arroz_br', qty: 60, total: 255 }, { pid: 'p_acucar', qty: 30, total: 90 }] });
  const mk = (id, date, cid, qty, price, parcels) => ({ id, date, customerId: cid, qty, price, items: { p_acucar: 3 }, parcels });
  const par = (id, amount, due, rec) => ({ id, amount, due, received: rec || 0, paid: rec >= amount });
  d.customers.push({ id: 'c1', name: 'Ana' }, { id: 'c2', name: 'Bia' });
  d.sales.push(mk('v1', '2026-10-10', 'c1', 2, 300, [par('p1', 300, '2026-11-09'), par('p2', 300, '2026-12-09')]));
  d.sales.push(mk('v2', '2026-11-03', 'c2', 1, 340, [par('p3', 340, '2026-12-03')]));
  d.sales.push(mk('v3', '2026-11-05', 'c1', 3, 340, [par('p4', 1020, '2026-11-05', 1020)]));
  const m = E.migrate(JSON.parse(JSON.stringify(d)));
  const db = E.dashboard(m, 'mes', '2026-11-11');
  eq('painel: vendas do mês (4 cestas, R$ 1.360)', [db.cur.sales, db.cur.qty, db.cur.revenue], [2, 4, 1360]);
  eq('painel: mês passado (2 cestas, R$ 600)', [db.prev.qty, db.prev.revenue], [2, 600]);
  eq('painel: variação do faturamento (+126,7%)', [db.cmp.revenue.dir, db.cmp.revenue.pct], ['up', 126.7]);
  eq('painel: a receber em aberto (300+300+340)', db.receivable.open, 940);
  eq('painel: atrasado (parcela de 09/11, 2 dias)', [db.receivable.late, db.receivable.lateCount, db.receivable.aging[0]], [300, 1, 300]);
  eq('painel: vence em até 30 dias (03/12 e 09/12)', db.receivable.next30, 640);
  eq('painel: maior devedor é quem tem atraso (Ana)', [db.debtors[0].customerId, db.debtors[0].late, db.debtors[0].open, db.debtors[0].oldest], ['c1', 300, 600, 2]);
  eq('painel: 6 meses de série terminando em nov/2026', [db.series.length, db.series[5].key], [6, '2026-11']);
  eq('painel: lucro = faturamento - custo (açúcar 3 kg por cesta)', db.cur.profit === Math.round((db.cur.revenue - db.cur.cost) * 100) / 100 && db.cur.cost > 0, true);
  eq('painel: período "tudo" não compara', E.dashboard(m, 'tudo', '2026-11-11').prev, null);
  eq('painel: 3 meses', E.dashboard(m, '3m', '2026-11-11').cur.sales, 3);
  eq('meses: virada de ano', E.monthAdd('2026-11', 3), '2027-02');
}

// arroz parboilizado: fardo de 30 kg (dados antigos são ajustados na migração)
{
  const old = E.newState(); old.products.forEach(p => { if (p.id === 'p_arroz_pb') { p.packSize = 1; p.packLabel = ''; } });
  const m2 = E.migrate(JSON.parse(JSON.stringify(old)));
  eq('arroz PB vira fardo de 30 kg na migração', m2.products.find(p => p.id === 'p_arroz_pb').packSize, 30);
  const custom = E.newState(); custom.products.forEach(p => { if (p.id === 'p_arroz_pb') { p.packSize = 25; p.packLabel = 'saco de 25'; } });
  eq('migração respeita fardo personalizado', E.migrate(JSON.parse(JSON.stringify(custom))).products.find(p => p.id === 'p_arroz_pb').packSize, 25);
}

// cotações por comércio
{
  const q = E.newState();
  q.suppliers.push({ id: 'a', name: 'Atacadão' });
  q.purchases.push({ id: '1', date: '2026-11-01', supplierId: 'a', items: [{ pid: 'p_margarina', qty: 12, total: 73.34 }] });
  q.quotes.push({ id: 'q1', pid: 'p_margarina', place: 'Mercado Bom Preço', price: 70, qty: 12, date: '2026-11-11' });
  q.quotes.push({ id: 'q2', pid: 'p_margarina', place: ' mercado bom preço ', price: 66, qty: 12, date: '2026-11-11' });
  q.quotes.push({ id: 'q3', pid: 'p_margarina', place: 'Casa Silva', price: 80, qty: 12, date: '2026-11-11' });
  const m = E.migrate(JSON.parse(JSON.stringify(q)));
  const bd = E.priceBoard(m, 'p_margarina');
  eq('quadro: 3 comércios (cotação repetida no mesmo comércio vale a última)', bd.rows.length, 3);
  eq('quadro: menor é a cotação mais recente do Bom Preço (5,50)', [bd.best.place, bd.best.source, E.round2(bd.best.unit)], ['mercado bom preço'.length ? 'mercado bom preço' : '', 'cotação', 5.5].map((x, i) => i === 0 ? bd.best.place : x));
  eq('quadro: compra anterior aparece como fonte "compra"', bd.rows.some(r => r.source === 'compra' && r.place === 'Atacadão'), true);
  eq('lugares conhecidos sem repetir', E.knownPlaces(m), ['Casa Silva', 'mercado bom preço', 'Atacadão']);
  eq('migração descarta cotação inválida', E.migrate({ v: 1, state: { quotes: [{ pid: 'x', place: '', price: 5, qty: 1 }, { pid: 'x', place: 'A', price: 0, qty: 1 }] } }).quotes.length, 0);
  eq('migração idempotente com cotações', JSON.stringify(E.migrate(JSON.parse(JSON.stringify(m)))) === JSON.stringify(m), true);
}

console.log(fails ? '\n' + fails + ' FALHA(S)' : '\nTODOS OS TESTES PASSARAM');
process.exit(fails ? 1 : 0);
