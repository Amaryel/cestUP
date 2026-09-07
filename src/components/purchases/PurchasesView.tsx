import React, { useState } from 'react';
import {
  Truck,
  Search,
  PlusCircle,
  Calendar,
  DollarSign,
  Package,
  FileText,
  ChevronDown,
  ChevronUp,
  Tag,
  CreditCard,
  Building,
  Trash2,
} from 'lucide-react';
import { Purchase } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { NewPurchaseModal } from './NewPurchaseModal';

interface PurchasesViewProps {
  isNewPurchaseOpen?: boolean;
  onCloseNewPurchase?: () => void;
  onOpenNewPurchase?: (product?: any) => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  isNewPurchaseOpen = false,
  onCloseNewPurchase,
  onOpenNewPurchase,
}) => {
  const { purchases, deletePurchase } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);

  const isModalOpen = isNewPurchaseOpen || internalModalOpen;
  const handleCloseModal = () => {
    setInternalModalOpen(false);
    if (onCloseNewPurchase) onCloseNewPurchase();
  };

  const handleOpenModal = (product?: any) => {
    if (onOpenNewPurchase) {
      onOpenNewPurchase(product);
    } else {
      setInternalModalOpen(true);
    }
  };

  const confirmDelete = () => {
    if (purchaseToDelete) {
      deletePurchase(purchaseToDelete.id);
      setPurchaseToDelete(null);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    const term = searchTerm.toLowerCase();
    const supplier = (p.supplierName || p.supplier || '').toLowerCase();
    const notes = (p.notes || '').toLowerCase();
    const purchaseNum = (p.purchaseNumber || '').toLowerCase();
    const hasMatchingItem = p.items?.some((item) =>
      item.productName.toLowerCase().includes(term)
    );

    return supplier.includes(term) || notes.includes(term) || purchaseNum.includes(term) || hasMatchingItem;
  });

  const totalSpent = purchases.reduce(
    (acc, p) => acc + (p.totalAmount ?? p.totalCost ?? 0),
    0
  );

  const totalItemsPurchased = purchases.reduce(
    (acc, p) => acc + (p.items?.reduce((iAcc, item) => iAcc + item.quantity, 0) || 0),
    0
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Compras & Fornecedores
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-700">
              {purchases.length} compras
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Histórico de aquisição de insumos no atacado com atualização automática de estoque e custos de montagem.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold rounded-lg text-sm shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Registrar Compra</span>
        </button>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Investido em Compras
          </span>
          <span className="text-xl font-bold text-slate-900 mt-0.5 block">
            {formatCurrency(totalSpent)}
          </span>
          <span className="text-xs text-slate-500">Reposição de estoque</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total de Entradas / Lotes
          </span>
          <span className="text-xl font-bold text-emerald-600 mt-0.5 block">
            {purchases.length} lotes
          </span>
          <span className="text-xs text-slate-500">Registrados no sistema</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Média por Compra
          </span>
          <span className="text-xl font-bold text-blue-600 mt-0.5 block">
            {formatCurrency(purchases.length > 0 ? totalSpent / purchases.length : 0)}
          </span>
          <span className="text-xs text-slate-500">Valor médio por lote</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Volume de Unidades
          </span>
          <span className="text-xl font-bold text-purple-600 mt-0.5 block">
            {totalItemsPurchased} un.
          </span>
          <span className="text-xs text-slate-500">Insumos abastecidos</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por fornecedor, produto comprado, nota fiscal ou observação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>
      </div>

      {/* Purchases List */}
      {filteredPurchases.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400">
          <Truck className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-base font-bold text-slate-700">Nenhuma compra encontrada</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? 'Nenhum lote corresponde ao termo pesquisado.'
              : 'Registre compras de produtos para abastecer o estoque e atualizar os custos de montagem das cestas.'}
          </p>
          <button
            type="button"
            onClick={handleOpenModal}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Primeira Compra</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPurchases.map((purchase) => {
            const supplier = purchase.supplierName || purchase.supplier || 'Fornecedor';
            const date = purchase.purchaseDate || purchase.date || purchase.createdAt;
            const amount = purchase.totalAmount ?? purchase.totalCost ?? 0;
            const isExpanded = expandedPurchaseId === purchase.id;

            return (
              <div
                key={purchase.id}
                className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-bold rounded">
                        {purchase.purchaseNumber || 'CMP'}
                      </span>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-slate-400" />
                        <span>{supplier}</span>
                      </h3>
                      <span className="text-xs text-slate-500">
                        ({formatDate(date)})
                      </span>
                    </div>
                    {purchase.notes && (
                      <p className="text-xs text-slate-500 mt-1 italic">
                        📝 {purchase.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                      Total da Nota
                    </span>
                    <span className="text-base sm:text-lg font-bold text-slate-900">
                      {formatCurrency(amount)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      via {purchase.paymentMethod ? purchase.paymentMethod.toUpperCase() : 'PIX'}
                    </span>
                  </div>
                </div>

                {/* Items Purchased Preview */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Produtos Comprados ({purchase.items?.length || 0} itens):
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setExpandedPurchaseId(isExpanded ? null : purchase.id)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Recolher' : 'Ver todos'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPurchaseToDelete(purchase)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                        title="Excluir registro de compra"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>

                  <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-700 ${!isExpanded && (purchase.items?.length || 0) > 6 ? 'max-h-24 overflow-hidden relative' : ''}`}>
                    {purchase.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-1.5 bg-white border border-slate-200 rounded"
                      >
                        <span className="truncate max-w-[150px] font-medium text-slate-800">
                          {item.productName}
                        </span>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-slate-900">
                            {item.quantity} {item.unit || 'un'}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">
                            ({formatCurrency(item.unitCost)})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {purchaseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Excluir Registro de Compra?</h3>
                <p className="text-xs text-slate-500">
                  Lote {purchaseToDelete.purchaseNumber || 'CMP'} • {purchaseToDelete.supplierName || purchaseToDelete.supplier}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Tem certeza que deseja excluir esta compra no valor de{' '}
              <strong>{formatCurrency(purchaseToDelete.totalAmount ?? purchaseToDelete.totalCost ?? 0)}</strong>? O estoque adquirido será estornado.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPurchaseToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Internal New Purchase Modal when triggered from view */}
      {internalModalOpen && (
        <NewPurchaseModal isOpen={internalModalOpen} onClose={handleCloseModal} />
      )}
    </div>
  );
};
