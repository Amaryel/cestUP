import React, { useState } from 'react';
import {
  Package,
  Search,
  PlusCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  Filter,
  DollarSign,
  ArrowUpDown,
} from 'lucide-react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { ProductFormModal } from './ProductFormModal';

export const ProductsView: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const filteredProducts = products.filter((product) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term);

    if (!matchesSearch) return false;
    if (categoryFilter !== 'all' && product.category !== categoryFilter) return false;

    return true;
  });

  const handleSaveProduct = (data: Omit<Product, 'id' | 'createdAt'>) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, data);
      setEditingProduct(null);
    } else {
      addProduct(data);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o produto "${name}"?`)) {
      deleteProduct(id);
    }
  };

  const totalInventoryValue = products.reduce((acc, p) => acc + p.stock * p.unitCost, 0);
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Produtos & Itens das Cestas
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-700">
              {products.length} itens
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Cadastre os itens que compõem as cestas básicas com custos unitários e estoque mínimo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingProduct(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold rounded-lg text-sm shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Novo Produto</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total de Itens</span>
          <span className="text-xl font-bold text-slate-900 mt-0.5 block">{products.length}</span>
          <span className="text-xs text-slate-500">Produtos cadastrados</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Valor Total em Estoque</span>
          <span className="text-xl font-bold text-emerald-600 mt-0.5 block">
            {formatCurrency(totalInventoryValue)}
          </span>
          <span className="text-xs text-slate-500">A preço de custo atual</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Estoque Baixo</span>
          <span className={`text-xl font-bold mt-0.5 block ${lowStockCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {lowStockCount} produtos
          </span>
          <span className="text-xs text-slate-500">Abaixo do estoque mínimo</span>
        </div>
      </div>

      {/* Search & Category filter */}
      <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar produto por nome ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#2563eb] outline-none"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#2563eb]"
        >
          <option value="all">Todas as Categorias</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-3">Categoria</th>
                <th className="py-3 px-3">Embalagem Compra (Atacado)</th>
                <th className="py-3 px-3 text-right">Custo Estoque</th>
                <th className="py-3 px-3 text-center">Saldo Estoque</th>
                <th className="py-3 px-3 text-center">Mínimo</th>
                <th className="py-3 px-3 text-right">Valor em Estoque</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((prod) => {
                const isLow = prod.stock <= prod.minStock;
                const totalVal = prod.stock * prod.unitCost;
                const pkgType = prod.packageType || 'fardo';
                const unitsPerPkg = prod.unitsPerPackage || 1;
                const pkgCost = prod.packageCost || (prod.unitCost * unitsPerPkg);

                return (
                  <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{prod.name}</span>
                        {isLow && (
                          <span className="p-1 rounded bg-rose-100 text-rose-700" title="Estoque Baixo">
                            <AlertTriangle className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                        {prod.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      <div className="text-xs">
                        <span className="font-semibold capitalize">{pkgType}</span> ({unitsPerPkg} {prod.unit})
                        <span className="block text-[11px] text-slate-500 font-medium">{formatCurrency(pkgCost)} / {pkgType}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      <span>{formatCurrency(prod.unitCost)}</span>
                      <span className="text-[10px] text-slate-500 block">/ {prod.unit}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">
                      <span className={`px-2 py-0.5 rounded ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-slate-100'}`}>
                        {prod.stock} {prod.unit}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-500">
                      {prod.minStock} {prod.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-800">
                      {formatCurrency(totalVal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(prod);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(prod.id, prod.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        initialData={editingProduct}
      />
    </div>
  );
};
