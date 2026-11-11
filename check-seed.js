const E = require('./engine.js');
const SEED = require('./seed.js');
let fails = 0;
const eq = (l, g, w) => { const ok = JSON.stringify(g) === JSON.stringify(w); if (!ok) fails++; console.log((ok ? 'OK   ' : 'FALHA') + ' ' + l + ' -> ' + JSON.stringify(g) + (ok ? '' : ' (esperado ' + JSON.stringify(w) + ')')); };

// totais impressos em cada comprovante
const printed = { c_psilva: 300.58, c_atacadao1: 316.60, c_atacadao2: 41.44, c_casasf: 270.00, c_imperio: 24.90, c_rcarvalho: 613.08, c_mix: 404.74, c_feijao_tapioca: 330.00 };
SEED.purchases.forEach(p => eq('total ' + p.id, E.round2(p.items.reduce((a, i) => a + i.total, 0)), printed[p.id]));
eq('total investido', E.round2(SEED.purchases.reduce((a, p) => a + p.items.reduce((b, i) => b + i.total, 0), 0)), 2301.34);

const st = E.newState();
st.suppliers = SEED.suppliers; st.purchases = SEED.purchases;
const m = E.migrate(JSON.parse(JSON.stringify(st)));
const pids = new Set(m.products.map(p => p.id));
eq('todos os produtos das compras existem no catálogo', SEED.purchases.every(p => p.items.every(i => pids.has(i.pid))), true);
eq('todo fornecedor citado existe', SEED.purchases.every(p => !p.supplierId || m.suppliers.some(s => s.id === p.supplierId)), true);
eq('todos os 25 produtos foram comprados', m.products.every(p => m.purchases.some(pu => pu.items.some(i => i.pid === p.id))), true);

const d = E.derive(m);
eq('estoque cobre 10 cestas', d.total, 10);
console.log('itens que limitam:', d.limiting.map(g => g.name + '(' + g.cov + ')').join(', '));
console.log('cobertura por item:');
d.groups.forEach(g => console.log('  ' + g.name + ': ' + g.cov));
eq('sem parcelas atrasadas', E.lateSummary(m, '2026-11-11').count, 0);
eq('sem alertas', E.alerts(m, d, '2026-11-11'), { urgent: null, near: null, late: null });

const bc = E.basketCost(m);
console.log('custo da cesta:', E.money(bc.cost), '| itens sem custo:', bc.missing.length, '| lucro bruto a R$ 340:', E.money(340 - bc.cost), '| margem', Math.round((340 - bc.cost) / 340 * 1000) / 10 + '%');
const c = E.cash(m);
eq('caixa: investido', c.invested, 2301.34);
console.log('custo unitário (última compra):');
m.products.forEach(p => console.log('  ' + p.name + ': ' + E.money(E.unitCost(m, p.id)) + ' / ' + p.unit + ' × ' + p.perBasket + ' = ' + E.money(E.unitCost(m, p.id) * p.perBasket)));

console.log(fails ? '\n' + fails + ' FALHA(S)' : '\nCONFERÊNCIA OK');
process.exit(fails ? 1 : 0);
