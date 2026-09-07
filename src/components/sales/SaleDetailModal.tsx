import React from 'react';
import {
  ShoppingBag,
  Package,
  Calendar,
  DollarSign,
  TrendingUp,
  User,
  CreditCard,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Share2,
} from 'lucide-react';
import { Sale, Customer } from '../../types';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
  getDaysOverdue,
} from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { WhatsAppButton } from '../common/WhatsAppButton';

interface SaleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onOpenReceipt: (sale: Sale) => void;
  onOpenPaymentModal?: (installmentId: string) => void;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  isOpen,
  onClose,
  sale,
  onOpenReceipt,
  onOpenPaymentModal,
}) => {
  const { customers, installments, cancelSale, settings } = useApp();

  if (!sale) return null;

  const customer = customers.find((c) => c.id === sale.customerId);
  const saleInstallments = installments.filter((i) => i.saleId === sale.id);

  const handleCancelSale = () => {
    if (
      window.confirm(
        `Tem certeza que deseja cancelar a venda ${sale.saleNumber}? Os produtos retornarão ao estoque e as parcelas serão canceladas.`
      )
    ) {
      cancelSale(sale.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalhes da Venda ${sale.saleNumber}`}
      subtitle={`Realizada em ${formatDateTime(sale.createdAt)}`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Header Ribbon with Customer & Status */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Cliente:
              </span>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {sale.customerName}
              </h3>
              <StatusBadge status={sale.status} />
            </div>
            {customer && (
              <p className="text-xs text-slate-500 mt-0.5">
                {formatPhone(customer.phone)} • {customer.address || 'Sem endereço'}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenReceipt(sale)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>Ver Comprovante</span>
          </button>
        </div>

        {/* Lucratividade Real da Venda (Prompt Section 3 & 8) */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 sm:p-5 rounded-2xl text-white shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Custo e Lucratividade Congelados na Venda
            </span>
            <span className="text-xs font-bold text-emerald-400">
              Margem: {sale.profitMarginPct.toFixed(1)}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-[11px] text-slate-400 block">Valor da Venda</span>
              <span className="text-lg font-black text-white">{formatCurrency(sale.totalSaleValue)}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Custo de Montagem</span>
              <span className="text-lg font-black text-rose-300">{formatCurrency(sale.totalCost)}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Lucro Bruto</span>
              <span className="text-lg font-black text-emerald-400">{formatCurrency(sale.profit)}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Forma de Pgto</span>
              <span className="text-xs font-bold text-teal-300">
                {sale.paymentPlan === 'cash' ? 'À Vista' : `${sale.installmentsCount} parcelas`}
              </span>
            </div>
          </div>
        </div>

        {/* Itens e Composição da Cesta */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Composição da Cesta ({sale.items.length} produtos):</span>
            </h4>
            <span className="text-xs font-semibold text-slate-500">
              {sale.basketName}
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
            <div className="grid grid-cols-12 bg-slate-50 p-2.5 text-[11px] font-bold text-slate-600 uppercase">
              <span className="col-span-6">Produto</span>
              <span className="col-span-2 text-center">Qtd</span>
              <span className="col-span-2 text-right">Custo Un.</span>
              <span className="col-span-2 text-right">Custo Total</span>
            </div>

            {sale.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 p-2.5 text-xs text-slate-800 items-center">
                <span className="col-span-6 font-semibold truncate">{item.productName}</span>
                <span className="col-span-2 text-center font-bold">
                  {item.quantity} {item.unit}
                </span>
                <span className="col-span-2 text-right text-slate-500">
                  {formatCurrency(item.unitCost)}
                </span>
                <span className="col-span-2 text-right font-bold text-slate-900">
                  {formatCurrency(item.totalCost)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Parcelas e Cobranças desta Venda */}
        <div className="space-y-2">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>Parcelas / Contas a Receber ({saleInstallments.length})</span>
          </h4>

          <div className="space-y-2">
            {saleInstallments.map((inst) => {
              const days = getDaysOverdue(inst.dueDate);
              const isOver = inst.status === 'overdue' || (inst.status === 'pending' && days > 0);

              return (
                <div
                  key={inst.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">
                        Parcela {inst.installmentNumber}/{inst.totalInstallments}
                      </span>
                      <StatusBadge status={inst.status} />
                      <span className="text-xs text-slate-500">
                        Venc: <strong>{formatDate(inst.dueDate)}</strong>
                      </span>
                    </div>
                    {inst.status === 'paid' && (
                      <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                        Pago em {formatDate(inst.paymentDate || inst.dueDate)}{' '}
                        {inst.paymentMethod && `(${inst.paymentMethod.toUpperCase()})`}
                      </p>
                    )}
                    {isOver && inst.status !== 'paid' && (
                      <p className="text-[11px] text-rose-600 font-bold mt-0.5">
                        ⚠️ Vencida há {days} {days === 1 ? 'dia' : 'dias'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="font-black text-sm text-slate-900">
                      {formatCurrency(inst.amount)}
                    </span>
                    {inst.status !== 'paid' && inst.status !== 'cancelled' && (
                      <WhatsAppButton
                        installment={inst}
                        settings={settings}
                        daysOverdue={days}
                        customText={isOver ? 'Cobrar WhatsApp' : 'Lembrar'}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions (Cancel Sale) */}
        {sale.status === 'completed' && (
          <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
            <button
              type="button"
              onClick={handleCancelSale}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Cancelar Venda e Estornar Estoque</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
