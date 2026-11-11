/* Dados iniciais: compras de 10/11/2026 (comprovantes) + feijão e tapioca informados pelo usuário.
   Usados somente quando o navegador ainda não tem dados salvos. */
(function (root) {
  'use strict';
  var D = '2026-11-10';
  function it(pid, qty, total) { return { pid: pid, qty: qty, total: total }; }

  var suppliers = [
    { id: 's_psilva', name: 'P. da Silva & Filhos Ltda', address: 'Rua São Benedito, 58 - Picos/PI', phone: '', doc: '' },
    { id: 's_atacadao', name: 'Atacadão das Variedades', address: 'Rua São Benedito, 61 - Bomba, Picos/PI', phone: '8994121283', doc: '' },
    { id: 's_casasf', name: 'Casa São Francisco', address: 'Rua do Cruzeiro, 139 - Centro, Picos/PI', phone: '8934151110', doc: '' },
    { id: 's_imperio', name: 'Império Atacarejo', address: '', phone: '', doc: '' },
    { id: 's_rcarvalho', name: 'RCarvalho (RMC Comércio de Alimentos Ltda)', address: 'Av. Senador Helvídio Nunes, 748 - Boa Sorte, Picos/PI', phone: '', doc: '32.267.292/0005-43' },
    { id: 's_mix', name: 'Mix Barato Supermercado', address: 'Av. Anísio da Luz, 1045 - Ipueiras, Picos/PI', phone: '', doc: '42.561.689/0001-73' }
  ];

  var purchases = [
    { id: 'c_psilva', date: D, supplierId: 's_psilva', note: 'Pedido 13099105, à vista (sabonete: 1 dúzia rosa + 1 dúzia branco)', items: [
      it('p_corante', 10, 8.94), it('p_pimenta', 10, 11.98), it('p_esponja', 80, 51.87), it('p_margarina', 12, 73.34),
      it('p_sabonete', 24, 35.20), it('p_sabao_po', 30, 85.54), it('p_sal', 30, 33.71)] },
    { id: 'c_atacadao1', date: D, supplierId: 's_atacadao', note: 'Pedido 00237895, à vista', items: [
      it('p_cracker', 10, 50.90), it('p_maria', 10, 62.90), it('p_pasta', 12, 61.80), it('p_goiaba', 16, 44.00), it('p_sabao_barra', 20, 97.00)] },
    { id: 'c_atacadao2', date: D, supplierId: 's_atacadao', note: 'Pedido 00237906, à vista', items: [it('p_papel', 16, 41.44)] },
    { id: 'c_casasf', date: D, supplierId: 's_casasf', note: 'Pedido 00018130, à vista (2 fardos de arroz branco 30x1 kg, R$ 135,00 cada)', items: [it('p_arroz_br', 60, 270.00)] },
    { id: 'c_imperio', date: D, supplierId: 's_imperio', note: 'Cartão', items: [it('p_detergente', 10, 24.90)] },
    { id: 'c_rcarvalho', date: D, supplierId: 's_rcarvalho', note: 'NFC-e 17.538, débito', items: [
      it('p_cafe', 20, 262.00), it('p_leite', 20, 89.80), it('p_macarrao', 28, 78.40), it('p_agua_san', 12, 23.88), it('p_oleo', 20, 159.00)] },
    { id: 'c_mix', date: D, supplierId: 's_mix', note: 'NFC-e 1234, débito, valores já com desconto (R$ 29,66)', items: [
      it('p_arroz_pb', 60, 255.00), it('p_acucar', 30, 99.99), it('p_flocao', 30, 49.75)] },
    { id: 'c_feijao_tapioca', date: D, supplierId: '', note: 'Feijão R$ 150,00 e tapioca R$ 180,00 (R$ 330,00 ao todo). Feijão 32 kg e tapioca 30 kg. Fornecedor a confirmar', items: [
      it('p_feijao', 32, 150.00), it('p_tapioca', 30, 180.00)] }
  ];

  root.SEED = { suppliers: suppliers, purchases: purchases };
})(typeof window !== 'undefined' ? window : globalThis);
if (typeof module !== 'undefined' && module.exports) module.exports = globalThis.SEED;
