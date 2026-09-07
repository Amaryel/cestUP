import React, { useState } from 'react';
import { CreditCard, CheckCircle2, DollarSign, Calendar, MessageCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Installment } from '../../types';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { formatCurrency, formatDate, getTodayDateString } from '../../utils/formatters';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: Installment | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  installment,
}) => {
  const { recordPayment } = useApp();

  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(getTodayDateString());
  const [paymentMethod, setPaymentMethod] = useState<Installment['paymentMethod']>('pix');
  const [notes, setNotes] = useState<string>('');

  React.useEffect(() => {
    if (installment) {
      const remaining = installment.amount - (installment.paidAmount || 0);
      setAmount(remaining > 0 ? remaining : installment.amount);
      setPaymentDate(getTodayDateString());
      setPaymentMethod(installment.paymentMethod || 'pix');
      setNotes('');
    }
  }, [installment, isOpen]);

  if (!installment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Informe um valor de pagamento válido.');
      return;
    }

    recordPayment(
      installment.id,
      amount,
      paymentMethod,
      notes.trim() || undefined,
      paymentDate
    );

    // Confetti celebration
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Baixa de Pagamento / Parcela"
      subtitle={`Cliente: ${installment.customerName}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Parcela Info Box */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Parcela:</span>
            <span className="font-bold text-slate-800">
              {installment.installmentNumber} de {installment.totalInstallments}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Data de Vencimento:</span>
            <span className="font-bold text-slate-800">{formatDate(installment.dueDate)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 border-t border-slate-200 pt-1 mt-1">
            <span>Valor Total da Parcela:</span>
            <span className="font-black text-sm text-slate-900">
              {formatCurrency(installment.amount)}
            </span>
          </div>
        </div>

        {/* Valor do Pagamento */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Valor Pago (R$) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-lg font-black text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Permite pagamento total ou parcial da parcela.
          </p>
        </div>

        {/* Forma de Pagamento */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Forma de Pagamento *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'pix', label: 'PIX' },
              { id: 'dinheiro', label: 'Dinheiro' },
              { id: 'cartao_credito', label: 'Crédito' },
              { id: 'cartao_debito', label: 'Débito' },
              { id: 'transferencia', label: 'TED/DOC' },
              { id: 'outro', label: 'Outro' },
            ].map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setPaymentMethod(method.id as Installment['paymentMethod'])}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                  paymentMethod === method.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data do Pagamento */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Data do Recebimento
          </label>
          <input
            type="date"
            required
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Observações (Opcional)
          </label>
          <input
            type="text"
            placeholder="Ex: Comprovante recebido no WhatsApp às 14h..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-98"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmar Recebimento ({formatCurrency(amount)})</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
