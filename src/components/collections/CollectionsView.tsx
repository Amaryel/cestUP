import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Filter,
  DollarSign,
  Users,
  MessageCircle,
  PlusCircle,
  Check,
} from 'lucide-react';
import { Installment } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  formatCurrency,
  formatDate,
  getDaysDifference,
  getDaysOverdue,
  formatPhone,
} from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { WhatsAppButton } from '../common/WhatsAppButton';
import { PaymentModal } from './PaymentModal';

interface CollectionsViewProps {
  onSelectSale: (saleId: string) => void;
  onSelectCustomer: (customerId: string) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  onSelectSale,
  onSelectCustomer,
}) => {
  const { installments, summaryMetrics, settings } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState<'all' | 'overdue' | 'today' | 'next7' | 'pending' | 'paid'>('all');
  const [selectedInstallmentForPayment, setSelectedInstallmentForPayment] = useState<Installment | null>(null);

  const filteredInstallments = installments.filter((inst) => {
    if (inst.status === 'cancelled') return false;

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      inst.customerName.toLowerCase().includes(term) ||
      (inst.customerPhone && inst.customerPhone.includes(term)) ||
      (inst.customerWhatsapp && inst.customerWhatsapp.includes(term));

    if (!matchesSearch) return false;

    const diff = getDaysDifference(inst.dueDate);

    if (statusTab === 'overdue') {
      return inst.status === 'overdue' || (inst.status !== 'paid' && diff < 0);
    }
    if (statusTab === 'today') {
      return inst.status !== 'paid' && diff === 0;
    }
    if (statusTab === 'next7') {
      return inst.status !== 'paid' && diff > 0 && diff <= (settings.alertDaysNotice || 7);
    }
    if (statusTab === 'pending') {
      return inst.status === 'pending' || inst.status === 'overdue';
    }
    if (statusTab === 'paid') {
      return inst.status === 'paid';
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Contas a Receber & Cobranças
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-700">
              {installments.filter((i) => i.status !== 'cancelled').length} parcelas
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gerenciamento financeiro de parcelas das cestas básicas e cobranças automáticas no WhatsApp.
          </p>
        </div>
      </div>

      {/* Financial Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total a Receber */}
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total a Receber</span>
          <span className="text-base sm:text-lg font-bold text-amber-600 mt-0.5 block">
            {formatCurrency(summaryMetrics.totalReceivable)}
          </span>
          <span className="text-[11px] text-slate-500">Parcelas pendentes</span>
        </div>

        {/* Total Recebido */}
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Recebido</span>
          <span className="text-base sm:text-lg font-bold text-emerald-600 mt-0.5 block">
            {formatCurrency(summaryMetrics.totalReceived)}
          </span>
          <span className="text-[11px] text-slate-500">Parcelas liquidadas</span>
        </div>

        {/* Total Vencido */}
        <div className="bg-white p-4 rounded-lg border border-rose-200 bg-rose-50/20">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Total Vencido</span>
          <span className="text-base sm:text-lg font-bold text-rose-600 mt-0.5 block">
            {formatCurrency(summaryMetrics.totalOverdue)}
          </span>
          <span className="text-[11px] text-rose-600 font-semibold">
            {summaryMetrics.overdueList.length} em atraso
          </span>
        </div>

        {/* Vencem nos Próx. 7 Dias */}
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Próximos 7 Dias</span>
          <span className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 block">
            {formatCurrency(summaryMetrics.totalNext7Days)}
          </span>
          <span className="text-[11px] text-slate-500">
            {summaryMetrics.next7DaysList.length} parcelas
          </span>
        </div>

        {/* Inadimplentes */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inadimplentes</span>
          <span className="text-base sm:text-lg font-bold text-rose-600 mt-0.5 block">
            {summaryMetrics.defaultersCount}
          </span>
          <span className="text-[11px] text-slate-500">Com parcelas vencidas</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-slate-200 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar cobrança por nome do cliente ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#2563eb] outline-none"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          <button
            type="button"
            onClick={() => setStatusTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusTab === 'all'
                ? 'bg-[#1e293b] text-white'
                : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            Todas ({installments.filter((i) => i.status !== 'cancelled').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('overdue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              statusTab === 'overdue'
                ? 'bg-rose-600 text-white'
                : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Vencidas ({summaryMetrics.overdueList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              statusTab === 'today'
                ? 'bg-amber-600 text-white'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Vencem Hoje ({summaryMetrics.dueTodayList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('next7')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              statusTab === 'next7'
                ? 'bg-[#2563eb] text-white'
                : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Próximos 7 Dias ({summaryMetrics.next7DaysList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusTab === 'pending'
                ? 'bg-[#1e293b] text-white'
                : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            Todas Pendentes
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('paid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              statusTab === 'paid'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Pagas</span>
          </button>
        </div>
      </div>

      {/* Installments Table / Cards */}
      {filteredInstallments.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400">
          <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-base font-bold text-slate-700">Nenhuma cobrança encontrada</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm
              ? 'Tente buscar por outro termo ou alterar a aba de filtros.'
              : 'Nenhuma parcela corresponde ao filtro selecionado.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInstallments.map((inst) => {
            const days = getDaysOverdue(inst.dueDate);
            const diff = getDaysDifference(inst.dueDate);
            const isOver = inst.status === 'overdue' || (inst.status !== 'paid' && diff < 0);
            const isDueToday = inst.status !== 'paid' && diff === 0;

            return (
              <div
                key={inst.id}
                className={`bg-white rounded-lg border transition-colors p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isOver
                    ? 'border-rose-200 bg-rose-50/20 hover:border-rose-300'
                    : isDueToday
                    ? 'border-amber-200 bg-amber-50/20 hover:border-amber-300'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Left details */}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onSelectCustomer(inst.customerId)}
                      className="font-bold text-sm sm:text-base text-slate-900 hover:text-[#2563eb] hover:underline text-left cursor-pointer"
                    >
                      {inst.customerName}
                    </button>
                    <StatusBadge status={inst.status} />
                    {isOver && inst.status !== 'paid' && (
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                        {days} {days === 1 ? 'dia' : 'dias'} em atraso
                      </span>
                    )}
                    {isDueToday && (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        Vence Hoje
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                    <span>
                      Parcela <strong>{inst.installmentNumber}</strong> de{' '}
                      <strong>{inst.totalInstallments}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Vencimento: <strong>{formatDate(inst.dueDate)}</strong>
                    </span>
                    {inst.customerPhone && (
                      <>
                        <span>•</span>
                        <span>{formatPhone(inst.customerPhone)}</span>
                      </>
                    )}
                  </div>

                  {inst.status === 'paid' && (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                      ✓ Pago em {formatDate(inst.paymentDate || inst.dueDate)}{' '}
                      {inst.paymentMethod && `via ${inst.paymentMethod.toUpperCase()}`}
                      {inst.notes && ` (${inst.notes})`}
                    </p>
                  )}
                </div>

                {/* Right Amount & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Valor
                    </span>
                    <span className="font-bold text-base sm:text-lg text-slate-900">
                      {formatCurrency(inst.amount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Botão Baixar Pagamento */}
                    {inst.status !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => setSelectedInstallmentForPayment(inst)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Dar Baixa</span>
                      </button>
                    )}

                    {/* Botão WhatsApp */}
                    {inst.status !== 'paid' && (
                      <WhatsAppButton
                        installment={inst}
                        settings={settings}
                        daysOverdue={days}
                        variant="subtle"
                        customText={isOver ? 'Cobrar WhatsApp' : 'Lembrar WhatsApp'}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={!!selectedInstallmentForPayment}
        onClose={() => setSelectedInstallmentForPayment(null)}
        installment={selectedInstallmentForPayment}
      />
    </div>
  );
};
