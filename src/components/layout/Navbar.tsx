import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Package,
  Boxes,
  Truck,
  CreditCard,
  BarChart3,
  Settings,
  PlusCircle,
  Menu,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface NavProps {
  onOpenNewSale: () => void;
  onOpenMobileMenu?: () => void;
}

export const Sidebar: React.FC<NavProps> = ({ onOpenNewSale }) => {
  const { activeTab, setActiveTab, summaryMetrics, settings } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vendas', label: 'Vendas', icon: ShoppingBag },
    {
      id: 'cobrancas',
      label: 'Cobranças',
      icon: CreditCard,
      badge: summaryMetrics.overdueList.length + summaryMetrics.dueTodayList.length,
      badgeColor: summaryMetrics.overdueList.length > 0 ? 'bg-red-500' : 'bg-amber-500',
    },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'cestas', label: 'Cestas / Modelos', icon: Package },
    { id: 'produtos', label: 'Produtos', icon: Boxes },
    {
      id: 'estoque',
      label: 'Estoque',
      icon: Boxes,
      badge: summaryMetrics.lowStockProducts.length,
      badgeColor: 'bg-amber-500',
    },
    { id: 'compras', label: 'Compras', icon: Truck },
    { id: 'relatorios', label: 'Relatórios / DRE', icon: BarChart3 },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Aside Sidebar (Clean Utility / Minimal) */}
      <aside className="hidden lg:flex w-64 bg-[#1e293b] text-white flex-col shrink-0 border-r border-[#334155] select-none">
        {/* Brand Header */}
        <div
          onClick={() => setActiveTab('dashboard')}
          className="p-6 border-b border-[#334155] cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center text-white font-black text-xs shadow-xs tracking-wider">
              CUP
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">
                CestUP
              </h1>
              <p className="text-[10px] text-[#94a3b8] uppercase tracking-widest mt-0.5">
                SaaS Gestão
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#334155] text-white'
                    : 'text-[#94a3b8] hover:bg-[#334155]/60 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[#38bdf8]' : 'text-[#94a3b8] opacity-80'
                    }`}
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-white ${
                      item.badgeColor || 'bg-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-[#334155]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-[#475569] flex items-center justify-center text-xs font-bold text-white">
                AD
              </div>
              <div className="text-xs">
                <p className="font-semibold text-white">
                  {settings.businessName || 'Admin Pedro'}
                </p>
                <p className="text-[#94a3b8] text-[11px]">Sistema Ativo</p>
              </div>
            </div>
            <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded text-[9px] font-bold uppercase">
              PRO
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-[#1e293b] text-white shadow-2xl p-5 flex flex-col justify-between z-50 animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#334155]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center text-white font-black text-xs">
                    CUP
                  </div>
                  <div>
                    <h1 className="font-bold text-white text-base leading-tight">CestUP</h1>
                    <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider">SaaS Gestão</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-[#94a3b8] hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#334155] text-white'
                          : 'text-[#94a3b8] hover:bg-[#334155]/60 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-4 h-4 text-[#94a3b8]" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && item.badge > 0 ? (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase text-white ${
                            item.badgeColor || 'bg-slate-600'
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-[#334155]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenNewSale();
                }}
                className="w-full py-2.5 px-4 bg-[#2563eb] text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-xs hover:bg-[#1d4ed8]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Nova Venda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Quick Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1e293b] text-white border-t border-[#334155] py-1 px-3 flex items-center justify-around shadow-lg">
        {[
          { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
          { id: 'vendas', label: 'Vendas', icon: ShoppingBag },
          {
            id: 'cobrancas',
            label: 'Cobranças',
            icon: CreditCard,
            badge: summaryMetrics.overdueList.length,
          },
          { id: 'clientes', label: 'Clientes', icon: Users },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center py-1.5 px-3 rounded-lg relative transition-colors ${
                isActive ? 'text-[#38bdf8] font-semibold' : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#1e293b]" />
              ) : null}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center py-1.5 px-3 rounded-lg text-[#94a3b8] hover:text-white transition-colors"
        >
          <Menu className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Menu</span>
        </button>
      </div>
    </>
  );
};

export const TopHeader: React.FC<NavProps> = ({ onOpenNewSale, onOpenMobileMenu }) => {
  const { activeTab, setActiveTab, summaryMetrics } = useApp();

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Visão Geral Financeira';
      case 'vendas':
        return 'Gestão de Vendas de Cestas';
      case 'cobrancas':
        return 'Controle de Cobranças & WhatsApp';
      case 'clientes':
        return 'Gestão de Clientes';
      case 'cestas':
        return 'Modelos & Composição de Cestas';
      case 'produtos':
        return 'Cadastro de Produtos';
      case 'estoque':
        return 'Controle de Estoque & Gargalos';
      case 'compras':
        return 'Compras & Entrada de Mercadorias';
      case 'relatorios':
        return 'DRE & Relatórios de Lucro';
      case 'configuracoes':
        return 'Configurações do Negócio';
      default:
        return 'CestUP';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-20">
      <div className="flex items-center space-x-3 sm:space-x-4">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg focus:outline-none"
            aria-label="Abrir Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Logo on mobile */}
        <div
          onClick={() => setActiveTab('dashboard')}
          className="lg:hidden flex items-center gap-2 cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[#2563eb] flex items-center justify-center text-white font-black text-[10px]">
            CUP
          </div>
          <span className="font-bold text-slate-900 text-sm">CestUP</span>
        </div>

        <div className="hidden sm:flex items-center space-x-3">
          <h2 className="text-base sm:text-lg font-semibold text-slate-800">
            {getTabTitle()}
          </h2>
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider">
            Status: OK
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        <button
          type="button"
          onClick={() => setActiveTab('configuracoes')}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          title="Gerenciar base de testes ou zerar dados"
        >
          <span>⚙️ Base & Testes</span>
        </button>

        {summaryMetrics.overdueList.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('cobrancas')}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{summaryMetrics.overdueList.length} Em Atraso</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenNewSale}
          className="bg-[#2563eb] text-white px-3.5 sm:px-4 py-2 rounded-lg text-sm font-semibold shadow-xs hover:bg-[#1d4ed8] flex items-center gap-2 transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Nova Venda</span>
        </button>
      </div>
    </header>
  );
};

export const Navbar = Sidebar;

