import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, Search, CheckCircle2, ShoppingCart, AlertCircle, PackagePlus, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Product, PurchaseItem, UnitType } from '../../types';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { formatCurrency, getTodayDateString } from '../../utils/formatters';

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProduct?: Product | { id: string; name: string; unitCost: number; unit?: any; stock?: number; minStock?: number; requiredPerBasket?: number } | null;
}

export const NewPurchaseModal: React.FC<NewPurchaseModalProps> = ({ isOpen, onClose, preselectedProduct }) => {
  const { products, addProduct, createPurchase } = useApp();

  const [supplierName, setSupplierName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(getTodayDateString());
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State for inline quick product creation
  const [isCreatingNewProduct, setIsCreatingNewProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Mercearia');
  const [newProductUnit, setNewProductUnit] = useState<UnitType>('un');
  const [newProductCost, setNewProductCost] = useState<number>(0);

  // Reset or pre-fill form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSupplierName('');
      setPurchaseDate(getTodayDateString());
      setPaymentMethod('pix');
      setProductSearch('');
      setErrorMessage(null);
      setIsCreatingNewProduct(false);
      setNewProductName('');
      setNewProductCost(0);

      if (preselectedProduct) {
        const matchingProd = products.find((p) => p.id === preselectedProduct.id);
        const prod = matchingProd || preselectedProduct;
        const defaultQty = (preselectedProduct as any).requiredPerBasket
          ? Math.max(30, (preselectedProduct as any).requiredPerBasket * 30)
          : (prod as any).minStock
          ? Math.max(20, (prod as any).minStock * 2)
          : 20;

        const cost = prod.unitCost || 0;
        setItems([
          {
            productId: prod.id,
            productName: prod.name,
            quantity: defaultQty,
            unit: prod.unit || 'un',
            unitCost: cost,
            totalCost: defaultQty * cost,
          },
        ]);
        setNotes(`Reposição de insumo limitante: ${prod.name}`);
      } else {
        setItems([]);
        setNotes('');
      }
    }
  }, [isOpen, preselectedProduct, products]);

  const handleAddItem = (prod: Product) => {
    setErrorMessage(null);
    const existing = items.find((i) => i.productId === prod.id);
    if (existing) {
      setItems((prev) =>
        prev.map((i) =>
          i.productId === prod.id
            ? { ...i, quantity: i.quantity + 10, totalCost: (i.quantity + 10) * i.unitCost }
            : i
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          quantity: 20, // default batch quantity
          unit: prod.unit,
          unitCost: prod.unitCost,
          totalCost: 20 * prod.unitCost,
        },
      ]);
    }
    setProductSearch('');
  };

  const handleUpdateItem = (
    productId: string,
    field: 'quantity' | 'unitCost',
    value: number
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const qty = field === 'quantity' ? Math.max(1, value) : item.quantity;
          const cost = field === 'unitCost' ? Math.max(0, value) : item.unitCost;
          return {
            ...item,
            quantity: qty,
            unitCost: cost,
            totalCost: qty * cost,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleQuickCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      setErrorMessage('Informe o nome do novo produto.');
      return;
    }

    const created = addProduct({
      name: newProductName.trim(),
      category: newProductCategory,
      unit: newProductUnit,
      stock: 0,
      minStock: 20,
      unitCost: newProductCost || 1,
      refPrice: (newProductCost || 1) * 1.5,
      status: 'active',
    });

    handleAddItem(created);
    setNewProductName('');
    setIsCreatingNewProduct(false);
    setErrorMessage(null);
  };

  const totalAmount = items.reduce((acc, i) => acc + i.totalCost, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!supplierName.trim()) {
      setErrorMessage('Por favor, informe o nome do fornecedor ou distribuidor.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Adicione pelo menos 1 produto à compra antes de salvar.');
      return;
    }

    createPurchase({
      supplier: supplierName.trim(),
      supplierName: supplierName.trim(),
      date: purchaseDate,
      purchaseDate,
      items,
      totalCost: totalAmount,
      totalAmount,
      paymentMethod,
      notes: notes.trim() || undefined,
    });

    try {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 },
      });
    } catch {}

    onClose();
  };

  const filteredCatalogProducts = products.filter((p) => {
    if (!productSearch) return true;
    const term = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Compra de Insumos (Fornecedor)"
      subtitle="O estoque será aumentado e o custo dos produtos será atualizado automaticamente"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Fornecedor & Data */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Fornecedor / Atacadista *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Atacadão S/A, Distribuidora Central, Cerealista..."
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Data da Compra
            </label>
            <input
              type="date"
              required
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>
        </div>

        {/* Forma de Pagamento e Observação */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Forma de Pagamento
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
            >
              <option value="pix">PIX (À Vista)</option>
              <option value="boleto">Boleto a Prazo (30/60 dias)</option>
              <option value="transferencia">Transferência TED/DOC</option>
              <option value="dinheiro">Dinheiro em Espécie</option>
              <option value="cartao_credito">Cartão de Crédito</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Observações / Nº Nota Fiscal (NF-e)
            </label>
            <input
              type="text"
              placeholder="Ex: NF-e 45892, entrega no depósito..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>
        </div>

        {/* Produtos Comprados Lista */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Itens da Compra ({items.length})
              </span>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold underline cursor-pointer"
                >
                  Limpar tudo
                </button>
              )}
            </div>
            <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              Total Compra: {formatCurrency(totalAmount)}
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                Nenhum produto adicionado. Selecione produtos do catálogo abaixo.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.productId}
                  className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                      {item.productName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Subtotal: <strong className="text-slate-800">{formatCurrency(item.totalCost)}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Qtd ({item.unit || 'un'}):</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(item.productId, 'quantity', parseInt(e.target.value) || 1)
                        }
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold text-slate-900 text-center"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Custo Un:</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitCost}
                        onChange={(e) =>
                          handleUpdateItem(item.productId, 'unitCost', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold text-blue-700 text-right"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.productId)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Remover item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Catalog Selector / Search Section */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar produto no catálogo para adicionar à compra..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#2563eb]"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsCreatingNewProduct(!isCreatingNewProduct)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
              >
                <PackagePlus className="w-3.5 h-3.5 text-blue-600" />
                <span>+ Novo Produto</span>
              </button>
            </div>

            {/* Quick Inline Product Creator Form */}
            {isCreatingNewProduct && (
              <div className="p-3 bg-white border border-blue-200 rounded-lg space-y-2.5 shadow-xs">
                <p className="text-xs font-bold text-blue-900">Cadastrar Novo Produto Rápido no Catálogo:</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Nome do produto (Ex: Arroz 5kg)"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="sm:col-span-2 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs"
                  />
                  <select
                    value={newProductUnit}
                    onChange={(e) => setNewProductUnit(e.target.value as UnitType)}
                    className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-medium"
                  >
                    <option value="un">Unidade (un)</option>
                    <option value="kg">Quilo (kg)</option>
                    <option value="pct">Pacote (pct)</option>
                    <option value="lt">Litro (lt)</option>
                    <option value="lata">Lata (lata)</option>
                    <option value="cx">Caixa (cx)</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Custo Un (R$)"
                    value={newProductCost}
                    onChange={(e) => setNewProductCost(parseFloat(e.target.value) || 0)}
                    className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-right"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewProduct(false)}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickCreateProduct}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded cursor-pointer"
                  >
                    Salvar e Adicionar
                  </button>
                </div>
              </div>
            )}

            {/* Quick Product Chips to Click */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Clique para adicionar ao lote de compra:
              </span>
              <div className="max-h-32 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 bg-white border border-slate-200 rounded-lg">
                {filteredCatalogProducts.map((prod) => {
                  const isAdded = items.some((i) => i.productId === prod.id);
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleAddItem(prod)}
                      className={`text-left p-1.5 rounded border text-xs flex flex-col justify-between transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-blue-50 border-blue-200 text-blue-900 font-semibold'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span className="truncate text-xs font-medium">{prod.name}</span>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                        <span>Est: {prod.stock} {prod.unit}</span>
                        <span className="text-blue-700 font-bold">{formatCurrency(prod.unitCost)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
          <div className="text-sm font-bold text-slate-900">
            Total: {formatCurrency(totalAmount)}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-xs sm:text-sm rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar e Atualizar Estoque</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
