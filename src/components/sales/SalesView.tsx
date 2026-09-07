import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  PlusCircle,
  Filter,
  DollarSign,
  TrendingUp,
  Package,
  Calendar,
  Eye,
  FileText,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Sale } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { SaleDetailModal } from './SaleDetailModal';
import { SaleReceiptModal } from './SaleReceiptModal';

interface SalesViewProps {
  onOpenNewSale: () => void;
  selectedSaleId?: string | null;
  onClearSelectedSale?: () => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  onOpenNewSale,
  selectedSaleId,
  onClearSelectedSale,
}) => {
  const { sales } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);

  // If a sale was opened from outside
  React.useEffect(() => {
    if (selectedSaleId) {
      const found = sales.find((s) => s.id === selectedSaleId);
      if (found) {
        setDetailSale(found);
      }
      if (onClearSelectedSale) onClearSelectedSale();
    }
  }, [selectedSaleId, sales, onClearSelectedSale]);

  const filteredSales = sales.filter((sale) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      sale.customerName.toLowerCase().includes(term) ||
      sale.saleNumber.toLowerCase().includes(term) ||
      sale.basketName.toLowerCase().includes(term);

    if (!matchesSearch) return false;
    if (planFilter !== 'all' && sale.paymentPlan !== planFilter) return false;

    return true;
  });

  const totalSold = filteredSales.reduce((acc, s) => acc + (s.status === 'completed' ? s.totalSaleValue : 0), 0);
  const totalCost = filteredSales.reduce((acc, s) => acc + (s.status === 'completed' ? s.totalCost : 0), 0);
  const totalProfit = totalSold - totalCost;
  const avgMargin = totalSold > 0 ? (totalProfit / totalSold) * 100 : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Histórico de Vendas de Cestas
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-700">
              {sales.length} vendas
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Registro de todas as cestas vendidas com composições congeladas, lucro e parcelas.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewSale}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold rounded-lg text-sm shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Nova Venda</span>
        </button>
      </div>

      {/* Financial Overview Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-5 rounded-lg border border-slate-200">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Vendido</span>
          <span className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 block">
            {formatCurrency(totalSold)}
          </span>
          <span className="text-xs text-slate-500">{filteredSales.length} pedidos</span>
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Custo de Produtos</span>
          <span className="text-lg sm:text-xl font-bold text-rose-600 mt-0.5 block">
            {formatCurrency(totalCost)}
          </span>
          <span className="text-xs text-slate-500">Montagem das cestas</span>
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Lucro Bruto Real</span>
          <span className="text-lg sm:text-xl font-bold text-emerald-600 mt-0.5 block">
            {formatCurrency(totalProfit)}
          </span>
          <span className="text-xs text-emerald-700 font-semibold">
            Margem: {avgMargin.toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Ticket Médio</span>
          <span className="text-lg sm:text-xl font-bold text-blue-600 mt-0.5 block">
            {formatCurrency(filteredSales.length > 0 ? totalSold / filteredSales.length : 0)}
          </span>
          <span className="text-xs text-slate-500">Por cesta vendida</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, número do pedido (VND-1001) ou cesta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#2563eb] outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-[#2563eb] outline-none"
          >
            <option value="all">Todas as Formas de Pgto</option>
            <option value="cash">À Vista</option>
            <option value="installments_1">1 Parcela</option>
            <option value="installments_2">2 Parcelas (Padrão)</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>
      </div>

      {/* Sales List */}
      {filteredSales.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400">
          <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-base font-bold text-slate-700">Nenhuma venda encontrada</p>
          <p className="text-xs text-slate-400 mt-1">
            Clique em "Nova Venda" para registrar o primeiro pedido de cesta.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSales.map((sale) => (
            <div
              key={sale.id}
              onClick={() => setDetailSale(sale)}
              className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 transition-colors p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              {/* Left Info */}
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {sale.saleNumber}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-[#2563eb] transition-colors">
                    {sale.customerName}
                  </h3>
                  <StatusBadge status={sale.status} />
                </div>

                <p className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-800">{sale.basketName}</span>
                  <span>•</span>
                  <span>{sale.items.length} itens</span>
                  <span>•</span>
                  <span>{formatDate(sale.createdAt)}</span>
                  <span>•</span>
                  <span className="text-slate-500 font-medium">
                    {sale.paymentPlan === 'cash' ? 'À Vista' : `${sale.installmentsCount} parcelas`}
                  </span>
                </p>
              </div>

              {/* Financial Snapshot & Actions */}
              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                <div className="text-left sm:text-right">
                  <div className="font-bold text-base sm:text-lg text-slate-900">
                    {formatCurrency(sale.totalSaleValue)}
                  </div>
                  <div className="text-xs font-semibold text-emerald-600">
                    Lucro: {formatCurrency(sale.profit)} ({sale.profitMarginPct.toFixed(0)}%)
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setReceiptSale(sale)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="Emitir Comprovante"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailSale(sale)}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors cursor-pointer"
                    title="Ver Detalhes"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sale Detail Modal */}
      <SaleDetailModal
        isOpen={!!detailSale}
        onClose={() => setDetailSale(null)}
        sale={detailSale}
        onOpenReceipt={(s) => setReceiptSale(s)}
      />

      {/* Sale Receipt Modal */}
      <SaleReceiptModal
        isOpen={!!receiptSale}
        onClose={() => setReceiptSale(null)}
        sale={receiptSale}
      />
    </div>
  );
};
