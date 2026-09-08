import React, { useState, useEffect } from 'react';
import { Package, Calculator, Info, Check } from 'lucide-react';
import { Product, UnitType, PackageType } from '../../types';
import { Modal } from '../common/Modal';
import { formatCurrency } from '../../utils/formatters';

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
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Alimentos');
  const [unit, setUnit] = useState<UnitType>('un');

  // Packaging specs
  const [packageType, setPackageType] = useState<PackageType>('fardo');
  const [unitsPerPackage, setUnitsPerPackage] = useState<number>(1);
  const [packageCost, setPackageCost] = useState<number>(0);

  // Unit stock & cost
  const [unitCost, setUnitCost] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(10);
  const [referencePrice, setReferencePrice] = useState<number>(0);
  const [status, setStatus] = useState<Product['status']>('active');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCategory(initialData.category);
      setUnit(initialData.unit || 'un');
      setPackageType(initialData.packageType || (initialData.unit === 'kg' ? 'fardo' : 'caixa'));
      const unitsPerPkg = initialData.unitsPerPackage || 1;
      setUnitsPerPackage(unitsPerPkg);
      const pkgCost = initialData.packageCost ?? (initialData.unitCost * unitsPerPkg);
      setPackageCost(pkgCost);
      setUnitCost(initialData.unitCost || (unitsPerPkg > 0 ? pkgCost / unitsPerPkg : 0));
      setStock(initialData.stock || 0);
      setMinStock(initialData.minStock || 10);
      setReferencePrice(initialData.referencePrice || initialData.refPrice || 0);
      setStatus(initialData.status || 'active');
    } else {
      setName('');
      setCategory('Alimentos');
      setUnit('un');
      setPackageType('fardo');
      setUnitsPerPackage(20);
      setPackageCost(60);
      setUnitCost(3);
      setStock(0);
      setMinStock(15);
      setReferencePrice(0);
      setStatus('active');
    }
  }, [initialData, isOpen]);

  // Recalculate unitCost when packageCost or unitsPerPackage changes
  const handlePackageCostChange = (val: number) => {
    setPackageCost(val);
    if (unitsPerPackage > 0) {
      const calculated = parseFloat((val / unitsPerPackage).toFixed(4));
      setUnitCost(calculated);
    }
  };

  const handleUnitsPerPackageChange = (val: number) => {
    const qty = Math.max(1, val);
    setUnitsPerPackage(qty);
    if (packageCost > 0) {
      const calculated = parseFloat((packageCost / qty).toFixed(4));
      setUnitCost(calculated);
    } else if (unitCost > 0) {
      setPackageCost(parseFloat((unitCost * qty).toFixed(2)));
    }
  };

  const handleUnitCostChange = (val: number) => {
    setUnitCost(val);
    if (unitsPerPackage > 0) {
      setPackageCost(parseFloat((val * unitsPerPackage).toFixed(2)));
    }
  };

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
      category: category.trim() || 'Alimentos',
      unit,
      packageType,
      unitsPerPackage: Number(unitsPerPackage) || 1,
      packageCost: Number(packageCost) || Number((unitCost * (unitsPerPackage || 1)).toFixed(2)),
      stock: Number(stock) || 0,
      minStock: Number(minStock) || 0,
      unitCost: Number(unitCost) || 0,
      refPrice: Number(referencePrice) || 0,
      referencePrice: Number(referencePrice) || 0,
      status,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? `Editar: ${initialData.name}` : 'Cadastrar Novo Produto'}
      subtitle="Configure os dados do produto, embalagem de atacado (fardo/caixa) e custo por unidade de estoque"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome do Produto */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Nome do Produto *
          </label>
          <input
            type="text"
            required
            placeholder="Ex: Arroz, Feijão, Flocão de milho, Sabão em pó..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#2563eb] outline-none"
          />
        </div>

        {/* Categoria e Unidade de Estoque */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Categoria *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#2563eb] outline-none"
            >
              <option value="Alimentos">Alimentos</option>
              <option value="Limpeza e Higiene">Limpeza e Higiene</option>
              <option value="Matinais">Matinais & Biscoitos</option>
              <option value="Grãos e Cereais">Grãos e Cereais</option>
              <option value="Massas e Farinhas">Massas e Farinhas</option>
              <option value="Doces e Sobremesas">Doces e Sobremesas</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Unidade de Estoque e Consumo na Cesta *
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as UnitType)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#2563eb] outline-none"
            >
              <option value="kg">kg — Quilograma (ex: Arroz, Feijão, Sal)</option>
              <option value="un">un — Unidade (ex: Café, Biscoito, Sabonete, Óleo)</option>
              <option value="pct">pct — Pacote</option>
              <option value="lt">lt — Litro</option>
              <option value="lata">lata — Lata</option>
              <option value="cx">cx — Caixa</option>
              <option value="fardo">fardo — Fardo</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              * A cesta básica consome esta unidade base ({unit}).
            </p>
          </div>
        </div>

        {/* Bloco de Embalagem de Compra no Atacado */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Embalagem de Compra no Atacado (Fardo / Caixa)
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Tipo de Embalagem
              </label>
              <select
                value={packageType}
                onChange={(e) => setPackageType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#2563eb] outline-none"
              >
                <option value="fardo">Fardo</option>
                <option value="caixa">Caixa</option>
                <option value="pacote">Pacote / Fardinho</option>
                <option value="saco">Saco / Sacaria</option>
                <option value="lata">Lata / Tambor</option>
                <option value="unidade">Unidade Avulsa</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Quantidade por Embalagem ({unit}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={unitsPerPackage}
                onChange={(e) => handleUnitsPerPackageChange(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#2563eb] outline-none"
                placeholder="Ex: 30 (kg/fardo) ou 20 (un/cx)"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Custo da Embalagem (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={packageCost}
                onChange={(e) => handlePackageCostChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-blue-700 focus:ring-2 focus:ring-[#2563eb] outline-none"
                placeholder="Ex: 120.00"
              />
            </div>
          </div>

          {/* Resumo do Cálculo Automático */}
          <div className="bg-white p-2.5 rounded-lg border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Calculator className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                1 {packageType} com <strong>{unitsPerPackage} {unit}</strong> a{' '}
                <strong>{formatCurrency(packageCost)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-emerald-700">
              <span>Custo Unitário:</span>
              <span className="text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {formatCurrency(unitCost)} / {unit}
              </span>
            </div>
          </div>
        </div>

        {/* Custo Unitário Direto & Preço de Referência */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Custo Unitário de Estoque (R$ / {unit}) *
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              required
              value={unitCost}
              onChange={(e) => handleUnitCostChange(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#2563eb] outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">
              Valor usado na soma de custos da cesta básica ({formatCurrency(unitCost)} por {unit}).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Preço Sugerido de Venda Avulsa (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={referencePrice}
              onChange={(e) => setReferencePrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#2563eb] outline-none"
              placeholder="Opcional"
            />
          </div>
        </div>

        {/* Estoque Atual e Estoque Mínimo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Saldo Atual em Estoque ({unit})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={stock}
              onChange={(e) => setStock(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#2563eb] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Estoque Mínimo de Alerta ({unit})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={minStock}
              onChange={(e) => setMinStock(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#2563eb] outline-none"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Status do Produto
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="prodStatus"
                value="active"
                checked={status === 'active'}
                onChange={() => setStatus('active')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>Ativo no Catálogo</span>
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
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {initialData ? 'Salvar Alterações' : 'Cadastrar Produto'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
