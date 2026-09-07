import React from 'react';
import {
  Phone,
  MapPin,
  FileText,
  ShoppingBag,
  CreditCard,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  Calendar,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { Customer } from '../../types';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { formatCurrency, formatDate, formatPhone, formatDocument, getDaysOverdue } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { WhatsAppButton } from '../common/WhatsAppButton';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onEditCustomer: (customer: Customer) => void;
  onOpenNewSaleForCustomer: (customer: Customer) => void;
  onSelectSale: (saleId: string) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
  onEditCustomer,
  onOpenNewSaleForCustomer,
  onSelectSale,
}) => {
  const { sales, installments, getCustomerStats, settings } = useApp();

  if (!customer) return null;

  const stats = getCustomerStats(customer.id);
  const customerSales = sales.filter((s) => s.customerId === customer.id);
  const customerInstallments = installments.filter((i) => i.customerId === customer.id && i.status !== 'cancelled');

  const pendingInstallments = customerInstallments.filter((i) => i.status === 'pending' || i.status === 'overdue');
  const paidInstallments = customerInstallments.filter((i) => i.status === 'paid');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer.name}
      subtitle={`Cliente desde ${formatDate(customer.createdAt)}`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Customer Header Info Bar */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1 text-xs sm:text-sm text-slate-600">
            {customer.document && (
              <p>
                <strong className="text-slate-900">CPF/CNPJ:</strong> {formatDocument(customer.document)}
              </p>
            )}
            <p className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{formatPhone(customer.phone || customer.whatsapp)}</span>
            </p>
            {customer.address && (
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {customer.address} {customer.neighborhood && `• ${customer.neighborhood}`}{' '}
                  {customer.city && `• ${customer.city}`}
                </span>
              </p>
            )}
            {customer.notes && (
              <p className="text-slate-500 italic mt-1 bg-white p-2 rounded border border-slate-200">
                📝 "{customer.notes}"
              </p>
            )}
          </div>

          <div className="flex sm:flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNewSaleForCustomer(customer);
              }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-xs sm:text-sm rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Vender Cesta</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditCustomer(customer);
              }}
              className="flex-1 sm:flex-none px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Editar Dados
            </button>
          </div>
        </div>

        {/* Financial Summary KPI Cards (as specified in prompt section 1) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Comprado */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between text-xs text-blue-700 font-semibold uppercase tracking-wider">
              <span>Total Comprado</span>
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              {formatCurrency(stats.totalPurchased)}
            </div>
            <span className="text-[11px] text-blue-600 font-medium">
              {stats.basketsCount} {stats.basketsCount === 1 ? 'cesta' : 'cestas'}
            </span>
          </div>

          {/* Total Pago */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold uppercase tracking-wider">
              <span>Total Pago</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-base sm:text-lg font-bold text-emerald-700 mt-1">
              {formatCurrency(stats.totalPaid)}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">
              {paidInstallments.length} parcelas pagas
            </span>
          </div>

          {/* Total em Aberto */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between text-xs text-amber-700 font-semibold uppercase tracking-wider">
              <span>A Receber</span>
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="text-base sm:text-lg font-bold text-amber-700 mt-1">
              {formatCurrency(stats.totalPending)}
            </div>
            <span className="text-[11px] text-amber-600 font-medium">
              {pendingInstallments.filter((i) => i.status === 'pending').length} parcelas
            </span>
          </div>

          {/* Total Vencido */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between text-xs text-rose-700 font-semibold uppercase tracking-wider">
              <span>Vencido</span>
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
            <div className="text-base sm:text-lg font-bold text-rose-700 mt-1">
              {formatCurrency(stats.totalOverdue)}
            </div>
            <span className="text-[11px] text-rose-600 font-medium">
              {stats.hasOverdue ? 'Atenção com atrasos' : 'Sem atrasos'}
            </span>
          </div>
        </div>

        {/* PRÓXIMOS VENCIMENTOS / PARCELAS EM ABERTO */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Cobranças & Próximos Vencimentos</span>
            </h4>
            <span className="text-xs text-slate-500 font-medium">
              {pendingInstallments.length} pendência(s)
            </span>
          </div>

          {pendingInstallments.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center text-slate-500 text-xs">
              Nenhuma parcela pendente. Cliente está 100% em dia!
            </div>
          ) : (
            <div className="space-y-2">
              {pendingInstallments.map((inst) => {
                const days = getDaysOverdue(inst.dueDate);
                const isOver = inst.status === 'overdue' || days > 0;
                return (
                  <div
                    key={inst.id}
                    className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      isOver
                        ? 'bg-rose-50/50 border-rose-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={inst.status} />
                        <span className="text-xs font-bold text-slate-900">
                          Parcela {inst.installmentNumber}/{inst.totalInstallments}
                        </span>
                        <span className="text-xs text-slate-500">
                          Vencimento: <strong>{formatDate(inst.dueDate)}</strong>
                        </span>
                      </div>
                      {isOver && (
                        <p className="text-[11px] text-rose-700 font-bold mt-0.5">
                          ⚠️ Atrasada há {days} {days === 1 ? 'dia' : 'dias'}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className="font-bold text-sm text-slate-900">
                        {formatCurrency(inst.amount)}
                      </span>
                      <WhatsAppButton
                        installment={inst}
                        settings={settings}
                        daysOverdue={days}
                        customText={isOver ? 'Cobrar Vencido' : 'Lembrar WhatsApp'}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* HISTÓRICO DE VENDAS & CESTAS COMPRADAS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <span>Histórico de Vendas & Cestas Compradas ({customerSales.length})</span>
            </h4>
          </div>

          {customerSales.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center text-slate-500 text-xs">
              Nenhuma venda registrada para este cliente.
            </div>
          ) : (
            <div className="space-y-3">
              {customerSales.map((sale) => (
                <div
                  key={sale.id}
                  className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2.5"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          {sale.saleNumber}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({formatDate(sale.createdAt)})
                        </span>
                        <StatusBadge status={sale.status} />
                      </div>
                      <p className="text-xs text-blue-700 font-semibold mt-0.5">
                        {sale.basketName}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-sm text-slate-900">
                        {formatCurrency(sale.totalSaleValue)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Custo: {formatCurrency(sale.totalCost)} | Lucro: {formatCurrency(sale.profit)}
                      </div>
                    </div>
                  </div>

                  {/* Itens da Cesta */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Composição da Cesta Entregue ({sale.items.length} itens):
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs text-slate-700">
                      {sale.items.map((item, idx) => (
                        <div key={idx} className="truncate">
                          • {item.quantity}x {item.productName}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>
                      Plano: {sale.paymentPlan === 'cash' ? 'À vista' : `${sale.installmentsCount} parcelas`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectSale(sale.id);
                      }}
                      className="text-blue-700 hover:text-blue-800 font-semibold underline cursor-pointer"
                    >
                      Ver Detalhes da Venda
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* HISTÓRICO DE PAGAMENTOS REALIZADOS */}
        {paidInstallments.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Histórico de Pagamentos Recebidos ({paidInstallments.length})</span>
            </h4>
            <div className="divide-y divide-slate-100 bg-slate-50 rounded-lg border border-slate-200 p-3">
              {paidInstallments.map((inst) => (
                <div key={inst.id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">
                      Parcela {inst.installmentNumber}/{inst.totalInstallments}
                    </span>
                    <span className="text-slate-500 ml-2">
                      Pago em: {formatDate(inst.paymentDate || inst.dueDate)}
                    </span>
                    {inst.paymentMethod && (
                      <span className="ml-1 uppercase text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                        {inst.paymentMethod}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(inst.paidAmount || inst.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
