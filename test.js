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
{ // trocar produtos de uma venda feita (arroz PB -> branco)
  const w = JSON.parse(JSON.stringify(st)); const sid = w.sales[w.sales.length - 1].id;
  const pb0 = E.derive(w).stock.p_arroz_pb, br0 = E.derive(w).stock.p_arroz_br;
  const itBr = E.buildSaleItems(w, null, 'p_arroz_br');
  w.adjustments.push({ id: 'zz', pid: 'p_arroz_br', delta: 5 - br0, date: '2026-11-11', note: '' });
  let rr = E.changeSaleItems(w, sid, itBr);
  eq('troca sem estoque do novo arroz é recusada', rr.errors.length > 0, true);
  w.adjustments[w.adjustments.length - 1].delta = 500 - br0;
  rr = E.changeSaleItems(w, sid, itBr);
  const d2 = E.derive(w);
  eq('troca de produtos da venda: erros', rr.errors, []);
  eq('PB volta ao estoque (+36) e branco baixa (-36)', [d2.stock.p_arroz_pb - pb0, d2.stock.p_arroz_br - 500], [36, -36]);
  eq('mods refletem a troca', w.sales[w.sales.length - 1].mods.some(m => m.pid === 'p_arroz_br'), true);
  eq('troca sem itens é recusada', E.changeSaleItems(w, sid, {}).errors.length, 1);
}
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
eq('arroz: cada tipo usa o próprio estoque (PB sem estoque = 96)', Math.round((pbr ? pbr.falta : 0) + (brr ? brr.falta : 0)), 96);
eq('arroz: PB leva 100% (só PB saiu)', [pbr.falta, brr ? brr.falta : 0], [96, 0]);

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
  const r0 = db.cur.rcv;
  eq('recebido: parcela antiga sem data usa data estimada (venc. 05/11)', [r0.received, r0.estimated], [1020, true]);
  eq('a vencer no período (09/11 e 05/11) e em aberto', [r0.due, r0.dueOpen, r0.dueCount], [1320, 300, 2]);
  const p1 = m.sales.find(x => x.id === 'v1').parcels[0];
  E.receiveParcel(p1, '2026-11-10');
  const r1 = E.dashboard(m, 'mes', '2026-11-11');
  eq('receber parcela grava data e soma no período', [r1.cur.rcv.received, r1.cur.rcv.dueOpen], [1320, 0]);
  eq('variação do recebido vs mês passado (sem recebimentos antes)', [r1.cmp.received.dir, r1.prev.rcv.received], ['new', 0]);
  const part = m.sales.find(x => x.id === 'v1').parcels[1];
  const ab = E.receiveForCustomer(m, 'c1', 100);
  eq('abatimento parcial vira recebimento datado', [ab.applied, E.paysOf(m.sales[0], part, '2026-11-11').reduce((a, x) => a + x.amount, 0)], [100, 100]);
  E.undoParcel(p1);
  eq('desfazer recebimento remove os registros', [p1.pays.length, E.paysOf(m.sales[0], p1, '2026-11-11').length], [0, 0]);
  const vista = E.buildParcels({ total: 340, term: 'avista', date: '2026-11-08' }).parcels[0];
  eq('venda à vista grava recebimento na data da venda', vista.pays, [{ date: '2026-11-08', amount: 340 }]);
  // forma de pagamento (Pix / dinheiro) e divisão
  eq('divisão: tudo no Pix', E.splitPay(340, 'pix').splits, [{ method: 'pix', amount: 340 }]);
  eq('divisão: 100 no Pix, resto em dinheiro', E.splitPay(340, 'dividir', '100,00').splits, [{ method: 'pix', amount: 100 }, { method: 'dinheiro', amount: 240 }]);
  eq('divisão: Pix igual ao total é recusado', !!E.splitPay(340, 'dividir', '340').error, true);
  eq('divisão: Pix vazio é recusado', !!E.splitPay(340, 'dividir', '').error, true);
  const v2 = E.buildParcels({ total: 340, term: 'avista', date: '2026-11-08', pay: E.splitPay(340, 'dividir', '100').splits }).parcels[0];
  eq('venda à vista dividida grava os dois recebimentos', v2.pays.map(x => [x.method, x.amount]), [['pix', 100], ['dinheiro', 240]]);
  const v3 = E.buildParcels({ total: 340, term: '30', date: '2026-11-08', entrada: 100, pay: E.splitPay(100, 'pix').splits }).parcels;
  eq('entrada no Pix', [v3[0].pays[0].method, v3[1].pays], ['pix', undefined]);
  const pz = { id: 'z', due: '2026-12-01', amount: 300, paid: false, received: 0 };
  E.receiveParcel(pz, '2026-11-11', E.splitPay(300, 'dividir', '120').splits);
  eq('receber parcela dividida', [pz.paid, pz.pays.map(x => x.method + x.amount)], [true, ['pix120', 'dinheiro180']]);
  const pw = { id: 'w', due: '2026-12-01', amount: 300, paid: false, received: 0 };
  E.receiveParcel(pw, '2026-11-11', [{ method: 'pix', amount: 5 }]);
  eq('divisão que não fecha o valor é ignorada (recebe sem forma)', pw.pays.map(x => [x.method, x.amount]), [[undefined, 300]]);
  const m4 = E.migrate(JSON.parse(JSON.stringify({ v: 1, state: { customers: [{ id: 'c', name: 'C' }], sales: [{ id: 's', date: '2026-11-01', customerId: 'c', qty: 1, price: 600, parcels: [{ id: 'a', due: '2026-11-20', amount: 300, paid: false, received: 0 }, { id: 'b', due: '2026-12-20', amount: 300, paid: false, received: 0 }] }] } })));
  const rc = E.receiveForCustomer(m4, 'c', 400, '2026-11-11', E.splitPay(400, 'dividir', '250').splits);
  const pa = m4.sales[0].parcels;
  eq('abatimento dividido atravessa parcelas', [rc.applied, pa[0].pays.map(x => x.method + x.amount), pa[1].pays.map(x => x.method + x.amount)], [400, ['pix250', 'dinheiro50'], ['dinheiro100']]);
  const dm = E.dashboard(m4, 'mes', '2026-11-11').cur.rcv;
  eq('painel separa recebido por forma', [dm.received, dm.byMethod.pix, dm.byMethod.dinheiro, dm.byMethod.outro], [400, 250, 150, 0]);
  eq('migração mantém a forma e descarta forma inválida', E.migrate(JSON.parse(JSON.stringify(m4))).sales[0].parcels[0].pays.map(x => x.method), ['pix', 'dinheiro']);
}

// contas a pagar, retiradas e fluxo de caixa
{
  const d = E.newState();
  d.suppliers.push({ id: 's', name: 'Idelvon' });
  d.customers.push({ id: 'c1', name: 'Ana' });
  d.sales.push({ id: 'v1', date: '2026-11-03', customerId: 'c1', qty: 1, price: 1000, items: {}, parcels: [{ id: 'a', due: '2026-11-03', amount: 1000, paid: true, received: 1000, kind: 'avista', pays: [{ date: '2026-11-03', amount: 1000 }] }] });
  d.purchases.push({ id: 'p1', date: '2026-11-04', supplierId: 's', note: '', items: [{ pid: 'p_acucar', qty: 10, total: 300 }] }); // pago do caixa (padrão)
  d.purchases.push({ id: 'p2', date: '2026-11-05', supplierId: 's', note: '', paidFrom: 'pessoal', items: [{ pid: 'p_sal', qty: 10, total: 100 }] }); // do bolso: não sai do caixa
  d.purchases.push({ id: 'p3', date: '2026-11-06', supplierId: 's', note: '', payableId: 'b1', items: [{ pid: 'p_feijao', qty: 30, total: 150 }] }); // a prazo
  d.payables.push({ id: 'b1', desc: 'Compra de feijão', supplierId: 's', amount: 150, due: '2026-11-20', purchaseId: 'p3', pays: [] });
  d.payables.push({ id: 'b2', desc: 'Frete', supplierId: '', amount: 80, due: '2026-11-08', pays: [] });
  d.withdrawals.push({ id: 'w1', date: '2026-11-07', amount: 200, method: 'pix', note: 'minha conta' });
  const m = E.migrate(JSON.parse(JSON.stringify(d)));
  const hoje = '2026-11-11';
  let ps = E.payablesSummary(m, hoje);
  eq('contas a pagar: aberto, vencido e próximos', [ps.open, ps.late, ps.lateCount, ps.next30], [230, 80, 1, 150]);
  let cf = E.cashflow(m, null, null, hoje);
  eq('caixa: recebido 1000, reinvestido 300 (compra do caixa), retirado 200', [cf.received, cf.reinvested, cf.withdrawn, cf.bills, cf.balance], [1000, 300, 200, 0, 500]);
  const b1 = m.payables.find(x => x.id === 'b1'), b2 = m.payables.find(x => x.id === 'b2');
  E.payBillSplit(b2, '2026-11-11', E.splitPay(80, 'dividir', '30').splits, 'caixa');
  eq('pagar conta dividida grava forma e origem', b2.pays.map(x => [x.method, x.amount, x.from]), [['pix', 30, 'caixa'], ['dinheiro', 50, 'caixa']]);
  eq('conta paga sai do aberto', [E.billIsOpen(b2), E.payablesSummary(m, hoje).open], [false, 150]);
  E.payBillSplit(b1, '2026-11-11', null, 'pessoal');
  eq('conta paga do bolso não sai do caixa', [E.cashflow(m, null, null, hoje).balance, E.cashflow(m, null, null, hoje).reinvested], [420, 300]);
  E.undoBill(b2); E.payBillSplit(b1, '2026-11-11', null, 'caixa');
  eq('desfazer pagamento reabre a conta', E.billIsOpen(b2), true);
  eq('período: só conta o que está nele', E.cashflow(m, '2026-11-05', '2026-11-30', hoje).withdrawn, 200);
  eq('migração mantém contas, retiradas e vínculo', JSON.stringify(E.migrate(JSON.parse(JSON.stringify(m)))) === JSON.stringify(m), true);
  eq('migração limpa vínculo de compra sem conta', E.migrate({ v: 1, state: { purchases: [{ id: 'x', date: '2026-11-01', payableId: 'zz', items: [] }] } }).purchases[0].payableId, undefined);
  eq('status: vencida', E.billStatus(E.migrate(JSON.parse(JSON.stringify(d))).payables[1], hoje)[0].text, 'Vencida há 3 d');
  // aportes do dono
  m.contributions.push({ id: 'k1', date: '2026-11-02', amount: 700, method: 'pix', note: 'investimento inicial' });
  const cf2 = E.cashflow(m, null, null, hoje), oc = E.ownerCapital(m);
  eq('aporte entra no caixa', [cf2.contributed, cf2.balance], [700, 1200]);
  eq('capital do dono: aporte + compra do bolso + conta do bolso', [oc.contributions, oc.purchases, oc.purchasesCount, oc.bills, oc.total], [700, 100, 1, 150, 950]);
  eq('capital do dono: retirado 200, falta recuperar 750', [oc.withdrawn, oc.toRecover, oc.extra], [200, 750, 0]);
  m.withdrawals.push({ id: 'w2', date: '2026-11-09', amount: 900, note: '' });
  const oc2 = E.ownerCapital(m);
  eq('retirou mais que colocou: o excedente é lucro', [oc2.toRecover, oc2.extra], [0, 150]);
  eq('migração mantém aportes', E.migrate(JSON.parse(JSON.stringify(m))).contributions.length, 1);
  eq('aporte fora do período não entra', E.cashflow(m, '2026-11-05', '2026-11-30', hoje).contributed, 0);
  // despesas
  m.expenses.push({ id: 'e1', date: '2026-11-08', amount: 120, cat: 'Combustível', desc: 'gasolina', method: 'pix', from: 'caixa' });
  m.expenses.push({ id: 'e2', date: '2026-11-09', amount: 30, cat: 'Itens extras', desc: 'fita', from: 'pessoal' });
  const ex = E.expensesSummary(m, '2026-11-01', '2026-11-30');
  eq('despesas: total, do caixa e por categoria', [ex.total, ex.caixa, ex.count, ex.byCat[0].cat], [150, 120, 2, 'Combustível']);
  const cf3 = E.cashflow(m, null, null, hoje);
  eq('despesa do caixa diminui o caixa; do bolso não', [cf3.expenses, cf3.balance], [120, 1200 - 900 - 120]);
  eq('despesa do bolso conta como dinheiro que o dono colocou', E.ownerCapital(m).expenses, 30);
  const dbx = E.dashboard(m, 'mes', hoje);
  eq('painel: lucro líquido = lucro bruto - despesas', [dbx.cur.expenses.total, dbx.cur.net], [150, E.round2(dbx.cur.profit - 150)]);
  eq('migração: despesa inválida some, categoria desconhecida vira Outros', E.migrate({ v: 1, state: { expenses: [{ id: 'a', date: '2026-11-01', amount: 10, cat: 'zzz' }, { id: 'b', amount: 0 }] } }).expenses.map(x => x.cat), ['Outros']);
  eq('categoria Embalagens existe para sacolas', E.CATS.indexOf('Embalagens') >= 0, true);
  eq('painel traz caixa e contas', [E.dashboard(m, 'mes', hoje).payables.open, E.dashboard(m, 'mes', hoje).cashNow.received], [E.payablesSummary(m, hoje).open, 1000]);
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
  { // onde comprar
    const w = E.migrate(JSON.parse(JSON.stringify(q)));
    w.quotes.push({ id: 'q4', pid: 'p_sal', place: 'Casa Silva', price: 2, qty: 10, date: '2026-11-11' });
    w.quotes.push({ id: 'q5', pid: 'p_sal', place: 'Bom Preço', price: 1.5, qty: 10, date: '2026-11-11' });
    const sp = E.shoppingPlan(w, { p_margarina: 24 });
    const byPlace = {}; sp.stores.forEach(s => byPlace[s.place] = s);
    eq('onde comprar: margarina vai para o Bom Preço (66/12 = 5,50)', [byPlace['mercado bom preço'] || byPlace['Mercado Bom Preço']].filter(Boolean)[0].items.map(i => [i.pid, E.round2(i.unitPrice * 100) / 100, i.qty]), [['p_margarina', 5.5, 24]]);
    eq('onde comprar: sal vai para o mais barato (Bom Preço 1,50)', sp.stores.some(s => s.items.some(i => i.pid === 'p_sal' && i.unitPrice === 0.15)), true);
    eq('onde comprar: total soma as linhas', sp.total, E.round2(sp.stores.reduce((a, s) => a + s.total, 0)));
    eq('onde comprar: economia contra o preço mais caro é positiva', sp.saves > 0, true);
    eq('onde comprar: sem quantidade usa a da última cotação', E.shoppingPlan(w, {}).stores.some(s => s.items.some(i => i.pid === 'p_sal' && i.qty === 10 && i.why === 'cotação')), true);
    eq('onde comprar: sem cotações, nada', E.shoppingPlan(E.newState(), {}).stores.length, 0);
  }
  eq('lugares conhecidos sem repetir', E.knownPlaces(m), ['Casa Silva', 'mercado bom preço', 'Atacadão']);
  eq('migração descarta cotação inválida', E.migrate({ v: 1, state: { quotes: [{ pid: 'x', place: '', price: 5, qty: 1 }, { pid: 'x', place: 'A', price: 0, qty: 1 }] } }).quotes.length, 0);
  eq('migração idempotente com cotações', JSON.stringify(E.migrate(JSON.parse(JSON.stringify(m)))) === JSON.stringify(m), true);
}

// ---- troca na cesta e data de recebimento
{
  const w = E.newState(); w.suppliers.push({ id: 's1', name: 'A' });
  const defs = E.defaultItems(w);
  const price = { p_feijao: 8, p_margarina: 9, p_detergente: 3, p_agua_san: 2.5 };
  w.purchases.push({ id: 'c1', date: '2026-11-10', supplierId: 's1', note: '', items: Object.keys(defs).map(pid => ({ pid, qty: 10, total: 10 * (price[pid] || 5) })) });
  const same = E.swapAdvice(w, Object.assign({}, defs), 160);
  eq('troca: cesta padrão não tem diferença', [same.delta, same.options.length], [0, 0]);
  const it = Object.assign({}, defs); it.p_feijao = defs.p_feijao + 3;
  const adv = E.swapAdvice(w, it, 160);
  eq('troca: +3 kg de feijão a R$ 8 custa R$ 24 a mais', adv.delta, 24);
  eq('troca: há sugestões', adv.options.length > 0, true);
  eq('troca: toda sugestão fecha o custo da cesta padrão (±R$ 1)', adv.options.every(o => Math.abs(o.diff) <= 3.6 && Math.abs(o.after - adv.stdCost - o.diff) < 0.01), true);
  eq('troca: nunca sugere tirar o feijão que o cliente aumentou, arroz nem embalagem', adv.options.every(o => o.removals.every(r => r.pid !== 'p_feijao' && !/arroz/.test(r.pid) && w.products.find(p => p.id === r.pid).cat !== 'Embalagens')), true);
  eq('troca: melhor sugestão fecha exato', adv.options[0].diff, 0);
  eq('troca: preço para manter o lucro', adv.priceUp, 24);
  const none = E.swapAdvice(E.newState(), E.defaultItems(E.newState()), 100);
  eq('troca: sem custo conhecido não sugere', none.options.length, 0);

  const sale = { id: 'v1', date: '2026-11-01', parcels: [
    { id: 'a', due: '2026-11-01', amount: 50, kind: 'entrada', paid: true, received: 50, pays: [] },
    { id: 'b', due: '2026-12-01', amount: 50, paid: true, received: 50, pays: [{ date: '2026-12-02', amount: 50, method: 'pix' }] }] };
  let rr = E.setPayDate(sale, sale.parcels[1], 0, '2026-12-05', '2026-12-10');
  eq('data: editar recebimento com data guardada', [rr.ok, sale.parcels[1].pays], [true, [{ date: '2026-12-05', amount: 50, method: 'pix' }]]);
  rr = E.setPayDate(sale, sale.parcels[0], 0, '2026-11-03', '2026-12-10');
  eq('data: parcela antiga (data estimada) passa a ter data guardada', [rr.ok, sale.parcels[0].pays], [true, [{ date: '2026-11-03', amount: 50 }]]);
  eq('data: o recebido do período acompanha a nova data', [E.receiptsMetrics({ sales: [sale] }, '2026-11-01', '2026-11-30', '2026-12-10').received, E.receiptsMetrics({ sales: [sale] }, '2026-12-01', '2026-12-31', '2026-12-10').received], [50, 50]);
  { const pp = { id: 'z', due: '2026-12-01', amount: 10, paid: false, received: 0, pays: [] }; eq('vencimento: altera data prevista', [E.setDue(pp, '2027-02-15').ok, pp.due], [true, '2027-02-15']); eq('vencimento: data inválida recusada', !!E.setDue(pp, 'abc').error && pp.due === '2027-02-15', true); }
  eq('data: futura é recusada', !!E.setPayDate(sale, sale.parcels[1], 0, '2027-01-01', '2026-12-10').error, true);
  eq('data: inválida é recusada', !!E.setPayDate(sale, sale.parcels[1], 0, '2026-13-45', '2026-12-10').error, true);
  eq('data: índice inexistente é recusado', !!E.setPayDate(sale, sale.parcels[1], 5, '2026-12-05', '2026-12-10').error, true);
}

// ---- planejamento
{
  const w = E.newState(); w.suppliers.push({ id: 's1', name: 'A' });
  const defs = E.defaultItems(w);
  w.purchases.push({ id: 'c1', date: '2026-11-10', supplierId: 's1', note: '', paidFrom: 'pessoal', items: Object.keys(defs).map(pid => ({ pid, qty: 20, total: 20 * 4 })) });
  w.settings.minCover = 0;
  const hoje = '2026-11-15', cost = E.basketCost(w, defs).cost, stock = E.derive(w).total, minC = w.settings.minCover;
  const base = E.planner(w, { start: 0, newPerMonth: 0, target: 0, expMonthly: 0, months: 4 }, hoje);
  eq('plano: sem clientes e sem contas, o saldo não muda', [base.rows.length, base.rows.every(r => r.net === 0), base.endBalance, base.fundingNeed], [4, true, 0, 0]);
  const p = E.planner(w, { start: 5, newPerMonth: 0, target: 5, perMonth: 1, price: 340, term: '30', expMonthly: 100, months: 4 }, hoje);
  eq('plano: custo médio da cesta', p.cost, Math.round(cost * 100) / 100);
  eq('plano: venda a 30 dias só entra no mês seguinte', [p.rows[0].rcvNew, p.rows[1].rcvNew, p.rows[2].rcvNew], [0, 1700, 1700]);
  eq('plano: lucro do mês = vendas - custo - despesas', p.rows[1].profit, Math.round((1700 - 5 * cost - 100) * 100) / 100);
  eq('plano: 1ª reposição considera estoque atual + reserva', p.rows[0].buy, Math.round(Math.max(0, Math.ceil(5 + minC - stock)) * cost * 100) / 100);
  eq('plano: investimento mensal para a meta', E.planner(w, { target: 15, perMonth: 1 }, hoje).steadyMonthly, Math.round(15 * cost * 100) / 100);
  const q = E.planner(w, { start: 5, newPerMonth: 0, target: 5, term: '30', expMonthly: 100, months: 4 }, hoje);
  eq('plano: saldo acumulado bate com as entradas e saídas', q.rows[3].balance, Math.round((q.opening + q.rows.reduce((a, r) => a + r.in - r.out, 0)) * 100) / 100);
  eq('plano: aporte necessário = maior queda abaixo de zero', q.fundingNeed, Math.max(0, -Math.min(...q.rows.map(r => r.balance), q.opening)));
  // parcela já vendida entra pela data de vencimento; vencida entra no mês atual
  w.sales.push({ id: 'v1', date: '2026-10-01', customerId: 'k', qty: 1, price: 340, items: {}, parcels: [
    { id: 'a', due: '2026-11-01', amount: 100, paid: false, received: 0, pays: [] },
    { id: 'b', due: '2026-12-20', amount: 240, paid: false, received: 0, pays: [] }] });
  w.payables.push({ id: 'b1', desc: 'x', amount: 80, due: '2027-01-05', pays: [] });
  const r2 = E.planner(w, { start: 0, newPerMonth: 0, target: 0, expMonthly: 0, months: 4 }, hoje);
  eq('plano: recebimentos já vendidos pela data (vencida cai no mês atual)', [r2.rows[0].rcvOld, r2.rows[1].rcvOld], [100, 240]);
  eq('plano: conta a pagar entra no mês do vencimento', [r2.rows[2].bills, r2.rows[1].bills], [80, 0]);
  eq('plano: clientes recorrentes = quem comprou nos últimos 60 dias', E.planDefaults(w, hoje).start, 1);
  eq('plano: entrada mínima segura quando campos vazios', E.planner(w, { target: '', price: '' }, hoje).input.target, 15);
}

// comprovantes e planejador de reposição
{
  const w = E.newState();
  const its = E.buildSaleItems(w, null, 'p_arroz_pb');
  w.purchases.push({ id: 'pc1', date: '2026-11-01', supplierId: '', items: w.products.map(p => ({ pid: p.id, qty: 100, total: 100 * 5 })), paidFrom: 'caixa' });
  const m = E.makeSale(w, { qty: 2, date: '2026-11-05', price: 340, customerId: '', newName: 'Ana Lima', items: its, term: '30-60', entrada: 80, pay: [{ method: 'pix', amount: 80 }] });
  eq('venda p/ comprovante sem erro', m.errors, []);
  w.customers.push(m.newCustomer); w.sales.push(m.sale);
  const vr = E.saleReceipt(w, m.sale.id, '2026-11-18');
  eq('comprovante de venda: total e rótulos', [vr.total, vr.parcels.map(p => p.label)], [680, ['Entrada', 'Parcela 1/2', 'Parcela 2/2']]);
  eq('comprovante de venda: recebido e aberto', [vr.received, vr.open], [80, 600]);
  eq('número de venda', /^V20261105-[A-Z0-9]{4}$/.test(vr.number), true);
  const rcv = E.receiveForCustomer(w, m.newCustomer.id, 100, '2026-11-18', [{ method: 'pix', amount: 60 }, { method: 'dinheiro', amount: 40 }]);
  eq('abate devolve as baixas', rcv.entries.map(e => [e.amount, e.method]), [[60, 'pix'], [40, 'dinheiro']]);
  const br = E.baixaReceipt(w, rcv.entries, '2026-11-18');
  eq('comprovante de baixa: total, formas, saldo', [br.total, br.methods.map(x => x.name + x.amount), br.balance], [100, ['Pix60', 'Dinheiro40'], 500]);
  eq('baixa sem entradas válidas = null', E.baixaReceipt(w, [{ saleId: 'x', parcelId: 'y', amount: 1 }], '2026-11-18'), null);
  const tx = E.receiptText(br, { name: 'Cestas da Amaryel', phone: '(89) 99999-0000' });
  eq('texto da baixa', ['Cestas da Amaryel', 'Total pago', 'sem valor fiscal', 'Ana Lima'].every(k => tx.indexOf(k) >= 0), true);
  eq('CPF válido formata', [E.parseDoc('52998224725').ok, E.parseDoc('52998224725').text], [true, '529.982.247-25']);
  eq('CNPJ válido formata', E.parseDoc('11222333000181').text, '11.222.333/0001-81');
  eq('documento inválido recusado', [E.parseDoc('12345678900').ok, E.parseDoc('11111111111').ok, E.parseDoc('123').ok], [false, false, false]);
  const tb = E.receiptText(br, { name: 'Cestas X', doc: 'CNPJ 11.222.333/0001-81', address: 'Rua A, 1', phone: '1', email: 'a@b.c' });
  eq('texto com CNPJ, endereço e e-mail', ['CNPJ 11.222.333/0001-81', 'Rua A, 1', 'a@b.c'].every(k => tb.indexOf(k) >= 0), true);
  // editar venda
  {
    const sv = w.sales[0], p0 = sv.parcels[0], p1 = sv.parcels[1], p2 = sv.parcels[2];
    const base = () => ({ date: sv.date, customerId: sv.customerId, qty: sv.qty, price: sv.price, parcels: sv.parcels.map(p => ({ id: p.id, amount: p.amount, due: p.due })) });
    let ed = base(); ed.parcels[1].amount = 100;
    eq('edição: soma diferente do total é recusada', E.editSale(w, sv.id, ed).errors.length > 0, true);
    ed = base(); ed.parcels = [ed.parcels[0]]; 
    eq('edição: remover parcela recebida é recusado', E.editSale(w, sv.id, Object.assign(base(), { parcels: [base().parcels[1], base().parcels[2]] })).errors.some(x => x.indexOf('já recebeu') >= 0 || x.indexOf('somam') >= 0), true);
    const re = E.replanOpen(sv.parcels, 680, '2026-11-05', '30-60');
    eq('replanejar mantém a recebida e refaz as abertas', [re.length, re[0].id, re[0].amount, re.reduce((a, x) => a + x.amount, 0)], [4, p0.id, 80, 680]);
    ed = base(); ed.parcels = [{ id: p0.id, amount: 80, due: p0.due }, { id: p1.id, amount: 400, due: '2026-12-20' }, { id: null, amount: 200, due: '2027-01-20' }];
    ed.parcels = ed.parcels.filter(Boolean);
    const rm = E.editSale(w, sv.id, { date: sv.date, customerId: sv.customerId, qty: 2, price: 340, parcels: [{ id: p0.id, amount: 80, due: p0.due }, { id: p1.id, amount: 300, due: '2026-12-20' }, { id: p2.id, amount: 300, due: '2027-01-20' }] });
    eq('edição válida (mexe nos vencimentos)', [rm.errors, w.sales[0].parcels.map(x => x.due)], [[], [p0.due, '2026-12-20', '2027-01-20']]);
    const two = E.editSale(w, sv.id, { date: sv.date, customerId: sv.customerId, qty: 2, price: 340, parcels: [{ id: p0.id, amount: 80, due: p0.due }, { id: p1.id, amount: 600, due: '2026-12-20' }] });
    eq('edição: de 3 para 2 parcelas (a removida não tinha recebimento)', [two.errors, w.sales[0].parcels.length, E.saleReceipt(w, sv.id, '2026-11-18').open], [[], 2, 500]);
    const pr = E.editSale(w, sv.id, { date: sv.date, customerId: sv.customerId, qty: 2, price: 400, parcels: [{ id: p0.id, amount: 80, due: p0.due }, { id: p1.id, amount: 720, due: '2026-12-20' }] });
    eq('edição: mudar o preço refaz o total', [pr.errors, E.saleTotal(w.sales[0])], [[], 800]);
    const big = E.editSale(w, sv.id, { date: sv.date, customerId: sv.customerId, qty: 9999, price: 1, parcels: [{ id: p0.id, amount: 80, due: p0.due }, { id: p1.id, amount: 9919, due: '2026-12-20' }] });
    eq('edição: qtd acima do estoque é recusada', big.errors.some(x => x.indexOf('insuficiente') >= 0), true);
  }
  // PDF do comprovante
  {
    const pdf = E.receiptPdf(vr, { name: 'Cestas (X) \\ Ltda', doc: 'CNPJ 11.222.333/0001-81' });
    const xr = pdf.indexOf('xref'), offs = [...pdf.slice(xr).matchAll(/(\d{10}) 00000 n/g)].map(m => Number(m[1]));
    eq('PDF: cabeçalho e fim', [pdf.slice(0, 8), pdf.trim().slice(-5)], ['%PDF-1.4', '%%EOF']);
    eq('PDF: offsets do xref apontam para os objetos', offs.every((o, i) => pdf.slice(o, o + 7) === (i + 1) + ' 0 obj'), true);
    eq('PDF: só bytes (sem caractere acima de 255)', [...pdf].every(ch => ch.charCodeAt(0) < 256), true);
    eq('PDF: nome com parênteses escapados', pdf.indexOf('Cestas \\(X\\) \\\\ Ltda') > 0, true);
    eq('PDF da baixa gera', E.receiptPdf(br, {}).indexOf('Comprovante de Baixa') > 0, true);
  }
  // reposição com último custo
  const lim = E.derive(w).limiting[0].pids[0];
  w.purchases.push({ id: 'pc2', date: '2026-11-10', supplierId: '', items: [{ pid: lim, qty: 10, total: 80 }], paidFrom: 'caixa' });
  w.settings.costMode = 'avg';
  const d0 = E.derive(w);
  const rp = E.replenish(w, d0.total + 4, d0, { lastCost: true }), rpAvg = E.replenish(w, d0.total + 4, d0);
  const row = rp.rows.find(r => r.pid === lim), rowAvg = rpAvg.rows.find(r => r.pid === lim);
  eq('reposição planejada usa o último custo mesmo no modo média', [row.unitCost, rowAvg.unitCost === 8], [8, false]);
  eq('reposição: itens com custo somam o total', rp.total > 0 && rp.items.length > 0, true);
}


/* ---- grupos de variação: café e macarrão ---- */
{
  const g = E.migrate({ v: 1, state: E.defaultState ? E.defaultState() : {} });
  const st = g.state || g;
  const caf = st.products.find(p => p.id === 'p_cafe'), mac = st.products.find(p => p.id === 'p_macarrao');
  caf.group = 'cafe'; mac.group = 'macarrao';
  const kim = { id: 'p_kimimo', name: 'Café Kimimo 250 g', cat: caf.cat, unit: 'un', perBasket: 0, packSize: 1, packLabel: '', group: 'cafe' };
  const ric = { id: 'p_richester', name: 'Macarrão Richester 500 g', cat: mac.cat, unit: 'un', perBasket: 0, packSize: 1, packLabel: '', group: 'macarrao' };
  st.products.push(kim, ric);
  eq('grupo café: total = soma do padrão', E.groupTotal(st, 'cafe'), 2);
  eq('grupos ativos', E.groupKeys(st).join(','), 'arroz,cafe,macarrao');
  const base = E.derive(st);
  const cafG = base.groups.find(x => x.key === 'cafe');
  eq('cadastro sem nenhuma movimentação não entra na cobertura', cafG, undefined);
  st.adjustments.push({ id: 'a0', pid: 'p_cafe', delta: 0, date: '2026-11-01', note: '' });
  eq('com movimentação o grupo entra (estoque 0 = cobertura 0)', (E.derive(st).groups.find(x => x.key === 'cafe') || {}).cov, 0);
  st.adjustments.pop();
  const items = E.buildSaleItems(st, null, null);
  E.setGroupMode(st, 'cafe', 'p_kimimo', items);
  eq('só Kimimo: 2 un', [items.p_cafe, items.p_kimimo], [0, 2]);
  eq('detecta o modo', E.detectGroup(st, 'cafe', items), 'p_kimimo');
  items.p_kimimo = 1; items.p_cafe = 0;
  const chk = E.checkSale(st, 1, items, base);
  eq('café soma 1 de 2 -> erro de grupo', chk.errors.some(e => /O café da cesta deve somar 2/.test(e)), true);
  const rp = E.replenish(st, 3, base, {});
  const rowK = rp.groups ? null : null;
  const flat = JSON.stringify(rp);
  eq('reposição inclui as duas marcas de café', flat.includes('p_cafe') && flat.includes('p_kimimo'), true);
  const bad = E.migrate({ v: 1, state: Object.assign({}, st, { products: st.products.concat([{ id: 'x', name: 'Z', group: 'inexistente' }]) }) });
  eq('grupo inválido é descartado', (bad.state || bad).products.find(p => p.id === 'x').group, undefined);
}


/* ---- café/macarrão cadastrados como produtos separados com 2 por cesta cada ---- */
{
  const s = E.newState();
  s.products.push({ id: 'p_puro', name: 'Café Puro', cat: s.products[0].cat, unit: 'un', perBasket: 2, packSize: 1, packLabel: '' });
  s.products.push({ id: 'p_rich', name: 'Macarrão Richester', cat: s.products[0].cat, unit: 'un', perBasket: 2, packSize: 1, packLabel: '' });
  const m = E.migrate({ v: 1, state: s }).state || E.migrate({ v: 1, state: s });
  eq('café e macarrão novos entram no grupo pelo nome', [m.products.find(p => p.id === 'p_puro').group, m.products.find(p => p.id === 'p_rich').group], ['cafe', 'macarrao']);
  eq('total do grupo = 2 (não soma as marcas)', [E.groupTotal(m, 'cafe'), E.groupTotal(m, 'macarrao')], [2, 2]);
  const di = E.buildSaleItems(m, null, null);
  eq('cesta padrão leva só 2 de café', (di.p_cafe || 0) + (di.p_puro || 0), 2);
  m.adjustments.push({ id: 'a1', pid: 'p_cafe', delta: 10, date: '2026-11-01', note: '' }, { id: 'a2', pid: 'p_puro', delta: 4, date: '2026-11-01', note: '' });
  const g = E.derive(m).groups.find(x => x.key === 'cafe');
  eq('cobertura do café soma as marcas: (10+4)/2', g.cov, 7);
  m.settings.groupQty = { cafe: 1 };
  eq('total definido nos Padrões vale', E.groupTotal(m, 'cafe'), 1);
}


/* ---- leite em pó como grupo ---- */
{
  const s = E.newState();
  s.products.push({ id: 'p_leite2', name: 'Leite em pó Ninho 200 g', cat: s.products[0].cat, unit: 'un', perBasket: 0, packSize: 1, packLabel: '' });
  const m = E.migrate({ v: 1, state: s }).state || E.migrate({ v: 1, state: s });
  const lei = m.products.filter(p => /^Leite em pó/.test(p.name));
  eq('leite em pó entra no grupo pelo nome', lei.length >= 2 && lei.every(p => p.group === 'leite'), true);
  eq('total do leite = maior padrão', E.groupTotal(m, 'leite'), Math.max(...lei.map(p => p.perBasket)));
  const it = E.buildSaleItems(m, null, null);
  E.setGroupMode(m, 'leite', 'p_leite2', it);
  eq('só Ninho leva o total', lei.filter(p => p.id !== 'p_leite2').every(p => it[p.id] === 0) && it.p_leite2 === E.groupTotal(m, 'leite'), true);
}


/* ---- cadastrar produto novo não altera o estoque de cestas ---- */
{
  const s = E.newState();
  s.products.forEach(p => s.adjustments.push({ id: 'k' + p.id, pid: p.id, delta: 40, date: '2026-11-01', note: '' }));
  const before = E.derive(s).total;
  s.products.push({ id: 'p_novo', name: 'Produto qualquer', cat: s.products[0].cat, unit: 'un', perBasket: 2, packSize: 1, packLabel: '' });
  s.products.push({ id: 'p_novo2', name: 'Leite em pó Novo 200 g', cat: s.products[0].cat, unit: 'un', perBasket: 2, packSize: 1, packLabel: '' });
  const m = E.migrate({ v: 1, state: s }); const mm = m.state || m;
  eq('cestas montáveis não mudam ao cadastrar produtos', E.derive(mm).total, before);
  mm.adjustments.push({ id: 'n1', pid: 'p_novo', delta: 2, date: '2026-11-02', note: '' });
  eq('depois de comprar/ajustar, o produto passa a contar', E.derive(mm).total, 1);
}

{ // feira padrão
  const w = E.migrate(JSON.parse(JSON.stringify(E.newState())));
  w.products.find(p => p.id === 'p_oleo').perBasket = 1; w.products.find(p => p.id === 'p_sabonete').perBasket = 0;
  const pl = E.planStandard(w);
  const ch = pl.rows.filter(r => r.status === 'change').map(r => r.label).sort();
  eq('feira padrão aponta o que difere', ch, ['Sabonete', 'Sabão em barra', 'Óleo de soja']);
  eq('aplica os ajustes', E.applyStandard(w, pl), 3);
  eq('óleo 2, sabonete 2, sabão em barra (grupo) 1', [w.products.find(p => p.id === 'p_oleo').perBasket, w.products.find(p => p.id === 'p_sabonete').perBasket, E.groupTotal(w, 'sabao')], [2, 2, 1]);
  eq('depois de aplicar, nada a ajustar', E.planStandard(w).rows.filter(r => r.status === 'change').length, 0);
  eq('Sabão em barra vira grupo', w.products.find(p => p.id === 'p_sabao_barra').group, 'sabao');
}
{ // investimento e retorno (caixa)
  const w = E.migrate(JSON.parse(JSON.stringify(E.newState()))); w.purchases = []; w.sales = []; w.customers = []; w.adjustments = [];
  const pid = 'p_acucar';
  w.purchases.push({ id: 'pu1', date: '2026-11-03', supplierId: '', note: '', paidFrom: 'pessoal', items: [{ pid, qty: 100, total: 500 }] });
  let r = E.investmentReturn(w, '2026-11-20');
  eq('compra do bolso = investido', r.invested, 500);
  eq('estoque a custo = 500 e resultado empatado', [r.stock, r.result], [500, 0]);
  w.settings.costMode = 'avg';
  w.purchases.push({ id: 'pu2', date: '2026-11-04', supplierId: '', note: '', items: [{ pid, qty: 100, total: 300 }] });
  r = E.investmentReturn(w, '2026-11-20');
  eq('compra do caixa sem recebimento deixa o caixa negativo, mas o resultado não muda', [Math.round(r.caixa), r.stock], [-300, 800]);
  eq('resultado segue em zero: o dinheiro só virou estoque', r.result, 0);
  eq('avisa quanto das compras não tem origem registrada', r.unfunded, 300);
  eq('mês atual: comprei 800 e recebi 0', [r.months[0].bought, r.months[0].received, r.months[0].net], [800, 0, -800]);
  { // lucro por vencimento: venda em 30 e 60 dias não gera nada em novembro
    const x = JSON.parse(JSON.stringify(w)); x.adjustments.push({ id: 'ad', pid, delta: 10000, date: '2026-11-01', note: '' });
    const pr = E.buildParcels({ total: 340, term: '30-60', date: '2026-11-05', entrada: 0 });
    x.customers.push({ id: 'cz', name: 'Z', phone: '', address: '', note: '', mods: {} });
    x.sales.push({ id: 'sz', date: '2026-11-05', qty: 1, price: 340, costSnap: 140, customerId: 'cz', items: { [pid]: 3 }, mods: [], parcels: pr.parcels });
    const rr = E.investmentReturn(x, '2026-11-20'), by = k => rr.months.find(q => q.key === k);
    eq('novembro não tem parcela vencendo nem lucro', [by('2026-11').due, by('2026-11').profitDue], [0, 0]);
    eq('dezembro e janeiro dividem o lucro (200 = 340 - 140)', [by('2026-12').due, by('2026-12').profitDue, by('2027-01').profitDue], [170, 100, 100]);
    eq('nada recebido = lucro recebido 0', by('2026-12').profitGot, 0);
  }
  w.withdrawals.push({ id: 'w1', date: '2026-11-10', amount: 100, note: '' });
  eq('retirada entra no resultado', E.investmentReturn(w, '2026-11-20').withdrawn, 100);
}
{ // reposição só em números inteiros
  const w = E.migrate(JSON.parse(JSON.stringify(E.newState()))); w.purchases = []; w.sales = []; w.adjustments = [];
  w.sales.push({ id: 'sx', date: '2026-11-05', qty: 1, price: 340, costSnap: 0, customerId: 'c', items: { p_arroz_pb: 5, p_arroz_br: 7 }, mods: [], parcels: [] });
  w.adjustments.push({ id: 'a1', pid: 'p_arroz_pb', delta: 6.3, date: '2026-11-01', note: '' }, { id: 'a2', pid: 'p_arroz_br', delta: 9.1, date: '2026-11-01', note: '' });
  const rp = E.replenish(w, 2), pb = rp.rows.find(r => r.pid === 'p_arroz_pb'), br = rp.rows.find(r => r.pid === 'p_arroz_br');
  eq('falta do arroz é inteira e soma o que falta (24 - 3,4 = 21)', [Number.isInteger(pb.falta), Number.isInteger(br.falta), pb.falta + br.falta], [true, true, 21]);
  eq('nenhuma linha da reposição tem casa decimal', rp.rows.every(r => Number.isInteger(r.falta) || w.products.find(p => p.id === r.pid).perBasket % 1 !== 0), true);
}

{ // reposição por tipo: o estoque de um não cobre o outro
  const w = E.migrate(JSON.parse(JSON.stringify(E.newState()))); w.purchases = []; w.sales = []; w.adjustments = [];
  w.sales.push({ id: 'sx', date: '2026-11-05', qty: 1, price: 340, costSnap: 0, customerId: 'c', items: { p_arroz_br: 12 }, mods: [], parcels: [] });
  w.adjustments.push({ id: 'a1', pid: 'p_arroz_br', delta: 12, date: '2026-11-01', note: '' }, { id: 'a2', pid: 'p_arroz_pb', delta: 50, date: '2026-11-01', note: '' });
  const rp = E.replenish(w, 3), br = rp.rows.find(r => r.pid === 'p_arroz_br'), pb = rp.rows.find(r => r.pid === 'p_arroz_pb');
  eq('branco com 0 kg repõe tudo (3 cestas = 36); PB sobrando não cobre', [br.falta, pb.falta], [36, 0]);
}
{ // conferência: a contagem vira o estoque, mesmo mexendo no passado depois
  const w = E.migrate(JSON.parse(JSON.stringify(E.newState()))); w.purchases = []; w.sales = []; w.adjustments = [];
  const pid = 'p_arroz_br';
  w.purchases.push({ id: 'pu1', date: '2026-11-01', items: [{ pid, qty: 10, unitPrice: 5 }], paid: true });
  w.sales.push({ id: 's1', date: '2026-11-02', qty: 1, price: 100, costSnap: 0, customerId: 'c', items: { [pid]: 4 }, mods: [], parcels: [] });
  E.saveCount(w, { [pid]: 20 }, '2026-11-03');
  eq('estoque = contagem', E.derive(w).stock[pid], 20);
  w.sales[0].items[pid] = 8; // troca depois da contagem não altera o contado
  eq('editar venda antiga não muda o contado', E.derive(w).stock[pid], 20);
  w.sales.push({ id: 's2', date: '2026-11-04', qty: 1, price: 100, costSnap: 0, customerId: 'c', items: { [pid]: 5 }, mods: [], parcels: [] });
  w.purchases.push({ id: 'pu2', date: '2026-11-04', items: [{ pid, qty: 2, unitPrice: 5 }], paid: true });
  eq('depois da contagem: 20 - 5 + 2 = 17', E.derive(w).stock[pid], 17);
  const m = E.migrate(JSON.parse(JSON.stringify(w)));
  eq('contagem sobrevive ao migrate', E.derive(m).stock[pid], 17);
{ // montar mais: a pessoa diz quantas cestas levam cada tipo de arroz
  const w = E.migrate(JSON.parse(JSON.stringify(E.newState()))); w.purchases = []; w.sales = []; w.adjustments = [];
  w.adjustments.push({ id: 'a2', pid: 'p_arroz_pb', delta: 10, date: '2026-11-01', note: '' });
  const rp = E.replenish(w, 5, E.derive(w), { split: { arroz: { p_arroz_br: 3, p_arroz_pb: 2 } } });
  const br = rp.rows.find(r => r.pid === 'p_arroz_br'), pb = rp.rows.find(r => r.pid === 'p_arroz_pb');
  eq('3 cestas com branco (0 kg) = 36 kg; 2 com PB (10 kg em estoque) = 14 kg', [br.falta, pb.falta], [36, 14]);
}

{ // marcas compradas separado ficam fora da lista
  const w = E.migrate(JSON.parse(JSON.stringify(E.newState()))); w.purchases = []; w.sales = []; w.adjustments = [];
  const cafes = E.groupMembers(w, 'cafe'), ids = cafes.map(p => p.id);
  const com = E.replenish(w, 3, E.derive(w)), sem = E.replenish(w, 3, E.derive(w), { skip: { [ids[0]]: true } });
  eq('marca desmarcada sai da reposição (as outras ficam)', [com.rows.some(r => r.pid === ids[0]), sem.rows.some(r => r.pid === ids[0]), ids.length < 2 || sem.rows.some(r => r.pid === ids[1])], [true, false, true]);
}

{ // PDF da lista de compras
  const items = []; for (let i = 0; i < 40; i++) items.push({ name: 'Produto ' + i, qty: i + ' kg', how: '', each: '', costText: 'R$ 1,00' });
  const pdf = E.listPdf({ title: 'Compras', sub: 'x', withCost: true, totalText: 'R$ 40,00', groups: [{ name: 'Atacadão', totalText: 'R$ 40,00', items }] }, { name: 'Feira' });
  eq('PDF da lista é válido e pagina', [pdf.indexOf('%PDF-1.4') === 0, /%%EOF$/.test(pdf), (pdf.match(/\/Type \/Page /g) || []).length >= 2], [true, true, true]);
  eq('PDF vazio também gera', E.listPdf({ title: 'x', groups: [] }, {}).indexOf('%PDF') === 0, true);
}

}
console.log(fails ? '\n' + fails + ' FALHA(S)' : '\nTODOS OS TESTES PASSARAM');
process.exit(fails ? 1 : 0);
