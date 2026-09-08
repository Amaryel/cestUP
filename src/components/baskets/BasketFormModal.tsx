import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, Search, CheckCircle2, Package } from 'lucide-react';
import { BasketTemplate, BasketTemplateItem, Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { formatCurrency } from '../../utils/formatters';

interface BasketFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: BasketTemplate | null;
}

export const BasketFormModal: React.FC<BasketFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const { products, addBasketTemplate, updateBasketTemplate, settings } = useApp();

  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [defaultSalePrice, setDefaultSalePrice] = useState<number>(
    initialData?.defaultSalePrice || settings.defaultBasketPrice || 340.00
  );
  const [isDefault, setIsDefault] = useState<boolean>(initialData?.isDefault || false);
  const [items, setItems] = useState<BasketTemplateItem[]>(initialData?.items || []);
  const [searchProduct, setSearchProduct] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description);
      setDefaultSalePrice(initialData.defaultSalePrice);
      setIsDefault(initialData.isDefault);
      setItems(initialData.items);
    } else {
      setName('');
      setDescription('');
      setDefaultSalePrice(settings.defaultBasketPrice || 340.00);
      setIsDefault(false);
      setItems([]);
    }
  }, [initialData, isOpen, settings.defaultBasketPrice]);

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleAddProduct = (prod: Product) => {
    const existing = items.find((i) => i.productId === prod.id);
    if (existing) {
      handleUpdateQuantity(prod.id, 1);
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          quantity: 1,
          unit: prod.unit,
          unitCost: prod.unitCost,
        },
      ]);
    }
    setSearchProduct('');
  };

  const totalCost = items.reduce((acc, item) => {
    const prod = products.find((p) => p.id === item.productId);
    const cost = prod ? prod.unitCost : item.unitCost;
    return acc + cost * item.quantity;
  }, 0);

  const profit = defaultSalePrice - totalCost;
  const margin = defaultSalePrice > 0 ? (profit / defaultSalePrice) * 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Informe o nome da cesta.');
      return;
    }
    if (items.length === 0) {
      alert('Adicione pelo menos 1 produto à composição da cesta.');
      return;
    }

    if (initialData) {
      updateBasketTemplate(initialData.id, {
        name: name.trim(),
        description: description.trim(),
        defaultSalePrice,
        isDefault,
        items,
      });
    } else {
      addBasketTemplate({
        name: name.trim(),
        description: description.trim(),
        defaultSalePrice,
        isDefault,
        items,
      });
    }

    onClose();
  };

  const availableProducts = products.filter((p) => {
    if (p.status !== 'active') return false;
    if (!searchProduct) return true;
    return p.name.toLowerCase().includes(searchProduct.toLowerCase());
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Modelo de Cesta' : 'Novo Modelo de Cesta'}
      subtitle="Defina os produtos e quantidades que compõem este modelo de cesta padrão"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome do Modelo de Cesta *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Cesta Padrão Familiar, Cesta Econômica..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Preço de Venda Padrão (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              value={defaultSalePrice}
              onChange={(e) => setDefaultSalePrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Descrição do Modelo
          </label>
          <input
            type="text"
            placeholder="Ex: Contém 25 itens essenciais com marcas selecionadas para famílias"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Set as Default Basket */}
        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
          />
          <span>Definir como Cesta Principal / Padrão nas novas vendas</span>
        </label>

        {/* Live Cost & Profit Preview Strip */}
        <div className="bg-slate-900 text-white p-4 rounded-xl grid grid-cols-3 gap-3 text-center">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Custo Estimado</span>
            <span className="text-base sm:text-lg font-black text-rose-300 block">
              {formatCurrency(totalCost)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Preço de Venda</span>
            <span className="text-base sm:text-lg font-black text-emerald-400 block">
              {formatCurrency(defaultSalePrice)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Lucro / Margem</span>
            <span className="text-base sm:text-lg font-black text-teal-300 block">
              {formatCurrency(profit)} ({margin.toFixed(0)}%)
            </span>
          </div>
        </div>

        {/* Items list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Produtos na Composição ({items.length})
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Total de itens: {items.reduce((acc, i) => acc + i.quantity, 0)}
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Nenhum produto adicionado à cesta. Busque abaixo para incluir.
              </div>
            ) : (
              items.map((item) => {
                const prod = products.find((p) => p.id === item.productId);
                const unitCost = prod ? prod.unitCost : item.unitCost;
                return (
                  <div key={item.productId} className="p-2.5 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <p className="font-bold text-xs text-slate-900 truncate">{item.productName}</p>
                      <p className="text-[11px] text-slate-500">
                        Custo: {formatCurrency(unitCost)} • Total: {formatCurrency(unitCost * item.quantity)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.productId, -1)}
                          className="p-1 hover:bg-slate-200 text-slate-600 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setItems((prev) =>
                              prev.map((it) => (it.productId === item.productId ? { ...it, quantity: val } : it))
                            );
                          }}
                          className="w-12 text-center text-xs font-bold bg-transparent outline-none"
                        />
                        <span className="pr-1.5 text-[11px] text-slate-500 font-semibold">{item.unit}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.productId, 1)}
                          className="p-1 hover:bg-slate-200 text-slate-600 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.productId)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Product Search */}
          <div className="space-y-2 pt-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar produto do estoque para adicionar a este modelo..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {searchProduct && (
              <div className="max-h-36 overflow-y-auto bg-white border border-slate-200 rounded-xl p-1 shadow-md space-y-1">
                {availableProducts.slice(0, 5).map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleAddProduct(prod)}
                    className="w-full text-left p-2 hover:bg-emerald-50 rounded-lg text-xs flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-800">{prod.name}</span>
                    <span className="text-emerald-700 font-bold">+ {formatCurrency(prod.unitCost)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
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
            {initialData ? 'Salvar Alterações' : 'Cadastrar Modelo'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
