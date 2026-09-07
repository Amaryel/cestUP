import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { Modal } from '../common/Modal';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Product, 'id' | 'createdAt'>) => void;
  initialData?: Product | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState(initialData?.category || 'Alimentos');
  const [unit, setUnit] = useState(initialData?.unit || 'un');
  const [stock, setStock] = useState<number>(initialData?.stock || 0);
  const [minStock, setMinStock] = useState<number>(initialData?.minStock || 10);
  const [unitCost, setUnitCost] = useState<number>(initialData?.unitCost || 0);
  const [referencePrice, setReferencePrice] = useState<number>(initialData?.referencePrice || 0);
  const [status, setStatus] = useState<Product['status']>(initialData?.status || 'active');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCategory(initialData.category);
      setUnit(initialData.unit);
      setStock(initialData.stock);
      setMinStock(initialData.minStock);
      setUnitCost(initialData.unitCost);
      setReferencePrice(initialData.referencePrice || 0);
      setStatus(initialData.status);
    } else {
      setName('');
      setCategory('Alimentos');
      setUnit('un');
      setStock(0);
      setMinStock(10);
      setUnitCost(0);
      setReferencePrice(0);
      setStatus('active');
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Informe o nome do produto.');
      return;
    }
    if (unitCost < 0) {
      alert('O custo unitário não pode ser negativo.');
      return;
    }

    onSave({
      name: name.trim(),
      category: category.trim() || 'Geral',
      unit: unit.trim() || 'un',
      stock: Number(stock) || 0,
      minStock: Number(minStock) || 0,
      unitCost: Number(unitCost) || 0,
      referencePrice: Number(referencePrice) || 0,
      status,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Produto' : 'Cadastrar Novo Produto'}
      subtitle="Cadastre o item que compõe as cestas básicas e controle o custo unitário"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome do Produto */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Nome do Produto e Embalagem *
          </label>
          <input
            type="text"
            required
            placeholder="Ex: Arroz Branco Tipo 1 5kg, Óleo de Soja 900ml..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Categoria e Unidade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="Alimentos">Alimentos Básicos</option>
              <option value="Enlatados">Enlatados & Molhos</option>
              <option value="Matinais">Matinais & Biscoitos</option>
              <option value="Doces">Doces & Sobremesas</option>
              <option value="Limpeza">Limpeza</option>
              <option value="Higiene">Higiene Pessoal</option>
              <option value="Embalagem">Embalagens & Caixas</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Unidade de Medida
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="un">un (Unidade / Pacote)</option>
              <option value="pct">pct (Pacote)</option>
              <option value="kg">kg (Quilograma)</option>
              <option value="lata">lata (Lata)</option>
              <option value="litro">litro (Litro)</option>
              <option value="cx">cx (Caixa / Fardo)</option>
            </select>
          </div>
        </div>

        {/* Custo Unitário e Preço de Referência */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Custo Unitário de Compra (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={unitCost}
              onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-rose-700 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">Usado para calcular custo da cesta.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Preço de Referência / Venda Avulsa (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={referencePrice}
              onChange={(e) => setReferencePrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Estoque Inicial e Mínimo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Estoque Atual
            </label>
            <input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Estoque Mínimo de Alerta
            </label>
            <input
              type="number"
              min="0"
              value={minStock}
              onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Status
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="prodStatus"
                value="active"
                checked={status === 'active'}
                onChange={() => setStatus('active')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span>Ativo</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="prodStatus"
                value="inactive"
                checked={status === 'inactive'}
                onChange={() => setStatus('inactive')}
                className="text-slate-500"
              />
              <span>Inativo</span>
            </label>
          </div>
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
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all"
          >
            {initialData ? 'Salvar Alterações' : 'Cadastrar Produto'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
