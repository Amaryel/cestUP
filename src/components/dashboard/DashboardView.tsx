import React from 'react';
import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  ShoppingBag,
  Users,
  ArrowUpRight,
  ArrowRight,
  PlusCircle,
  Truck,
  MessageCircle,
  DollarSign,
  PieChart,
  Boxes,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, getDaysOverdue } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { WhatsAppButton } from '../common/WhatsAppButton';

interface DashboardViewProps {
  onOpenNewSale: () => void;
  onOpenNewCustomer: () => void;
  onOpenNewPurchase: (product?: any) => void;
  onSelectSale: (saleId: string) => void;
  onSelectCustomer: (customerId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewSale,
  onOpenNewCustomer,
  onOpenNewPurchase,
  onSelectSale,
  onSelectCustomer,
}) => {
  const { summaryMetrics, sales, settings, setActiveTab, setSelectedCustomerId } = useApp();

  const recentSales = sales.slice(0, 5);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Quick Shortcuts */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#2563eb]/10 text-[#2563eb]">
              Visão Geral
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Painel de Vendas, Custos e Lucro
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-2xl">
            Acompanhe o faturamento, custos de insumos das cestas, margem de lucro real e controle de cobranças.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenNewSale}
            className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold rounded-lg text-sm transition-colors shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nova Venda</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewCustomer}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-xs sm:text-sm border border-slate-300 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Novo Cliente</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenNewPurchase()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-xs sm:text-sm border border-slate-300 transition-colors cursor-pointer"
          >
            <Truck className="w-4 h-4 text-slate-500" />
            <span>Registrar Compra</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Faturamento Mês
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(summaryMetrics.monthlyRevenue)}
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-slate-500 font-medium">
              <span>{summaryMetrics.monthlySalesCount} cestas no mês</span>
              <span className="text-slate-400">Total: {formatCurrency(summaryMetrics.allTimeRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Custo Total das Mercadorias (CMV) */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Custo dos Insumos
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-amber-700 tracking-tight">
              {formatCurrency(summaryMetrics.monthlyCost)}
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-slate-500 font-medium">
              <span>Custo Mês</span>
              <span className="text-slate-400">Total: {formatCurrency(summaryMetrics.allTimeCost)}</span>
            </div>
          </div>
        </div>

        {/* Lucro Bruto & Margem */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Lucro Líquido Mês
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 tracking-tight">
              {formatCurrency(summaryMetrics.monthlyProfit)}
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-emerald-700 font-semibold">
              <span className="flex items-center gap-1">
                <PieChart className="w-3.5 h-3.5" />
                <span>{summaryMetrics.monthlyProfitMargin.toFixed(1)}% margem</span>
              </span>
              <span className="text-slate-500 font-normal">Total: {formatCurrency(summaryMetrics.allTimeProfit)}</span>
            </div>
          </div>
        </div>

        {/* Total a Receber / Vencido */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              A Receber / Vencido
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-indigo-600 tracking-tight">
              {formatCurrency(summaryMetrics.totalReceivable)}
            </div>
            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="text-slate-500">{summaryMetrics.next7DaysList.length} nos próx. 7d</span>
              {summaryMetrics.totalOverdue > 0 ? (
                <span className="font-bold text-rose-600">
                  {formatCurrency(summaryMetrics.totalOverdue)} vencido
                </span>
              ) : (
                <span className="font-bold text-emerald-600">0 vencidos</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DRE SUMMARY BANNER */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-lg p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Resultado Financeiro Consolidado
              </span>
              <span className="text-xs text-slate-400">Total de Vendas no Sistema</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              Demonstrativo de Lucratividade Operacional
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-6 bg-slate-800/80 p-3 rounded-lg border border-slate-700/60 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Faturamento Total</span>
              <span className="text-sm sm:text-base font-bold text-white">{formatCurrency(summaryMetrics.allTimeRevenue)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Custo Total (CMV)</span>
              <span className="text-sm sm:text-base font-bold text-amber-400">{formatCurrency(summaryMetrics.allTimeCost)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Lucro Real Acumulado</span>
              <span className="text-sm sm:text-base font-bold text-emerald-400">{formatCurrency(summaryMetrics.allTimeProfit)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Margem Média</span>
              <span className="text-sm sm:text-base font-bold text-cyan-300">{summaryMetrics.allTimeProfitMargin.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: ALERTAS DE COBRANÇAS (Vencidas, Vencendo Hoje, Próximos Vencimentos) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Vencidos (Priority #1) */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <h2 className="font-bold text-rose-900 text-sm">
                Cobranças Vencidas ({summaryMetrics.overdueList.length})
              </h2>
            </div>
            <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
              {formatCurrency(summaryMetrics.totalOverdue)}
            </span>
          </div>

          <div className="p-3 sm:p-4 space-y-2.5 grow overflow-y-auto max-h-[360px]">
            {summaryMetrics.overdueList.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
                <p className="text-sm font-medium text-slate-600">Nenhuma cobrança vencida!</p>
                <p className="text-xs text-slate-400">Todos os clientes estão em dia.</p>
              </div>
            ) : (
              summaryMetrics.overdueList.map((inst) => {
                const days = getDaysOverdue(inst.dueDate);
                return (
                  <div
                    key={inst.id}
                    className="p-3 bg-rose-50/40 hover:bg-rose-50/70 border border-rose-200 rounded-lg transition-colors flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(inst.customerId);
                            setActiveTab('clientes');
                          }}
                          className="font-bold text-sm text-slate-900 hover:text-rose-700 hover:underline text-left cursor-pointer"
                        >
                          {inst.customerName}
                        </button>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Parcela {inst.installmentNumber}/{inst.totalInstallments} • Venceu em {formatDate(inst.dueDate)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm text-rose-700">
                          {formatCurrency(inst.amount)}
                        </span>
                        <div className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded mt-0.5">
                          {days} {days === 1 ? 'dia' : 'dias'} de atraso
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between">
                      <span className="text-xs text-slate-500 truncate max-w-[120px]">
                        {inst.customerPhone || 'Sem tel.'}
                      </span>
                      <WhatsAppButton
                        installment={inst}
                        settings={settings}
                        daysOverdue={days}
                        customText="Cobrar WhatsApp"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {summaryMetrics.overdueList.length > 0 && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={() => setActiveTab('cobrancas')}
                className="text-xs font-semibold text-rose-700 hover:text-rose-800 flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <span>Ver todas as cobranças</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 2. Vencendo Hoje */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h2 className="font-bold text-amber-900 text-sm">
                Vencendo Hoje ({summaryMetrics.dueTodayList.length})
              </h2>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
              {formatCurrency(summaryMetrics.totalDueToday)}
            </span>
          </div>

          <div className="p-3 sm:p-4 space-y-2.5 grow overflow-y-auto max-h-[360px]">
            {summaryMetrics.dueTodayList.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto text-amber-400 mb-1" />
                <p className="text-sm font-medium text-slate-600">Nenhuma parcela vence hoje</p>
                <p className="text-xs text-slate-400">Verifique os próximos vencimentos.</p>
              </div>
            ) : (
              summaryMetrics.dueTodayList.map((inst) => (
                <div
                  key={inst.id}
                  className="p-3 bg-amber-50/40 hover:bg-amber-50/70 border border-amber-200 rounded-lg transition-colors flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(inst.customerId);
                          setActiveTab('clientes');
                        }}
                        className="font-bold text-sm text-slate-900 hover:text-amber-700 hover:underline text-left cursor-pointer"
                      >
                        {inst.customerName}
                      </button>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Parcela {inst.installmentNumber}/{inst.totalInstallments} • Vence Hoje!
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-amber-700">
                        {formatCurrency(inst.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
                    <span className="text-xs text-slate-500 truncate max-w-[120px]">
                      {inst.customerPhone}
                    </span>
                    <WhatsAppButton
                      installment={inst}
                      settings={settings}
                      customText="Lembrar Hoje"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <button
              type="button"
              onClick={() => setActiveTab('cobrancas')}
              className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <span>Gerenciar Contas a Receber</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3. Próximos Vencimentos (7 Dias) */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-slate-600" />
              <h2 className="font-bold text-slate-800 text-sm">
                Próximos 7 Dias ({summaryMetrics.next7DaysList.length})
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
              {formatCurrency(summaryMetrics.totalNext7Days)}
            </span>
          </div>

          <div className="p-3 sm:p-4 space-y-2.5 grow overflow-y-auto max-h-[360px]">
            {summaryMetrics.next7DaysList.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <CalendarIcon className="w-8 h-8 mx-auto text-slate-400 mb-1" />
                <p className="text-sm font-medium text-slate-600">Sem vencimentos nos próximos 7 dias</p>
                <p className="text-xs text-slate-400">Novas vendas agendarão novos vencimentos.</p>
              </div>
            ) : (
              summaryMetrics.next7DaysList.map((inst) => (
                <div
                  key={inst.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(inst.customerId);
                          setActiveTab('clientes');
                        }}
                        className="font-bold text-sm text-slate-900 hover:text-blue-700 hover:underline text-left cursor-pointer"
                      >
                        {inst.customerName}
                      </button>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Parcela {inst.installmentNumber}/{inst.totalInstallments} • Vence {formatDate(inst.dueDate)}
                      </div>
                    </div>
                    <span className="font-bold text-sm text-slate-800">
                      {formatCurrency(inst.amount)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {inst.customerPhone}
                    </span>
                    <WhatsAppButton
                      installment={inst}
                      settings={settings}
                      variant="outline"
                      customText="Avisar WhatsApp"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <button
              type="button"
              onClick={() => setActiveTab('cobrancas')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <span>Ver todas as parcelas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION: ESTOQUE BAIXO & ÚLTIMAS VENDAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Estoque Baixo / Alerta de Reposição */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Estoque Crítico / Baixo
                  </h3>
                  <p className="text-xs text-slate-500">Produtos que precisam de compra</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                {summaryMetrics.lowStockProducts.length} itens
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {summaryMetrics.lowStockProducts.length === 0 ? (
                <div className="py-6 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
                  <p className="text-xs font-medium text-slate-600">Estoque 100% abastecido</p>
                </div>
              ) : (
                summaryMetrics.lowStockProducts.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 bg-slate-50 hover:bg-amber-50/50 rounded-lg border border-slate-200 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 truncate max-w-[160px]">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Mínimo: {p.minStock} {p.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-xs font-bold text-rose-600">
                          {p.stock} {p.unit}
                        </span>
                        <p className="text-[10px] text-slate-400">em estoque</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenNewPurchase(p)}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] rounded transition-colors cursor-pointer"
                        title={`Repor ${p.name}`}
                      >
                        + Repor
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('estoque')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Ver inventário
            </button>
            <button
              type="button"
              onClick={onOpenNewPurchase}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2563eb] hover:text-[#1d4ed8] cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Comprar Produtos</span>
            </button>
          </div>
        </div>

        {/* Últimas Vendas */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Últimas Vendas Realizadas
                  </h3>
                  <p className="text-xs text-slate-500">Composição, custo, valor e lucro em tempo real</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('vendas')}
                className="text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8] flex items-center gap-1 cursor-pointer"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {recentSales.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-sm">Nenhuma venda cadastrada ainda.</p>
                </div>
              ) : (
                recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => onSelectSale(sale.id)}
                    className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          {sale.customerName}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {sale.saleNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate max-w-[240px] sm:max-w-md">
                        {sale.basketName} • {sale.items.length} itens ({formatDate(sale.createdAt)})
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-sm text-slate-900">
                        {formatCurrency(sale.totalSaleValue)}
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-600">
                        Lucro: {formatCurrency(sale.profit)} ({sale.profitMarginPct.toFixed(0)}%)
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Preço padrão: <strong className="text-slate-800">{formatCurrency(settings.defaultBasketPrice)}</strong>
            </span>
            <button
              type="button"
              onClick={onOpenNewSale}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nova Venda</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}
