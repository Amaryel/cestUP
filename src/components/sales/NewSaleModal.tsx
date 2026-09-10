import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Calendar,
  CreditCard,
  DollarSign,
  User,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Search,
  Sparkles,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Customer, Product, BasketTemplate, SaleItem, PaymentPlanType } from '../../types';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import {
  formatCurrency,
  formatDate,
  getTodayDateString,
  addDaysToDate,
} from '../../utils/formatters';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCustomer?: Customer | null;
  onSaleCreated: (saleId: string) => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  preselectedCustomer,
  onSaleCreated,
}) => {
  const {
    customers,
    products,
    basketTemplates,
    createSale,
    settings,
    getDefaultBasketTemplate,
  } = useApp();

  // Wizard or Form Steps
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    preselectedCustomer?.id || ''
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customBasketName, setCustomBasketName] = useState<string>('Cesta Básica Familiar');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [salePrice, setSalePrice] = useState<number>(settings.defaultBasketPrice || 340.00);
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlanType>('installments_2');
  const [saleDate, setSaleDate] = useState<string>(getTodayDateString());
  const [notes, setNotes] = useState<string>('');

  // Search product inside basket builder
  const [productSearch, setProductSearch] = useState<string>('');

  // Custom installments state
  const [customInstallments, setCustomInstallments] = useState<
    { dueDate: string; amount: number }[]
  >([]);

  // Initialize form when opening
  useEffect(() => {
    if (isOpen) {
      if (preselectedCustomer) {
        setSelectedCustomerId(preselectedCustomer.id);
      } else if (customers.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(customers[0].id);
      }

      const defaultTemplate = getDefaultBasketTemplate();
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
        setCustomBasketName(defaultTemplate.name);
        setSalePrice(defaultTemplate.defaultSalePrice || 340.00);

        // Populate items with snapshots
        const initialItems: SaleItem[] = defaultTemplate.items.map((tItem) => {
          const actualProd = products.find((p) => p.id === tItem.productId);
          const unitCost = actualProd ? actualProd.unitCost : tItem.unitCost;
          return {
            productId: tItem.productId,
            productName: tItem.productName,
            quantity: tItem.quantity,
            unit: tItem.unit,
            unitCost,
            totalCost: unitCost * tItem.quantity,
          };
        });
        setSaleItems(initialItems);
      }
      setSaleDate(getTodayDateString());
    }
  }, [isOpen, preselectedCustomer]);

  // When template changes
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setCustomBasketName('Cesta Personalizada');
      setSaleItems([]);
      setSalePrice(0);
      return;
    }
    const tpl = basketTemplates.find((t) => t.id === templateId);
    if (tpl) {
      setCustomBasketName(tpl.name);
      setSalePrice(tpl.defaultSalePrice || 340.00);

      const items: SaleItem[] = tpl.items.map((tItem) => {
        const prod = products.find((p) => p.id === tItem.productId);
        const unitCost = prod ? prod.unitCost : tItem.unitCost;
        return {
          productId: tItem.productId,
          productName: tItem.productName,
          quantity: tItem.quantity,
          unit: tItem.unit,
          unitCost,
          totalCost: unitCost * tItem.quantity,
        };
      });
      setSaleItems(items);
    }
  };

  // Recalculate total cost in real-time
  const totalCost = useMemo(() => {
    return saleItems.reduce((acc, item) => acc + item.totalCost, 0);
  }, [saleItems]);

  const profit = salePrice - totalCost;
  const profitMargin = salePrice > 0 ? (profit / salePrice) * 100 : 0;

  // Auto-generate installments based on paymentPlan and salePrice
  useEffect(() => {
    const today = saleDate || getTodayDateString();

    if (paymentPlan === 'cash') {
      setCustomInstallments([
        {
          dueDate: today,
          amount: salePrice,
        },
      ]);
    } else if (paymentPlan === 'installments_1') {
      setCustomInstallments([
        {
          dueDate: addDaysToDate(today, 30),
          amount: salePrice,
        },
      ]);
    } else if (paymentPlan === 'installments_2') {
      const half = Math.round((salePrice / 2) * 100) / 100;
      const secondHalf = Math.round((salePrice - half) * 100) / 100;
      setCustomInstallments([
        {
          dueDate: addDaysToDate(today, 30),
          amount: half,
        },
        {
          dueDate: addDaysToDate(today, 60),
          amount: secondHalf,
        },
      ]);
    }
  }, [paymentPlan, salePrice, saleDate]);

  // Item modification handlers
  const handleUpdateQuantity = (productId: string, delta: number) => {
    setSaleItems((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = Math.max(0, item.quantity + delta);
            return {
              ...item,
              quantity: newQty,
              totalCost: newQty * item.unitCost,
            };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (productId: string) => {
    setSaleItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleAddProductToBasket = (product: Product) => {
    const existingIndex = saleItems.findIndex((i) => i.productId === product.id);
    if (existingIndex >= 0) {
      handleUpdateQuantity(product.id, 1);
    } else {
      const newItem: SaleItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unit: product.unit,
        unitCost: product.unitCost,
        totalCost: product.unitCost,
      };
      setSaleItems((prev) => [...prev, newItem]);
    }
  };

  const handleInstallmentDateChange = (index: number, newDate: string) => {
    setCustomInstallments((prev) =>
      prev.map((inst, idx) => (idx === index ? { ...inst, dueDate: newDate } : inst))
    );
  };

  const handleInstallmentAmountChange = (index: number, newAmount: number) => {
    setCustomInstallments((prev) =>
      prev.map((inst, idx) => (idx === index ? { ...inst, amount: newAmount } : inst))
    );
  };

  const handleAddCustomInstallment = () => {
    const lastDate =
      customInstallments.length > 0
        ? customInstallments[customInstallments.length - 1].dueDate
        : saleDate;
    setCustomInstallments((prev) => [
      ...prev,
      {
        dueDate: addDaysToDate(lastDate, 30),
        amount: 0,
      },
    ]);
  };

  const handleRemoveCustomInstallment = (index: number) => {
    if (customInstallments.length <= 1) return;
    setCustomInstallments((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Submit and Complete Sale
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      alert('Por favor, selecione o cliente para esta venda.');
      return;
    }

    if (saleItems.length === 0) {
      alert('A cesta precisa conter pelo menos 1 produto.');
      return;
    }

    if (salePrice <= 0) {
      alert('O valor da venda deve ser maior que zero.');
      return;
    }

    // Check custom installments total
    const installmentsTotal = customInstallments.reduce((acc, i) => acc + i.amount, 0);
    const diff = Math.abs(installmentsTotal - salePrice);
    if (diff > 0.05) {
      if (
        !window.confirm(
          `A soma das parcelas (${formatCurrency(
            installmentsTotal
          )}) é diferente do valor da venda (${formatCurrency(
            salePrice
          )}). Deseja continuar mesmo assim?`
        )
      ) {
        return;
      }
    }

    const created = await createSale({
      customerId: selectedCustomerId,
      basketTemplateId: selectedTemplateId || undefined,
      basketName: customBasketName.trim() || 'Cesta Personalizada',
      items: saleItems,
      totalCost,
      totalSaleValue: salePrice,
      paymentPlan,
      installments: customInstallments,
      notes: notes.trim() || undefined,
    });

    // Fire celebratory confetti!
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore if unavailable
    }

    onClose();
    onSaleCreated(created.id);
  };

  // Filter available products to add
  const availableProductsToAdd = products.filter((p) => {
    if (p.status !== 'active') return false;
    if (!productSearch) return true;
    return p.name.toLowerCase().includes(productSearch.toLowerCase());
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Venda de Cesta Básica"
      subtitle="Monte a cesta personalizada, confira o custo de montagem e parcele a cobrança"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: CLIENTE E CESTA BASE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          {/* Selecionar Cliente */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              1. Cliente *
            </label>
            <select
              required
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="" disabled>
                Selecione o cliente...
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.status === 'inactive' ? '(Inativo)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Selecionar Modelo de Cesta Base */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              2. Modelo de Cesta Inicial
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="">Personalizada do Zero</option>
              {basketTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Padrão: {formatCurrency(t.defaultSalePrice)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* STEP 2: PERSONALIZAÇÃO DA COMPOSIÇÃO DOS PRODUTOS */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>3. Composição Personalizada dos Produtos</span>
              </h3>
              <p className="text-xs text-slate-500">
                Altere quantidades ou adicione novos itens. A alteração vale apenas para esta venda!
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {saleItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSaleItems([])}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline cursor-pointer mr-2"
                >
                  Limpar todos os itens
                </button>
              )}
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                Total: {saleItems.reduce((acc, i) => acc + i.quantity, 0)} unidades
              </span>
            </div>
          </div>

          {/* Current Items List in Basket */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
              {saleItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhum produto adicionado. Escolha um produto abaixo para compor a cesta.
                </div>
              ) : (
                saleItems.map((item) => {
                  const actualProd = products.find((p) => p.id === item.productId);
                  const isStockLow = actualProd ? actualProd.stock < item.quantity : false;

                  return (
                    <div
                      key={item.productId}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {item.productName}
                          </span>
                          {isStockLow && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              Estoque ({actualProd?.stock})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Custo unitário: {formatCurrency(item.unitCost)} • Total custo:{' '}
                          <strong className="text-slate-700">{formatCurrency(item.totalCost)}</strong>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.productId, -1)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs font-bold text-slate-900">
                            {item.quantity} {item.unit}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.productId, 1)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.productId)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remover produto da cesta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Add Product Dropdown / Search */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2 items-center">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar produto para adicionar à cesta..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {productSearch && (
                <div className="w-full max-h-36 overflow-y-auto bg-white border border-slate-200 rounded-xl p-1 shadow-md space-y-1">
                  {availableProductsToAdd.slice(0, 5).map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => {
                        handleAddProductToBasket(prod);
                        setProductSearch('');
                      }}
                      className="w-full text-left p-2 hover:bg-emerald-50 rounded-lg text-xs flex items-center justify-between transition-colors"
                    >
                      <span className="font-semibold text-slate-900">{prod.name}</span>
                      <span className="text-emerald-700 font-bold">
                        +{formatCurrency(prod.unitCost)} (Adicionar)
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STEP 3: CÁLCULO DE CUSTO, VALOR DA VENDA E LUCRATIVIDADE AO VIVO */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-5 rounded-2xl text-white shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm sm:text-base">
                4. Custo Real & Lucratividade da Venda
              </h3>
            </div>
            <span className="text-xs text-slate-400">Cálculo em tempo real</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Custo Total dos Produtos */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                Custo de Montagem
              </span>
              <span className="text-base sm:text-xl font-black text-rose-300 mt-1 block">
                {formatCurrency(totalCost)}
              </span>
              <span className="text-[10px] text-slate-400">Soma dos itens utilizados</span>
            </div>

            {/* Valor da Venda */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <label className="text-[11px] text-slate-400 uppercase font-semibold block">
                Valor Cobrado (R$)
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={salePrice}
                  onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1 text-base sm:text-lg font-black text-emerald-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-400">Padrão: R$ 340,00</span>
            </div>

            {/* Lucro Bruto Estimado */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                Lucro Bruto
              </span>
              <span
                className={`text-base sm:text-xl font-black mt-1 block ${
                  profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(profit)}
              </span>
              <span className="text-[10px] text-slate-400">Venda menos Custo</span>
            </div>

            {/* Margem de Lucro % */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                Margem de Lucro
              </span>
              <span className="text-base sm:text-xl font-black text-teal-300 mt-1 block">
                {profitMargin.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400">Meta média: ~50%</span>
            </div>
          </div>
        </div>

        {/* STEP 4: FORMA DE PAGAMENTO E PARCELAMENTO */}
        <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>5. Forma de Pagamento & Parcelas</span>
            </h3>
            <p className="text-xs text-slate-500">
              Escolha a modalidade. As parcelas serão geradas automaticamente no Contas a Receber.
            </p>
          </div>

          {/* Payment Plan Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setPaymentPlan('cash')}
              className={`p-3 rounded-xl border text-left transition-all ${
                paymentPlan === 'cash'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 font-semibold'
              }`}
            >
              <div className="text-xs uppercase">À Vista</div>
              <div className="text-sm sm:text-base font-black mt-1">1x {formatCurrency(salePrice)}</div>
              <div className="text-[10px] opacity-80">Na data da entrega</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentPlan('installments_1')}
              className={`p-3 rounded-xl border text-left transition-all ${
                paymentPlan === 'installments_1'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 font-semibold'
              }`}
            >
              <div className="text-xs uppercase">1 Parcela</div>
              <div className="text-sm sm:text-base font-black mt-1">1x {formatCurrency(salePrice)}</div>
              <div className="text-[10px] opacity-80">Vencimento em 30 dias</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentPlan('installments_2')}
              className={`p-3 rounded-xl border text-left transition-all ${
                paymentPlan === 'installments_2'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 font-semibold'
              }`}
            >
              <div className="text-xs uppercase">2 Parcelas (Padrão)</div>
              <div className="text-sm sm:text-base font-black mt-1">
                2x {formatCurrency(salePrice / 2)}
              </div>
              <div className="text-[10px] opacity-80">30 e 60 dias (R$ 170 + R$ 170)</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentPlan('custom')}
              className={`p-3 rounded-xl border text-left transition-all ${
                paymentPlan === 'custom'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 font-semibold'
              }`}
            >
              <div className="text-xs uppercase">Personalizado</div>
              <div className="text-sm sm:text-base font-black mt-1">Flexível</div>
              <div className="text-[10px] opacity-80">Defina datas e valores</div>
            </button>
          </div>

          {/* Detailed Installments Table / Inputs */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Parcelas a serem agendadas:</span>
              {paymentPlan === 'custom' && (
                <button
                  type="button"
                  onClick={handleAddCustomInstallment}
                  className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Parcela</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {customInstallments.map((inst, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Parcela {idx + 1} de {customInstallments.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-slate-500 font-medium">Vencimento:</label>
                      <input
                        type="date"
                        required
                        value={inst.dueDate}
                        onChange={(e) => handleInstallmentDateChange(idx, e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-slate-500 font-medium">Valor:</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={inst.amount}
                        onChange={(e) =>
                          handleInstallmentAmountChange(idx, parseFloat(e.target.value) || 0)
                        }
                        className="w-24 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    {paymentPlan === 'custom' && customInstallments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomInstallment(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Remover Parcela"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* STEP 5: OBSERVAÇÕES & DATA DA VENDA */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Data da Venda / Entrega
            </label>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Observações da Venda
            </label>
            <input
              type="text"
              placeholder="Ex: Entregar após as 14h, deixar na portaria..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Actions Submit */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm sm:text-base rounded-xl shadow-lg shadow-emerald-600/30 transition-all active:scale-98"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Confirmar Venda ({formatCurrency(salePrice)})</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
