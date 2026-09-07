import React, { useState } from 'react';
import { Product, StockMovementType } from '../../types';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { adjustStock } = useApp();

  const [type, setType] = useState<StockMovementType>('in_adjustment');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('');

  if (!product) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      alert('Informe uma quantidade válida.');
      return;
    }
    if (!reason.trim()) {
      alert('Por favor, informe a justificativa ou motivo do ajuste de estoque.');
      return;
    }

    adjustStock(product.id, type, quantity, reason.trim());
    onClose();
  };

  const isEntry = type === 'in_purchase' || type === 'in_adjustment' || type === 'in_return';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajuste Manual de Estoque"
      subtitle={`Produto: ${product.name} (Saldo Atual: ${product.stock} ${product.unit})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo de Ajuste */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Tipo de Movimentação *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('in_adjustment')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                type === 'in_adjustment'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              + Entrada / Sobra / Inventário
            </button>
            <button
              type="button"
              onClick={() => setType('out_adjustment')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                type === 'out_adjustment'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              - Saída / Ajuste / Inventário
            </button>
            <button
              type="button"
              onClick={() => setType('out_loss')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                type === 'out_loss'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              - Perda / Avaria / Vencimento
            </button>
            <button
              type="button"
              onClick={() => setType('in_return')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                type === 'in_return'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              + Devolução de Cliente
            </button>
          </div>
        </div>

        {/* Quantidade */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Quantidade a {isEntry ? 'Adicionar' : 'Subtrair'} ({product.unit}) *
          </label>
          <input
            type="number"
            min="1"
            required
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Novo saldo resultante:{' '}
            <strong className="text-slate-800">
              {isEntry ? product.stock + quantity : Math.max(0, product.stock - quantity)}{' '}
              {product.unit}
            </strong>
          </p>
        </div>

        {/* Justificativa */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Motivo / Justificativa do Ajuste *
          </label>
          <textarea
            required
            rows={2}
            placeholder="Ex: Contagem física de inventário, embalagem danificada no transporte, bonificação de fornecedor..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
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
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            Confirmar Ajuste
          </button>
        </div>
      </form>
    </Modal>
  );
};
