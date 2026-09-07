import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  PieChart,
  ShoppingBag,
  AlertCircle,
  Clock,
  CheckCircle2,
  Users,
  Download,
  Percent,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  formatCurrency,
  formatDate,
  getDaysOverdue,
  formatPhone,
} from '../../utils/formatters';
import { WhatsAppButton } from '../common/WhatsAppButton';

export const ReportsView: React.FC = () => {
  const { sales, installments, products, customers, settings, calculateMaxBasketsPossible } = useApp();

  const [period, setPeriod] = useState<'all' | 'this_month' | 'last_30_days'>('all');

  // Filter sales based on period
  const filteredSales = useMemo(() => {
    return sales.filter((s) => s.status === 'completed');
  }, [sales]);

  // Financial Metrics
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalSaleValue, 0);
  const totalCost = filteredSales.reduce((acc, s) => acc + s.totalCost, 0);
  const totalGrossProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

  // Realized profit calculation: (Paid amount / total sale value) * profit
  const activeInstallments = installments.filter((i) => i.status !== 'cancelled');
  const totalReceived = activeInstallments
    .filter((i) => i.status === 'paid')
    .reduce((acc, i) => acc + (i.paidAmount || i.amount), 0);
  const totalPending = activeInstallments
    .filter((i) => i.status === 'pending')
    .reduce((acc, i) => acc + i.amount, 0);
  const totalOverdue = activeInstallments
    .filter((i) => i.status === 'overdue')
    .reduce((acc, i) => acc + i.amount, 0);

  // Profit breakdown
  const realizedProfit = totalRevenue > 0 ? (totalReceived / totalRevenue) * totalGrossProfit : 0;
  const pendingProfit = totalGrossProfit - realizedProfit;

  // Overdue report items
  const overdueInstallments = activeInstallments.filter((i) => {
    const days = getDaysOverdue(i.dueDate);
    return i.status === 'overdue' || (i.status !== 'paid' && days > 0);
  });

  // Most sold items calculation
  const productSalesMap = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; totalCost: number; unit: string }> = {};
    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!map[item.productId]) {
          map[item.productId] = {
            name: item.productName,
            quantity: 0,
            totalCost: 0,
            unit: item.unit,
          };
        }
        map[item.productId].quantity += item.quantity;
        map[item.productId].totalCost += item.totalCost;
      });
    });
    return Object.values(map).sort((a, b) => b.quantity - a.quantity);
  }, [filteredSales]);

  const maxBasketsInfo = calculateMaxBasketsPossible();

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Relatórios Financeiros & DRE
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
              Lucratividade Real
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Análise detalhada de receita bruta, custo de mercadorias, lucro realizado e inadimplência.
          </p>
        </div>
      </div>

      {/* DRE FINANCEIRO DA OPERAÇÃO DE CESTAS */}
      <div className="bg-[#1e293b] p-6 rounded-lg text-white border border-slate-700 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-700 pb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base sm:text-lg">
              Demonstrativo de Resultado do Exercício (DRE)
            </h3>
          </div>
          <span className="text-xs text-blue-400 font-bold bg-blue-950/80 px-3 py-1 rounded border border-blue-800">
            Margem Média: {avgMargin.toFixed(1)}%
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Receita Bruta */}
          <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider block">
              1. Receita Bruta Total
            </span>
            <span className="text-xl sm:text-2xl font-bold text-white mt-1 block">
              {formatCurrency(totalRevenue)}
            </span>
            <span className="text-xs text-slate-400 mt-1 block">{filteredSales.length} cestas vendidas</span>
          </div>

          {/* Custo Mercadorias (CMV) */}
          <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider block">
              2. Custo dos Produtos (CMV)
            </span>
            <span className="text-xl sm:text-2xl font-bold text-rose-400 mt-1 block">
              - {formatCurrency(totalCost)}
            </span>
            <span className="text-xs text-slate-400 mt-1 block">Insumos de montagem</span>
          </div>

          {/* Lucro Bruto Total */}
          <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider block">
              3. Lucro Bruto Geral
            </span>
            <span className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1 block">
              {formatCurrency(totalGrossProfit)}
            </span>
            <span className="text-xs text-slate-400 mt-1 block">Vendas menos custos</span>
          </div>

          {/* Ticket Médio de Lucro por Cesta */}
          <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider block">
              4. Lucro Médio / Cesta
            </span>
            <span className="text-xl sm:text-2xl font-bold text-blue-300 mt-1 block">
              {formatCurrency(filteredSales.length > 0 ? totalGrossProfit / filteredSales.length : 0)}
            </span>
            <span className="text-xs text-slate-400 mt-1 block">Custo ~R$ 170 | Venda R$ 340</span>
          </div>
        </div>

        {/* Lucro Realizado vs Lucro a Receber */}
        <div className="pt-4 border-t border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-emerald-950/40 border border-emerald-800/60 p-4 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">
                Lucro Realizado (Já no Caixa)
              </span>
              <p className="text-xs text-emerald-400 mt-0.5">
                Correspondente às parcelas efetivamente pagas
              </p>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-emerald-300">
              {formatCurrency(realizedProfit)}
            </span>
          </div>

          <div className="bg-amber-950/40 border border-amber-800/60 p-4 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                Lucro a Realizar (A Prazo)
              </span>
              <p className="text-xs text-amber-400 mt-0.5">
                Das parcelas que ainda vão vencer
              </p>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-amber-300">
              {formatCurrency(pendingProfit)}
            </span>
          </div>
        </div>
      </div>

      {/* RELATÓRIO DE INADIMPLÊNCIA & COBRANÇA */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>Relatório de Inadimplência & Cobrança ({overdueInstallments.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Parcelas vencidas não pagas que exigem contato pelo WhatsApp.
            </p>
          </div>

          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded border border-rose-200">
            Total em Atraso: {formatCurrency(totalOverdue)}
          </span>
        </div>

        {overdueInstallments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            🎉 Parabéns! Não há nenhuma parcela vencida no momento. A taxa de inadimplência é 0%!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Parcela</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3">Dias em Atraso</th>
                  <th className="py-2.5 px-3 text-right">Valor Vencido</th>
                  <th className="py-2.5 px-3 text-center">Ação WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueInstallments.map((inst) => {
                  const days = getDaysOverdue(inst.dueDate);
                  return (
                    <tr key={inst.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {inst.customerName}
                        {inst.customerPhone && (
                          <span className="block text-[11px] font-normal text-slate-500">
                            {formatPhone(inst.customerPhone)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {inst.installmentNumber}/{inst.totalInstallments}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {formatDate(inst.dueDate)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700">
                          {days} dias
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                        {formatCurrency(inst.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <WhatsAppButton
                          installment={inst}
                          settings={settings}
                          daysOverdue={days}
                          customText="Cobrar"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RELATÓRIO DE GIRO DE PRODUTOS */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            <span>Itens Mais Vendidos nas Cestas</span>
          </h3>
          <p className="text-xs text-slate-500">
            Contagem cumulativa de produtos expedidos nas cestas básicas entregues aos clientes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {productSalesMap.slice(0, 9).map((item, idx) => (
            <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs sm:text-sm text-slate-900 block truncate max-w-[170px]">
                  {item.name}
                </span>
                <span className="text-[11px] text-slate-500">
                  Custo acumulado: {formatCurrency(item.totalCost)}
                </span>
              </div>
              <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">
                {item.quantity} {item.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
