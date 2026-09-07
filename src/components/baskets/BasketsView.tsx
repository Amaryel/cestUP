import React, { useState } from 'react';
import {
  Package,
  PlusCircle,
  Star,
  Edit2,
  Trash2,
  TrendingUp,
  ShoppingBag,
  Layers,
  Sparkles,
} from 'lucide-react';
import { BasketTemplate } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { BasketFormModal } from './BasketFormModal';

interface BasketsViewProps {
  onOpenNewSale: () => void;
}

export const BasketsView: React.FC<BasketsViewProps> = ({ onOpenNewSale }) => {
  const { basketTemplates, products, deleteBasketTemplate } = useApp();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BasketTemplate | null>(null);

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o modelo de cesta "${name}"?`)) {
      deleteBasketTemplate(id);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Modelos de Cestas Básicas
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-700">
              {basketTemplates.length} modelos
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure modelos padrão de cestas para agilizar o lançamento de vendas e personalizações.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingTemplate(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold rounded-lg text-sm shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Novo Modelo de Cesta</span>
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {basketTemplates.map((template) => {
          // Calculate dynamic cost based on actual products
          const totalCost = template.items.reduce((acc, item) => {
            const prod = products.find((p) => p.id === item.productId);
            const cost = prod ? prod.unitCost : item.unitCost;
            return acc + cost * item.quantity;
          }, 0);

          const profit = template.defaultSalePrice - totalCost;
          const margin =
            template.defaultSalePrice > 0 ? (profit / template.defaultSalePrice) * 100 : 0;
          const totalUnits = template.items.reduce((acc, i) => acc + i.quantity, 0);

          return (
            <div
              key={template.id}
              className={`bg-white rounded-lg border transition-colors p-4.5 flex flex-col justify-between ${
                template.isDefault ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900">
                        {template.name}
                      </h3>
                      {template.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          <Star className="w-3 h-3 fill-blue-600" />
                          <span>Padrão</span>
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplate(template);
                        setIsFormOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Editar Modelo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!template.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleDelete(template.id, template.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Financial Metric Strip */}
                <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-center border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Custo Médio
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-rose-600">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Venda Sugerida
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      {formatCurrency(template.defaultSalePrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Lucro Bruto
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-600">
                      {formatCurrency(profit)} ({margin.toFixed(0)}%)
                    </span>
                  </div>
                </div>

                {/* Items Composition Preview */}
                <div className="mt-3.5 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500 font-semibold">
                    <span>Composição ({template.items.length} produtos):</span>
                    <span>{totalUnits} unidades</span>
                  </div>

                  <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 bg-slate-50 rounded-lg p-2 text-xs text-slate-700 border border-slate-200">
                    {template.items.map((item, idx) => (
                      <div key={idx} className="py-1 flex items-center justify-between">
                        <span className="truncate max-w-[170px]">{item.productName}</span>
                        <span className="font-bold text-slate-900">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onOpenNewSale}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 bg-[#1e293b] hover:bg-[#0f172a] text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Vender com esta Cesta</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Basket Form Modal */}
      <BasketFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTemplate(null);
        }}
        initialData={editingTemplate}
      />
    </div>
  );
};
