import React, { useState } from 'react';
import {
  Users,
  Search,
  PlusCircle,
  Phone,
  MapPin,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  Filter,
  ArrowUpRight,
  MoreVertical,
  Edit2,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import { Customer } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatPhone, formatDocument, formatDate } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerDetailModal } from './CustomerDetailModal';

interface CustomersViewProps {
  onOpenNewSaleForCustomer: (customer: Customer) => void;
  onSelectSale: (saleId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  onOpenNewSaleForCustomer,
  onSelectSale,
}) => {
  const {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerStats,
    selectedCustomerId,
    setSelectedCustomerId,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'overdue'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  // If a customer was selected from another tab
  React.useEffect(() => {
    if (selectedCustomerId) {
      const found = customers.find((c) => c.id === selectedCustomerId);
      if (found) {
        setDetailCustomer(found);
      }
      setSelectedCustomerId(null);
    }
  }, [selectedCustomerId, customers, setSelectedCustomerId]);

  const filteredCustomers = customers.filter((customer) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      customer.name.toLowerCase().includes(term) ||
      (customer.document && customer.document.toLowerCase().includes(term)) ||
      (customer.phone && customer.phone.includes(term)) ||
      (customer.address && customer.address.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return customer.status === 'active';
    if (statusFilter === 'inactive') return customer.status === 'inactive';
    if (statusFilter === 'overdue') {
      const stats = getCustomerStats(customer.id);
      return stats.hasOverdue;
    }

    return true;
  });

  const handleSaveCustomer = (data: Omit<Customer, 'id' | 'createdAt'>) => {
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, data);
      setEditingCustomer(null);
    } else {
      const newCust = addCustomer(data);
      setDetailCustomer(newCust);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${name}"?`)) {
      deleteCustomer(id);
      if (detailCustomer?.id === id) setDetailCustomer(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Gestão de Clientes
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-700">
              {customers.length} cadastrados
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Cadastre clientes, controle histórico de compras de cestas básicas, pagamentos e cobranças WhatsApp.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingCustomer(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold rounded-lg text-sm shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Novo Cliente</span>
        </button>
      </div>

      {/* Search and Filters Strip */}
      <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar cliente por nome, CPF, telefone ou endereço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#2563eb] outline-none transition-colors"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#1e293b] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-[#2563eb] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Ativos
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('overdue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'overdue'
                ? 'bg-rose-600 text-white'
                : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
            }`}
          >
            Inadimplentes
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-[#1e293b] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Inativos
          </button>
        </div>
      </div>

      {/* Customer Cards Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-base font-bold text-slate-700">Nenhum cliente encontrado</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm
              ? 'Tente buscar com outro termo ou limpar os filtros.'
              : 'Clique em "Novo Cliente" para começar seus cadastros.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const stats = getCustomerStats(customer.id);
            return (
              <div
                key={customer.id}
                onClick={() => setDetailCustomer(customer)}
                className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 transition-colors p-4 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-[#2563eb] transition-colors">
                          {customer.name}
                        </h3>
                        <StatusBadge status={customer.status} />
                      </div>
                      {customer.document && (
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {formatDocument(customer.document)}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCustomer(customer);
                        setIsFormOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Editar Cliente"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Contact & Address */}
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{formatPhone(customer.phone || customer.whatsapp)}</span>
                    </p>
                    {customer.address && (
                      <p className="flex items-center gap-1.5 truncate text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{customer.address}</span>
                      </p>
                    )}
                  </div>

                  {/* Financial Stats Ribbon */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Total Comprado
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(stats.totalPurchased)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        ({stats.basketsCount} cestas)
                      </span>
                    </div>

                    <div
                      className={`p-2 rounded-lg border ${
                        stats.hasOverdue
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : stats.totalPending > 0
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider block">
                        {stats.hasOverdue ? 'Vencido!' : 'Em Aberto'}
                      </span>
                      <span className="font-bold">
                        {formatCurrency(stats.hasOverdue ? stats.totalOverdue : stats.totalPending)}
                      </span>
                      <span className="text-[10px] block">
                        {stats.hasOverdue ? 'Cobrança pendente' : 'Parcelas em dia'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#2563eb] flex items-center gap-1">
                    <span>Ver histórico</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onOpenNewSaleForCustomer(customer)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Vender</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(customer.id, customer.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Form Modal */}
      <CustomerFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCustomer(null);
        }}
        onSave={handleSaveCustomer}
        initialData={editingCustomer}
      />

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        isOpen={!!detailCustomer}
        onClose={() => setDetailCustomer(null)}
        customer={detailCustomer}
        onEditCustomer={(cust) => {
          setEditingCustomer(cust);
          setIsFormOpen(true);
        }}
        onOpenNewSaleForCustomer={onOpenNewSaleForCustomer}
        onSelectSale={onSelectSale}
      />
    </div>
  );
};
