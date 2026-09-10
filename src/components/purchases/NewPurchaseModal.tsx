import React, { useState, useEffect } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  Search,
  CheckCircle2,
  ShoppingCart,
  AlertCircle,
  PackagePlus,
  ArrowRight,
  Package,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Product, PurchaseItem, UnitType, PackageType } from '../../types';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { formatCurrency, getTodayDateString } from '../../utils/formatters';

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProduct?:
    | Product
    | {
        id: string;
        name: string;
        unitCost: number;
        unit?: any;
        stock?: number;
        minStock?: number;
        requiredPerBasket?: number;
      }
    | null;
}

interface PurchaseItemDraft {
  productId: string;
  productName: string;
  unit: UnitType;
  // Packaging mode
  mode: 'package' | 'unit';
  packageType: PackageType;
  packageCount: number; // e.g., 2 fardos
  unitsPerPackage: number; // e.g., 30 kg/fardo
  packageCost: number; // e.g., R$ 120,00/fardo
  // Resulting stock values
  quantity: number; // e.g., 60 kg (packageCount * unitsPerPackage)
  unitCost: number; // e.g., R$ 4.00 (packageCost / unitsPerPackage)
  totalCost: number; // e.g., R$ 240.00
}

export const NewPurchaseModal: React.FC<NewPurchaseModalProps> = ({
  isOpen,
  onClose,
  preselectedProduct,
}) => {
  const { products, addProduct, createPurchase } = useApp();

  const [supplierName, setSupplierName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(getTodayDateString());
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseItemDraft[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick Inline Product Creator Form
  const [isCreatingNewProduct, setIsCreatingNewProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Alimentos');
  const [newProductUnit, setNewProductUnit] = useState<UnitType>('un');
  const [newProductPackageType, setNewProductPackageType] = useState<PackageType>('fardo');
  const [newProductUnitsPerPackage, setNewProductUnitsPerPackage] = useState<number>(20);
  const [newProductPackageCost, setNewProductPackageCost] = useState<number>(60);

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

      if (preselectedProduct) {
        const prod = products.find((p) => p.id === preselectedProduct.id);
        if (prod) {
          addItemFromProduct(prod);
          setNotes(`Reposição de insumo limitante: ${prod.name}`);
        }
      } else {
        setItems([]);
        setNotes('');
      }
    }
  }, [isOpen, preselectedProduct, products]);

  const addItemFromProduct = (prod: Product) => {
    setErrorMessage(null);
    const existing = items.find((i) => i.productId === prod.id);

    if (existing) {
      // Increase package count or units
      if (existing.mode === 'package') {
        updateItemDraft(prod.id, {
          packageCount: existing.packageCount + 1,
        });
      } else {
        updateItemDraft(prod.id, {
          quantity: existing.quantity + (prod.unitsPerPackage || 10),
        });
      }
    } else {
      const pkgType = prod.packageType || (prod.unit === 'kg' ? 'fardo' : 'caixa');
      const unitsPerPkg = prod.unitsPerPackage || 1;
      const pkgCost = prod.packageCost || Number((prod.unitCost * unitsPerPkg).toFixed(2));
      const initialPackageCount = 2; // Default 2 packages

      const newItem: PurchaseItemDraft = {
        productId: prod.id,
        productName: prod.name,
        unit: prod.unit || 'un',
        mode: 'package',
        packageType: pkgType,
        packageCount: initialPackageCount,
        unitsPerPackage: unitsPerPkg,
        packageCost: pkgCost,
        quantity: initialPackageCount * unitsPerPkg,
        unitCost: unitsPerPkg > 0 ? Number((pkgCost / unitsPerPkg).toFixed(4)) : prod.unitCost,
        totalCost: Number((initialPackageCount * pkgCost).toFixed(2)),
      };

      setItems((prev) => [...prev, newItem]);
    }

    setProductSearch('');
  };

  const updateItemDraft = (productId: string, patch: Partial<PurchaseItemDraft>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;

        const updated = { ...item, ...patch };

        if (updated.mode === 'package') {
          const pkgCount = Math.max(0.1, Number(updated.packageCount) || 1);
          const unitsPerPkg = Math.max(0.01, Number(updated.unitsPerPackage) || 1);
          const pkgCost = Math.max(0, Number(updated.packageCost) || 0);

          updated.packageCount = pkgCount;
          updated.unitsPerPackage = unitsPerPkg;
          updated.packageCost = pkgCost;
          updated.quantity = Number((pkgCount * unitsPerPkg).toFixed(2));
          updated.unitCost = Number((pkgCost / unitsPerPkg).toFixed(4));
          updated.totalCost = Number((pkgCount * pkgCost).toFixed(2));
        } else {
          const qty = Math.max(0.01, Number(updated.quantity) || 1);
          const uCost = Math.max(0, Number(updated.unitCost) || 0);

          updated.quantity = qty;
          updated.unitCost = uCost;
          updated.totalCost = Number((qty * uCost).toFixed(2));
          if (updated.unitsPerPackage > 0) {
            updated.packageCost = Number((uCost * updated.unitsPerPackage).toFixed(2));
            updated.packageCount = Number((qty / updated.unitsPerPackage).toFixed(2));
          }
        }

        return updated;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleQuickCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      setErrorMessage('Informe o nome do novo produto.');
      return;
    }

    const unitsPerPkg = Number(newProductUnitsPerPackage) || 1;
    const pkgCost = Number(newProductPackageCost) || 0;
    const derivedUnitCost = unitsPerPkg > 0 ? Number((pkgCost / unitsPerPkg).toFixed(4)) : 0;

    const created = await addProduct({
      name: newProductName.trim(),
      category: newProductCategory,
      unit: newProductUnit,
      packageType: newProductPackageType,
      unitsPerPackage: unitsPerPkg,
      packageCost: pkgCost,
      stock: 0,
      minStock: 20,
      unitCost: derivedUnitCost,
      refPrice: derivedUnitCost * 1.5,
      referencePrice: derivedUnitCost * 1.5,
      status: 'active',
    });

    addItemFromProduct(created);
    setNewProductName('');
    setIsCreatingNewProduct(false);
    setErrorMessage(null);
  };

  const totalAmount = items.reduce((acc, i) => acc + i.totalCost, 0);

  const handleSubmit = async (e: React.FormEvent) => {
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

    const finalPurchaseItems: PurchaseItem[] = items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity, // Quantidade de estoque adicionada
      unit: i.unit,
      packageCount: i.mode === 'package' ? i.packageCount : undefined,
      packageType: i.packageType,
      unitsPerPackage: i.unitsPerPackage,
      packageCost: i.packageCost,
      unitCost: i.unitCost, // Custo unitário de estoque atualizado
      totalCost: i.totalCost,
    }));

    await createPurchase({
      supplier: supplierName.trim(),
      supplierName: supplierName.trim(),
      date: purchaseDate,
      purchaseDate,
      items: finalPurchaseItems,
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
      subtitle="Compre em fardos/caixas no atacado ou unidades. O estoque e o custo unitário das cestas são atualizados automaticamente."
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
              Fornecedor / Distribuidor / Atacadista *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Distribuidora Central, Atacadão Alimentos, Cerealista..."
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

        {/* Forma de Pagamento e Observações */}
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
              Nº Nota Fiscal / Observações
            </label>
            <input
              type="text"
              placeholder="Ex: NF-e 84920, entrega no depósito..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>
        </div>

        {/* Lista de Itens da Compra */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Itens a Comprar ({items.length})
              </span>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold underline cursor-pointer"
                >
                  Limpar lista
                </button>
              )}
            </div>
            <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              Total da Compra: {formatCurrency(totalAmount)}
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                Nenhum produto adicionado. Selecione itens do catálogo abaixo para comprar em fardos ou unidades.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.productId}
                  className="p-3 hover:bg-slate-50 transition-colors space-y-2"
                >
                  {/* Item Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{item.productName}</span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        Un. Estoque: {item.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Mode Toggle (Fardo vs Granel) */}
                      <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-[11px]">
                        <button
                          type="button"
                          onClick={() => updateItemDraft(item.productId, { mode: 'package' })}
                          className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                            item.mode === 'package'
                              ? 'bg-white text-blue-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Embalagem ({item.packageType})
                        </button>
                        <button
                          type="button"
                          onClick={() => updateItemDraft(item.productId, { mode: 'unit' })}
                          className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                            item.mode === 'unit'
                              ? 'bg-white text-blue-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Unidade Direta ({item.unit})
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.productId)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remover produto da compra"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Inputs based on Mode */}
                  {item.mode === 'package' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">
                          Qtd de {item.packageType}s:
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={item.packageCount}
                          onChange={(e) =>
                            updateItemDraft(item.productId, {
                              packageCount: parseFloat(e.target.value) || 1,
                            })
                          }
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">
                          {item.unit} por {item.packageType}:
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.unitsPerPackage}
                          onChange={(e) =>
                            updateItemDraft(item.productId, {
                              unitsPerPackage: parseFloat(e.target.value) || 1,
                            })
                          }
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">
                          Custo por {item.packageType} (R$):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.packageCost}
                          onChange={(e) =>
                            updateItemDraft(item.productId, {
                              packageCost: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold text-blue-700"
                        />
                      </div>

                      <div className="flex flex-col justify-end">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">
                          Total do Item:
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {formatCurrency(item.totalCost)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">
                          Qtd a comprar ({item.unit}):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemDraft(item.productId, {
                              quantity: parseFloat(e.target.value) || 1,
                            })
                          }
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">
                          Custo Unitário (R$ / {item.unit}):
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={item.unitCost}
                          onChange={(e) =>
                            updateItemDraft(item.productId, {
                              unitCost: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold text-blue-700"
                        />
                      </div>

                      <div className="flex flex-col justify-end">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">
                          Total do Item:
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {formatCurrency(item.totalCost)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Impact Note on Stock & Cesta */}
                  <div className="flex items-center justify-between text-[11px] text-slate-600 px-1">
                    <span className="text-emerald-700 font-semibold">
                      ✓ Adicionará <strong>+{item.quantity} {item.unit}</strong> ao estoque
                    </span>
                    <span>
                      Novo custo unitário de estoque: <strong>{formatCurrency(item.unitCost)} / {item.unit}</strong>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Seletor do Catálogo de Produtos */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar produto para adicionar à compra..."
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
                <p className="text-xs font-bold text-blue-900">Cadastrar Novo Produto Rápido:</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Nome (Ex: Arroz)"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="sm:col-span-2 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs"
                  />
                  <select
                    value={newProductUnit}
                    onChange={(e) => setNewProductUnit(e.target.value as UnitType)}
                    className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-medium"
                  >
                    <option value="kg">kg (Quilograma)</option>
                    <option value="un">un (Unidade)</option>
                    <option value="pct">pct (Pacote)</option>
                    <option value="lt">lt (Litro)</option>
                  </select>
                  <select
                    value={newProductPackageType}
                    onChange={(e) => setNewProductPackageType(e.target.value as PackageType)}
                    className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-medium"
                  >
                    <option value="fardo">Fardo</option>
                    <option value="caixa">Caixa</option>
                    <option value="saco">Saco</option>
                    <option value="pacote">Pacote</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block">Qtd por Embalagem:</label>
                    <input
                      type="number"
                      value={newProductUnitsPerPackage}
                      onChange={(e) => setNewProductUnitsPerPackage(parseFloat(e.target.value) || 1)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block">Custo Embalagem (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProductPackageCost}
                      onChange={(e) => setNewProductPackageCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold text-blue-700"
                    />
                  </div>
                  <div className="flex items-end justify-end gap-2 sm:col-span-1">
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
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Chips de Produtos Cadastrados */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Clique para adicionar item à compra:
              </span>
              <div className="max-h-36 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 bg-white border border-slate-200 rounded-lg">
                {filteredCatalogProducts.map((prod) => {
                  const isAdded = items.some((i) => i.productId === prod.id);
                  const pkgType = prod.packageType || 'fardo';
                  const unitsPerPkg = prod.unitsPerPackage || 1;
                  const pkgCost = prod.packageCost || Number((prod.unitCost * unitsPerPkg).toFixed(2));

                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => addItemFromProduct(prod)}
                      className={`text-left p-1.5 rounded border text-xs flex flex-col justify-between transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-blue-50 border-blue-200 text-blue-900 font-semibold'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span className="truncate text-xs font-bold">{prod.name}</span>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
                        <span className="capitalize">{pkgType} ({unitsPerPkg} {prod.unit})</span>
                        <span className="text-blue-700 font-bold">{formatCurrency(pkgCost)}</span>
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
