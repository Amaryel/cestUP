import React, { useState } from 'react';
import {
  Building,
  MessageCircle,
  Sliders,
  CheckCircle2,
  Trash2,
  Sparkles,
  Zap,
  RotateCcw,
  AlertTriangle,
  Database,
  Info,
  Users,
  ShoppingBag,
  Truck,
  Boxes,
  CreditCard,
  Crown,
  ShieldCheck,
  User,
  Copy,
  Check,
  ExternalLink,
  Key,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BusinessSettings, UserRole } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  SUPABASE_SQL_SCHEMA,
  getSupabaseCredentials,
  saveCustomSupabaseCredentials,
  clearCustomSupabaseCredentials,
} from '../../lib/supabase';
import { Modal } from '../common/Modal';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    clearAllData,
    generateFictitiousDatabase,
    generateQuickTestSales,
    customers,
    sales,
    purchases,
    products,
    installments,
  } = useApp();

  const { currentUser, registeredUsers, updateRole, isSupabaseOnline, refreshUsers } = useAuth();

  const [formData, setFormData] = useState<BusinessSettings>(settings);
  const [notification, setNotification] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Supabase Custom Config State
  const initialCreds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(initialCreds.url);
  const [supabaseKey, setSupabaseKey] = useState(initialCreds.anonKey);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlDetails, setShowSqlDetails] = useState(false);

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'clear' | 'demo' | 'quick_sales';
    title: string;
    description: string;
    confirmButtonText: string;
    confirmButtonColor: string;
  }>({
    isOpen: false,
    type: 'demo',
    title: '',
    description: '',
    confirmButtonText: '',
    confirmButtonColor: '',
  });

  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const showNotification = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    showNotification('Configurações da empresa salvas com sucesso!');
    try {
      confetti({ particleCount: 30, spread: 40 });
    } catch {}
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      clearCustomSupabaseCredentials();
      showNotification('Credenciais do Supabase redefinidas para o padrão.', 'info');
    } else {
      saveCustomSupabaseCredentials(supabaseUrl, supabaseKey);
      showNotification('Configurações do Supabase salvas com sucesso!');
      try {
        confetti({ particleCount: 40, spread: 50 });
      } catch {}
    }
  };

  const handlePromoteUser = async (userId: string, newRole: UserRole, username: string) => {
    await updateRole(userId, newRole);
    showNotification(`Permissão de "${username}" atualizada para ${newRole.toUpperCase()}!`);
    try {
      confetti({ particleCount: 35, spread: 40 });
    } catch {}
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleOpenClearModal = () => {
    setConfirmModal({
      isOpen: true,
      type: 'clear',
      title: 'Zerar Todos os Dados do Sistema?',
      description:
        'Esta ação irá apagar todas as vendas, clientes cadastrados, contas a receber, compras e movimentações de estoque, permitindo que você inicie o sistema totalmente limpo.',
      confirmButtonText: 'Sim, Zerar Tudo (Começar Limpo)',
      confirmButtonColor: 'bg-rose-600 hover:bg-rose-700',
    });
  };

  const handleOpenDemoModal = () => {
    setConfirmModal({
      isOpen: true,
      type: 'demo',
      title: 'Carregar Base de Dados Fictícia?',
      description:
        'Esta ação irá preencher o sistema com uma base completa e realista para testes: 7 clientes, produtos com estoque abastecido, 8 vendas (à vista, parceladas, vencidas e a vencer), compras de fornecedores e cobranças prontas para testar no WhatsApp.',
      confirmButtonText: 'Carregar Dados Fictícios',
      confirmButtonColor: 'bg-[#2563eb] hover:bg-[#1d4ed8]',
    });
  };

  const handleExecuteConfirmedAction = () => {
    if (confirmModal.type === 'clear') {
      clearAllData();
      showNotification('Todos os dados foram zerados com sucesso! O sistema está pronto do zero.', 'warning');
    } else if (confirmModal.type === 'demo') {
      generateFictitiousDatabase();
      showNotification('Base de dados fictícia carregada com sucesso! Explore todas as telas para testar.');
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch {}
    } else if (confirmModal.type === 'quick_sales') {
      generateQuickTestSales(3);
      showNotification('3 novas vendas de teste foram geradas e adicionadas ao sistema!');
      try {
        confetti({ particleCount: 40, spread: 50 });
      } catch {}
    }
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleQuickAddSales = () => {
    generateQuickTestSales(3);
    showNotification('3 novas vendas de teste foram geradas e adicionadas ao sistema!');
    try {
      confetti({ particleCount: 40, spread: 50 });
    } catch {}
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Configurações, Usuários & Supabase
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Personalize dados da sua empresa, gerencie níveis de Superadmin e conecte o banco de dados Supabase.
        </p>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 text-xs sm:text-sm font-semibold border ${
            notification.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          {notification.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* SEÇÃO 0: GESTÃO DE USUÁRIOS E NÍVEL SUPERADMIN */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Crown className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Gestão de Usuários & Nível Superadmin
              </h3>
              <p className="text-xs text-slate-500">
                Visualize os usuários cadastrados e promova qualquer cadastro para <strong>Superadmin</strong>.
              </p>
            </div>
          </div>

          {currentUser && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-bold text-amber-900">
                Logado como: {currentUser.username} ({currentUser.role.toUpperCase()})
              </span>
            </div>
          )}
        </div>

        {/* User list table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Usuário</th>
                <th className="p-3">E-mail</th>
                <th className="p-3">Papel Atual</th>
                <th className="p-3">Data Cadastro</th>
                <th className="p-3 text-right">Alterar Nível de Acesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registeredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400">
                    Nenhum usuário secundário cadastrado. Você está acessando como <strong>{currentUser?.username || 'Superadmin'}</strong>.
                  </td>
                </tr>
              ) : (
                registeredUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className={isCurrent ? 'bg-blue-50/40' : 'hover:bg-slate-50/80'}>
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                          {u.username.substring(0, 2).toUpperCase()}
                        </div>
                        <span>{u.username}</span>
                        {isCurrent && (
                          <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                            VOCÊ
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 font-mono">{u.email}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            u.role === 'superadmin'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : u.role === 'admin'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {u.role === 'superadmin' ? '⭐ Superadmin' : u.role === 'admin' ? '🛡️ Admin' : '👤 Operador'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePromoteUser(u.id, 'superadmin', u.username)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                              u.role === 'superadmin'
                                ? 'bg-amber-200 text-amber-900 border border-amber-400'
                                : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-800'
                            }`}
                            title="Tornar Superadmin (Acesso Total)"
                          >
                            ⭐ Superadmin
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePromoteUser(u.id, 'admin', u.username)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                              u.role === 'admin'
                                ? 'bg-emerald-200 text-emerald-900 border border-emerald-400'
                                : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                            }`}
                            title="Tornar Administrador"
                          >
                            🛡️ Admin
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePromoteUser(u.id, 'operator', u.username)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                              u.role === 'operator'
                                ? 'bg-slate-300 text-slate-900'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                            title="Tornar Operador"
                          >
                            👤 Operador
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEÇÃO 1: CONEXÃO SUPABASE & SQL SCHEMA */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Database className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Conexão Supabase (Banco de Dados em Nuvem & Autenticação)
              </h3>
              <p className="text-xs text-slate-500">
                Configure as credenciais do seu projeto Supabase ou use o banco de dados integrado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                isSupabaseOnline
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupabaseOnline ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'
                }`}
              />
              <span>{isSupabaseOnline ? 'Supabase Conectado' : 'Modo Integrado Ativo'}</span>
            </div>

            <button
              type="button"
              onClick={handleCopySql}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'SQL Copiado!' : 'Copiar Script SQL'}</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveSupabaseConfig} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Supabase URL (Projeto)
              </label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Supabase Anon / Public API Key
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-slate-500">
              💡 As variáveis também podem ser passadas via <code>.env.example</code> (<code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>).
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSqlDetails(!showSqlDetails)}
                className="px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50 font-semibold rounded-lg border border-blue-200 transition-colors cursor-pointer"
              >
                {showSqlDetails ? 'Ocultar Script SQL' : 'Visualizar Script SQL Supabase'}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Salvar Credenciais Supabase
              </button>
            </div>
          </div>
        </form>

        {showSqlDetails && (
          <div className="mt-3 p-3.5 bg-slate-900 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
            <pre className="whitespace-pre-wrap">{SUPABASE_SQL_SCHEMA}</pre>
          </div>
        )}
      </div>

      {/* SEÇÃO 2: GERENCIAMENTO DE DADOS & TESTES */}
      <div className="bg-white rounded-lg border-2 border-blue-200 p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Base de Dados & Ambiente de Testes
              </h3>
              <p className="text-xs text-slate-500">
                Zere todos os dados para começar do zero ou carregue dados fictícios para testar a aplicação.
              </p>
            </div>
          </div>

          {/* Current Live Stats Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
              👥 {customers.length} Clientes
            </span>
            <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
              🛍️ {sales.length} Vendas
            </span>
            <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
              🚚 {purchases.length} Compras
            </span>
            <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
              📦 {products.length} Produtos
            </span>
          </div>
        </div>

        {/* 3 Action Cards for Data Management */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Zerar Tudo */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-rose-200 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <Trash2 className="w-4 h-4" />
                <span>Zerar Todos os Dados</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Apaga todas as vendas, clientes, contas a receber, compras e zera os estoques para você testar com seus próprios dados do zero.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenClearModal}
              className="w-full py-2 px-3 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Zerar Dados (Modo Limpo)</span>
            </button>
          </div>

          {/* 2. Carregar Base Fictícia Completa */}
          <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Base Fictícia Completa</span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Carrega 7 clientes, produtos com estoque, compras de insumos e 8 vendas com parcelas pagas, a vencer e atrasadas para testar cobranças e WhatsApp.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenDemoModal}
              className="w-full py-2 px-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-xs rounded-lg transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Carregar Base Fictícia</span>
            </button>
          </div>

          {/* 3. Gerar Vendas de Teste Rápidas */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-emerald-200 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span>+3 Vendas de Teste</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Adiciona rapidamente 3 novas vendas fictícias (à vista e parceladas) para simular o crescimento do faturamento e dos relatórios.
              </p>
            </div>
            <button
              type="button"
              onClick={handleQuickAddSales}
              className="w-full py-2 px-3 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Gerar +3 Vendas Rápidas</span>
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 1. DADOS DA EMPRESA E PIX */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base text-slate-900">
              1. Identificação da Empresa & PIX
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome Comercial da Empresa *
              </label>
              <input
                type="text"
                required
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                CNPJ ou CPF do Emissor
              </label>
              <input
                type="text"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Telefone / WhatsApp Comercial
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Endereço / Centro de Distribuição
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Chave PIX para Cobranças *
              </label>
              <input
                type="text"
                required
                value={formData.pixKey}
                onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-blue-800 focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tipo da Chave PIX
              </label>
              <select
                value={formData.pixKeyType}
                onChange={(e) => setFormData({ ...formData, pixKeyType: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
              >
                <option value="CNPJ">CNPJ</option>
                <option value="CPF">CPF</option>
                <option value="Telefone">Celular / Telefone</option>
                <option value="Email">E-mail</option>
                <option value="Chave Aleatória">Chave Aleatória</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. PREÇOS E PARÂMETROS PADRÃO */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base text-slate-900">
              2. Parâmetros de Venda & Alertas
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Preço Padrão da Cesta Básica (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={formData.defaultBasketPrice}
                onChange={(e) =>
                  setFormData({ ...formData, defaultBasketPrice: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
              <p className="text-[11px] text-slate-500 mt-1">Valor padrão pré-preenchido nas novas vendas (R$ 340,00).</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Aviso Prévio de Vencimento (Dias de Antecedência)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={formData.alertDaysNotice}
                onChange={(e) =>
                  setFormData({ ...formData, alertDaysNotice: parseInt(e.target.value) || 3 })
                }
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Parcelas que vencem dentro deste intervalo aparecem em destaque.
              </p>
            </div>
          </div>
        </div>

        {/* 3. MODELOS DE MENSAGENS WHATSAPP */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base text-slate-900">
                3. Modelos de Mensagens para WhatsApp
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded font-mono">
              Tags: {'{cliente}'}, {'{valor}'}, {'{vencimento}'}, {'{dias}'}, {'{pix}'}, {'{empresa}'}
            </span>
          </div>

          {/* Mensagem Vencida */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-rose-700 uppercase tracking-wider">
              Mensagem para Cobrança de Parcela Vencida
            </label>
            <textarea
              rows={3}
              value={formData.whatsappMessageOverdue}
              onChange={(e) =>
                setFormData({ ...formData, whatsappMessageOverdue: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>

          {/* Mensagem Vence Hoje */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-amber-700 uppercase tracking-wider">
              Mensagem de Lembrete: Vence Hoje
            </label>
            <textarea
              rows={3}
              value={formData.whatsappMessageDueToday}
              onChange={(e) =>
                setFormData({ ...formData, whatsappMessageDueToday: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>

          {/* Mensagem Lembrete Prévio */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider">
              Mensagem de Lembrete Amigável Prévio (A Vencer)
            </label>
            <textarea
              rows={3}
              value={formData.whatsappMessageUpcoming}
              onChange={(e) =>
                setFormData({ ...formData, whatsappMessageUpcoming: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-sm rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Salvar Todas as Configurações</span>
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-700 leading-relaxed">
            {confirmModal.description}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExecuteConfirmedAction}
              className={`px-4 py-2 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer ${confirmModal.confirmButtonColor}`}
            >
              {confirmModal.confirmButtonText}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
