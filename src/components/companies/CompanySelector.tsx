import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Settings,
  ArrowRightLeft,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface CompanySelectorProps {
  onOpenManager: () => void;
  variant?: 'compact' | 'full' | 'sidebar';
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({
  onOpenManager,
  variant = 'compact',
}) => {
  const { companies, activeCompanyId, activeCompany, setActiveCompanyId } = useApp();
  const { currentUser } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = currentUser?.role === 'superadmin';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'sidebar') {
    return (
      <div className="p-3 border-b border-[#334155] bg-slate-900/50">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-blue-400" />
            <span>Empresa Ativa</span>
          </span>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={onOpenManager}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
            >
              Gerenciar
            </button>
          )}
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              if (isSuperAdmin) setDropdownOpen(!dropdownOpen);
            }}
            className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
              isSuperAdmin
                ? 'bg-slate-800 hover:bg-slate-700/80 border border-slate-700 cursor-pointer text-white'
                : 'bg-slate-800/60 border border-slate-800 text-slate-200 cursor-default'
            }`}
          >
            <div className="min-w-0 pr-1">
              <p className="font-bold text-xs text-white truncate">{activeCompany.name}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                {activeCompany.document ? `CNPJ: ${activeCompany.document}` : 'Matriz'}
              </p>
            </div>
            {isSuperAdmin && <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          </button>

          {dropdownOpen && isSuperAdmin && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#1e293b] border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden py-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700/60">
                Alternar Empresa / Filial
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-800">
                {companies.map((comp) => {
                  const isSelected = comp.id === activeCompanyId;
                  return (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => {
                        setActiveCompanyId(comp.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors hover:bg-slate-700/60 cursor-pointer ${
                        isSelected ? 'bg-blue-600/20 text-blue-300 font-bold' : 'text-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate">{comp.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{comp.document || 'Sem CNPJ'}</p>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="p-1.5 border-t border-slate-700 bg-slate-900/80">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenManager();
                  }}
                  className="w-full px-2 py-1.5 text-xs text-blue-300 hover:text-white hover:bg-slate-800 rounded-md font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Cadastrar Nova Empresa</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Header compact / full variant
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          if (isSuperAdmin) setDropdownOpen(!dropdownOpen);
          else onOpenManager();
        }}
        className={`flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer text-left ${
          dropdownOpen ? 'ring-2 ring-blue-500/20 border-blue-400' : ''
        }`}
        title={isSuperAdmin ? 'Clique para alternar entre empresas ou gerenciar' : 'Empresa atual'}
      >
        <div className="w-7 h-7 rounded-lg bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
          <Building2 className="w-3.5 h-3.5" />
        </div>
        <div className="hidden md:block min-w-0 max-w-[150px] lg:max-w-[200px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
            Empresa
          </span>
          <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">
            {activeCompany.name}
          </span>
        </div>
        {isSuperAdmin && <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
      </button>

      {dropdownOpen && isSuperAdmin && (
        <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
              Empresas do Sistema
            </span>
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
              {companies.length}
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {companies.map((comp) => {
              const isSelected = comp.id === activeCompanyId;
              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => {
                    setActiveCompanyId(comp.id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between text-xs transition-colors hover:bg-slate-50 cursor-pointer ${
                    isSelected ? 'bg-blue-50/70 text-blue-900 font-bold' : 'text-slate-700'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate font-semibold">{comp.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {comp.document ? `CNPJ: ${comp.document}` : 'Sem documento'}
                    </p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                onOpenManager();
              }}
              className="w-full px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Settings className="w-3 h-3" />
              <span>Gerenciar Empresas</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
