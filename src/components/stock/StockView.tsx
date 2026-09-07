import React, { useState } from 'react';
import {
  Boxes,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Search,
  SlidersHorizontal,
  PackageCheck,
  History,
  CheckCircle2,
  Layers,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';
import { Product, StockMovement } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { StockAdjustmentModal } from './StockAdjustmentModal';

interface StockViewProps {
  onOpenNewPurchase?: (product?: any) => void;
}

export const StockView: React.FC<StockViewProps> = ({ onOpenNewPurchase }) => {
  const { products, stockMovements, calculateMaxBasketsPossible, getDefaultBasketTemplate } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'balance' | 'movements' | 'bottleneck'>('balance');
  const [selectedProductForAdjustment, setSelectedProductForAdjustment] = useState<Product | null>(null);

  const maxBasketsInfo = calculateMaxBasketsPossible();
  const defaultBasket = getDefaultBasketTemplate();

  const lowStockProducts = products.filter((p) => p.stock <= p.minStock && p.status === 'active');

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Controle de Estoque & Montagem de Cestas
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-700">
              {products.length} itens controlados
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitore saldos, identifique gargalos de montagem e controle entradas e saídas.
          </p>
        </div>

        {onOpenNewPurchase && (
          <button
            type="button"
            onClick={onOpenNewPurchase}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold rounded-lg text-sm shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Registrar Compra</span>
          </button>
        )}
      </div>

      {/* HIGHLIGHT: BOTTLE-NECK & MAX BASKETS POSSIBLE CALCULATOR */}
      <div className="bg-[#1e293b] p-5 rounded-lg text-white border border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base sm:text-lg">
              Capacidade de Montagem de Cestas Imediata
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Modelo base: <strong>{defaultBasket?.name || 'Cesta Padrão'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Max Baskets Count Display */}
          <div className="bg-[#0f172a] border border-slate-700/80 p-4 rounded-lg flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-2xl font-bold text-blue-400 shrink-0">
              {maxBasketsInfo.maxBaskets}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Cestas Prontas
              </span>
              <p className="text-sm font-bold text-white">
                {maxBasketsInfo.maxBaskets > 0
                  ? `${maxBasketsInfo.maxBaskets} cestas possíveis hoje!`
                  : 'Estoque insuficiente para 1 cesta.'}
              </p>
            </div>
          </div>

          {/* Bottleneck Item Display */}
          <div className="bg-[#0f172a] border border-slate-700/80 p-4 rounded-lg md:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Produto Limitante (Gargalo):</span>
            </span>

            {maxBasketsInfo.limitingProduct ? (
              <div className="mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-sm sm:text-base text-white">
                    {maxBasketsInfo.limitingProduct.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    Saldo disponível: <strong>{maxBasketsInfo.limitingProduct.currentStock}</strong> |
                    Necessário por cesta: <strong>{maxBasketsInfo.limitingProduct.requiredPerBasket}</strong>
                  </p>
                </div>
                {onOpenNewPurchase && (
                  <button
                    type="button"
                    onClick={() => {
                      const prod = products.find((p) => p.id === maxBasketsInfo.limitingProduct?.id) || maxBasketsInfo.limitingProduct;
                      onOpenNewPurchase(prod);
                    }}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg self-start sm:self-auto transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Repor Estoque ({maxBasketsInfo.limitingProduct.name})</span>
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-1">
                Cadastre a cesta padrão e produtos para calcular o gargalo.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('balance')}
          className={`pb-2 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'balance'
              ? 'border-[#2563eb] text-[#2563eb]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Saldos & Alertas ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bottleneck')}
          className={`pb-2 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'bottleneck'
              ? 'border-[#2563eb] text-[#2563eb]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Análise de Gargalo ({maxBasketsInfo.itemsBreakdown.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          className={`pb-2 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'movements'
              ? 'border-[#2563eb] text-[#2563eb]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Histórico de Movimentações ({stockMovements.length})
        </button>
      </div>

      {/* TAB 1: SALDOS DE ESTOQUE */}
      {activeTab === 'balance' && (
        <div className="space-y-4">
          {/* Low Stock Warning Banner if any */}
          {lowStockProducts.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-rose-900">
                  {lowStockProducts.length} produtos abaixo do estoque mínimo de segurança!
                </h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  Itens em risco:{' '}
                  <strong>{lowStockProducts.map((p) => `${p.name} (${p.stock})`).join(', ')}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>
          </div>

          {/* Products Grid / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.map((prod) => {
              const isLow = prod.stock <= prod.minStock;
              return (
                <div
                  key={prod.id}
                  className={`bg-white p-4 rounded-lg border flex flex-col justify-between transition-colors ${
                    isLow ? 'border-rose-300 bg-rose-50/10' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{prod.name}</h4>
                        <span className="text-[11px] text-slate-500">{prod.category}</span>
                      </div>
                      {isLow && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-700">
                          Estoque Baixo
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Saldo Atual
                        </span>
                        <span
                          className={`text-base font-bold ${
                            isLow ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {prod.stock} {prod.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Mínimo Recomendado
                        </span>
                        <span className="text-base font-semibold text-slate-600">
                          {prod.minStock} {prod.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      Custo: {formatCurrency(prod.unitCost)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {onOpenNewPurchase && (
                        <button
                          type="button"
                          onClick={() => onOpenNewPurchase(prod)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Repor</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedProductForAdjustment(prod)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Ajustar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ANÁLISE DE GARGALO DETALHADA */}
      {activeTab === 'bottleneck' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden p-5 space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Detalhamento de Capacidade por Item da Cesta
            </h3>
            <p className="text-xs text-slate-500">
              Mostra quantas cestas cada produto específico em estoque suporta individualmente. O menor valor define o limite total.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Produto da Cesta</th>
                  <th className="py-2.5 px-3 text-center">Por Cesta</th>
                  <th className="py-2.5 px-3 text-center">Em Estoque</th>
                  <th className="py-2.5 px-3 text-center">Cestas Possíveis</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {maxBasketsInfo.itemsBreakdown.map((item, idx) => {
                  const isLimiter = item.possibleBaskets === maxBasketsInfo.maxBaskets;
                  const matchingProd = products.find((p) => p.id === item.productId);
                  return (
                    <tr
                      key={idx}
                      className={isLimiter ? 'bg-amber-50/60 font-semibold' : 'hover:bg-slate-50'}
                    >
                      <td className="py-2.5 px-3 text-slate-900">{item.productName}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">
                        {item.requiredPerBasket} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-bold ${
                            isLimiter
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {item.possibleBaskets} cestas
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isLimiter ? (
                          <span className="text-[11px] font-bold text-amber-800 uppercase">
                            ⚠️ Gargalo Principal
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-700">
                            ✓ Suficiente
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {onOpenNewPurchase && (
                          <button
                            type="button"
                            onClick={() => onOpenNewPurchase(matchingProd || item)}
                            className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                              isLimiter
                                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                                : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                            }`}
                          >
                            + Repor
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: HISTÓRICO DE MOVIMENTAÇÕES */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900">
              Registro Completo de Entradas, Saídas e Ajustes
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3">Tipo de Movimento</th>
                  <th className="py-2.5 px-3 text-center">Quantidade</th>
                  <th className="py-2.5 px-3">Justificativa / Documento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockMovements.map((mov) => {
                  const isEntry = mov.type.startsWith('in_');
                  return (
                    <tr key={mov.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {formatDateTime(mov.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{mov.productName}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isEntry ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {mov.type === 'in_purchase' && 'Compra de Fornecedor'}
                          {mov.type === 'out_sale' && 'Saída para Venda de Cesta'}
                          {mov.type === 'in_adjustment' && 'Ajuste de Entrada'}
                          {mov.type === 'out_adjustment' && 'Ajuste de Saída'}
                          {mov.type === 'out_loss' && 'Perda / Avaria'}
                          {mov.type === 'in_return' && 'Devolução de Cliente'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        <span className={isEntry ? 'text-emerald-700' : 'text-rose-700'}>
                          {isEntry ? '+' : '-'}
                          {mov.quantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 truncate max-w-xs">{mov.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={!!selectedProductForAdjustment}
        onClose={() => setSelectedProductForAdjustment(null)}
        product={selectedProductForAdjustment}
      />
    </div>
  );
};
