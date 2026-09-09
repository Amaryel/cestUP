import React, { useState } from 'react';
import {
  Building,
  Building2,
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
  Lock,
  UserPlus,
  Ban,
  ShieldAlert,
  Edit3,
  ArrowRight,
  RefreshCw,
  Plus,
  Globe,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BusinessSettings, UserRole, UserStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  SUPABASE_SQL_SCHEMA,
  isMasterSuperAdmin,
  MASTER_ADMIN_EMAIL,
  MASTER_ADMIN_USERNAME,
} from '../../lib/supabase';
import { Modal } from '../common/Modal';
import { CompanyManagerModal } from '../companies/CompanyManagerModal';
import { ProductCatalogExportImportModal } from '../products/ProductCatalogExportImportModal';

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
    companies,
    activeCompanyId,
    activeCompany,
    setActiveCompanyId,
  } = useApp();

  const {
    currentUser,
    registeredUsers,
    updateUserRoleAndStatus,
    updateCurrentUserProfile,
    createUserByAdmin,
    deleteUser,
    syncLocalUsersToSupabase,
    isSupabaseOnline,
    refreshUsers,
    isMasterAdmin,
  } = useAuth();

  const [formData, setFormData] = useState<BusinessSettings>(settings);
  const [notification, setNotification] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Profile editing state
  const [profileUsername, setProfileUsername] = useState(currentUser?.username || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Company and catalog modals
  const [isCompanyManagerOpen, setIsCompanyManagerOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);

  // New user creation modal state
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'operator' as UserRole,
    status: 'active' as UserStatus,
    companyId: activeCompanyId,
  });

  // Supabase Sync & SQL State
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlDetails, setShowSqlDetails] = useState(false);
  const [isSyncingUsers, setIsSyncingUsers] = useState(false);

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'clear' | 'demo' | 'quick_sales' | 'delete_user' | 'block_user';
    title: string;
    description: string;
    confirmButtonText: string;
    confirmButtonColor: string;
    targetUserId?: string;
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

  React.useEffect(() => {
    if (currentUser) {
      setProfileUsername(currentUser.username);
    }
  }, [currentUser]);

  const showNotification = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    showNotification('Configurações da empresa salvas com sucesso!');
    try {
      confetti({ particleCount: 30, spread: 40 });
    } catch {}
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileUsername.trim()) {
      showNotification('O nome de usuário não pode estar vazio.', 'warning');
      return;
    }

    const res = await updateCurrentUserProfile({
      username: profileUsername.trim(),
      password: profilePassword ? profilePassword : undefined,
    });

    if (res.success) {
      setIsEditingProfile(false);
      setProfilePassword('');
      showNotification('Seu perfil e nome de usuário foram atualizados com sucesso!');
      try {
        confetti({ particleCount: 30, spread: 35 });
      } catch {}
    } else {
      showNotification(res.error || 'Erro ao atualizar perfil.', 'warning');
    }
  };

  const handlePromoteUser = async (userId: string, newRole: UserRole, username: string) => {
    if (currentUser?.role !== 'superadmin') {
      showNotification('Apenas o Superadmin tem autorização para alterar papéis de usuários.', 'warning');
      return;
    }

    const res = await updateUserRoleAndStatus(userId, newRole);
    if (res.success) {
      showNotification(`Permissão de "${username}" atualizada para ${newRole.toUpperCase()}!`);
      try {
        confetti({ particleCount: 35, spread: 40 });
      } catch {}
    } else {
      showNotification(res.error || 'Erro ao alterar permissão.', 'warning');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: UserStatus, username: string) => {
    if (currentUser?.role !== 'superadmin') {
      showNotification('Apenas o Superadmin pode liberar ou bloquear usuários.', 'warning');
      return;
    }

    const newStatus: UserStatus = currentStatus === 'active' ? 'blocked' : 'active';
    const res = await updateUserRoleAndStatus(userId, undefined, newStatus);
    if (res.success) {
      showNotification(
        newStatus === 'active'
          ? `Usuário "${username}" foi ATIVADO e liberado com sucesso!`
          : `Usuário "${username}" foi BLOQUEADO do sistema.`,
        newStatus === 'active' ? 'success' : 'warning'
      );
    } else {
      showNotification(res.error || 'Erro ao alterar status.', 'warning');
    }
  };

  const handleAssignCompany = async (userId: string, newCompanyId: string, username: string) => {
    if (currentUser?.role !== 'superadmin') {
      showNotification('Apenas o Superadmin pode vincular usuários a empresas.', 'warning');
      return;
    }
    const targetComp = companies.find((c) => c.id === newCompanyId);
    const res = await updateUserRoleAndStatus(userId, undefined, undefined, newCompanyId);
    if (res.success) {
      showNotification(
        `Usuário "${username}" foi vinculado à empresa "${targetComp?.name || 'Matriz'}" com sucesso!`
      );
    } else {
      showNotification(res.error || 'Erro ao alterar empresa do usuário.', 'warning');
    }
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createUserByAdmin(newUserData);
    if (res.success) {
      setNewUserModalOpen(false);
      setNewUserData({
        username: '',
        email: '',
        password: '',
        role: 'operator',
        status: 'active',
        companyId: activeCompanyId,
      });
      showNotification(`Novo usuário "${res.user?.username}" cadastrado com sucesso!`);
      try {
        confetti({ particleCount: 40, spread: 50 });
      } catch {}
    } else {
      showNotification(res.error || 'Erro ao cadastrar novo usuário.', 'warning');
    }
  };

  const handleDeleteUserClick = (userId: string, username: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete_user',
      title: `Excluir Usuário "${username}"?`,
      description: `Tem certeza de que deseja remover o usuário "${username}" do sistema? Esta ação é irreversível.`,
      confirmButtonText: 'Sim, Excluir Usuário',
      confirmButtonColor: 'bg-rose-600 hover:bg-rose-700',
      targetUserId: userId,
    });
  };

  const handleSyncUsers = async () => {
    setIsSyncingUsers(true);
    try {
      const res = await syncLocalUsersToSupabase();
      if (res.success) {
        showNotification(res.message);
        try {
          confetti({ particleCount: 50, spread: 60 });
        } catch {}
      } else {
        showNotification(res.message, 'warning');
      }
    } catch (err: any) {
      showNotification(err?.message || 'Erro ao sincronizar usuários.', 'warning');
    } finally {
      setIsSyncingUsers(false);
    }
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

  const handleExecuteConfirmedAction = async () => {
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
    } else if (confirmModal.type === 'delete_user' && confirmModal.targetUserId) {
      const res = await deleteUser(confirmModal.targetUserId);
      if (res.success) {
        showNotification('Usuário removido com sucesso!');
      } else {
        showNotification(res.error || 'Não foi possível remover o usuário.', 'warning');
      }
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
          Personalize seu perfil de usuário, gerencie acessos de Superadmin e mantenha a sincronização do Supabase ativa.
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

      {/* SEÇÃO 0: MEU PERFIL DE USUÁRIO & CREDENCIAIS */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Meu Perfil de Acesso & Identificação
              </h3>
              <p className="text-xs text-slate-500">
                Você pode alterar seu <strong>Nome de Usuário (Username)</strong> para efetuar login diretamente sem precisar do e-mail.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                currentUser?.role === 'superadmin'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : currentUser?.role === 'admin'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              {currentUser?.role === 'superadmin' ? (
                <>
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {isMasterAdmin ? '👑 Superadmin Mestre (amaryelcc)' : '⭐ Superadmin'}
                  </span>
                </>
              ) : currentUser?.role === 'admin' ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>🛡️ Administrador</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  <span>👤 Operador</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Profile Card & Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome de Usuário (Username para Login) *
              </label>
              <input
                type="text"
                required
                value={profileUsername}
                onChange={(e) => setProfileUsername(e.target.value)}
                placeholder="ex: amaryelcc ou meu_usuario"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Permite que você entre na tela inicial apenas digitando este nome e sua senha.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                E-mail Cadastrado
              </label>
              <input
                type="email"
                disabled
                value={currentUser?.email || ''}
                className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-600 font-mono cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {isMasterAdmin ? 'Conta Mestre Root do Sistema' : 'Vinculado ao cadastro do usuário.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Alterar Nova Senha
              </label>
              <input
                type="password"
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
                placeholder="Deixe em branco para manter"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Preencha apenas se desejar redefinir sua senha.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Atualizar Meu Perfil & Nome de Usuário</span>
            </button>
          </div>
        </form>
      </div>

      {/* SEÇÃO MULTIBANCO & EMPRESAS CADASTRADAS (MULTI-CNPJ) */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Gestão Multibanco & Empresas Cadastradas (Multi-CNPJ)
              </h3>
              <p className="text-xs text-slate-500">
                Gerencie empresas independentes com controle de vendas, estoque e clientes 100% isolados.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExportImportOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Boxes className="w-3.5 h-3.5 text-blue-600" />
              <span>Importar / Exportar Catálogo</span>
            </button>

            {currentUser?.role === 'superadmin' && (
              <button
                type="button"
                onClick={() => setIsCompanyManagerOpen(true)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Gerenciar / Cadastrar Empresas</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Company Quick Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 bg-gradient-to-r from-indigo-50/70 to-blue-50/50 border border-indigo-100 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded tracking-wider">
                  Empresa Ativa no Contexto
                </span>
                <span className="text-xs font-mono text-slate-600 bg-white/80 border border-indigo-200 px-2 py-0.5 rounded">
                  CNPJ: {activeCompany?.document || '00.000.000/0001-00'}
                </span>
              </div>
              <h4 className="font-black text-slate-900 text-base">
                {activeCompany?.name || 'Matriz Principal'}
              </h4>
              <p className="text-xs text-slate-600">
                {activeCompany?.address || 'Endereço não informado'} • Tel: {activeCompany?.phone || 'Não informado'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsCompanyManagerOpen(true)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Dados</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total de Empresas
              </span>
              <span className="text-base font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                {companies.length}
              </span>
            </div>
            <div className="pt-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Trocar Empresa Ativa:
              </label>
              <select
                value={activeCompanyId}
                onChange={(e) => setActiveCompanyId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {companies.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} ({comp.document})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick List of Companies */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {companies.map((comp) => {
            const isActive = comp.id === activeCompanyId;
            return (
              <div
                key={comp.id}
                onClick={() => setActiveCompanyId(comp.id)}
                className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                  isActive
                    ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {comp.name}
                    </span>
                    {isActive && (
                      <span className="shrink-0 text-[9px] font-bold bg-indigo-600 text-white px-1.5 py-0.2 rounded">
                        ATIVA
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono truncate">
                    CNPJ: {comp.document}
                  </p>
                </div>
                <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-300'}`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 1: GESTÃO DE USUÁRIOS, LIBERAÇÕES & NÍVEL SUPERADMIN */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Crown className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Controle de Usuários, Liberação e Nível Superadmin
              </h3>
              <p className="text-xs text-slate-500">
                Somente o <strong>Superadmin</strong> (<code className="text-slate-700">amaryelcc@gmail.com</code> / <code className="text-slate-700">amaryelcc</code>) pode promover outros usuários a Superadmin, alterar permissões, vincular a empresas ou bloquear/liberar acessos.
              </p>
            </div>
          </div>

          {currentUser?.role === 'superadmin' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isSyncingUsers}
                onClick={handleSyncUsers}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Sincroniza todos os usuários com o Supabase Auth e tabela profiles"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingUsers ? 'animate-spin' : ''}`} />
                <span>{isSyncingUsers ? 'Sincronizando...' : 'Sincronizar no Supabase'}</span>
              </button>

              <button
                type="button"
                onClick={() => setNewUserModalOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Cadastrar Novo Usuário</span>
              </button>
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
                <th className="p-3">Empresa Vinculada (CNPJ)</th>
                <th className="p-3">Nível de Acesso</th>
                <th className="p-3">Status de Acesso</th>
                <th className="p-3">Data Cadastro</th>
                <th className="p-3 text-right">Ações & Permissões</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registeredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-400">
                    Nenhum usuário secundário cadastrado.
                  </td>
                </tr>
              ) : (
                registeredUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isMaster = isMasterSuperAdmin(u.email) || isMasterSuperAdmin(u.username);
                  const isBlocked = u.status === 'blocked';
                  const userCompany = companies.find((c) => c.id === u.companyId);

                  return (
                    <tr
                      key={u.id}
                      className={
                        isBlocked
                          ? 'bg-rose-50/40 opacity-80'
                          : isCurrent
                          ? 'bg-blue-50/40'
                          : 'hover:bg-slate-50/80'
                      }
                    >
                      <td className="p-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] ${
                              isMaster
                                ? 'bg-amber-600'
                                : u.role === 'superadmin'
                                ? 'bg-amber-600'
                                : u.role === 'admin'
                                ? 'bg-emerald-600'
                                : 'bg-blue-600'
                            }`}
                          >
                            {u.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold">{u.username}</span>
                            {isMaster && (
                              <span className="ml-1.5 text-[9px] bg-amber-100 text-amber-900 border border-amber-300 font-extrabold px-1.5 py-0.2 rounded">
                                👑 FUNDADOR
                              </span>
                            )}
                            {isCurrent && (
                              <span className="ml-1.5 text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                                VOCÊ
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-slate-600 font-mono">{u.email}</td>

                      {/* Empresa Vinculada */}
                      <td className="p-3">
                        {isMaster || u.role === 'superadmin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            🏢 Todas as Empresas (Global)
                          </span>
                        ) : currentUser?.role === 'superadmin' ? (
                          <select
                            value={u.companyId || companies[0]?.id || ''}
                            onChange={(e) => handleAssignCompany(u.id, e.target.value, u.username)}
                            className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 font-medium text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {companies.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.document})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-slate-700 font-medium">
                            {userCompany ? `${userCompany.name} (${userCompany.document})` : 'Matriz'}
                          </span>
                        )}
                      </td>

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
                          {u.role === 'superadmin'
                            ? '⭐ Superadmin'
                            : u.role === 'admin'
                            ? '🛡️ Admin'
                            : '👤 Operador'}
                        </span>
                      </td>

                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            u.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : u.status === 'blocked'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {u.status === 'active' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Ativo</span>
                            </>
                          ) : u.status === 'blocked' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span>Bloqueado</span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>Pendente</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="p-3 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Block / Unblock Button */}
                          {!isMaster && currentUser?.role === 'superadmin' && (
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u.id, u.status, u.username)}
                              className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer border ${
                                u.status === 'active'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                              title={u.status === 'active' ? 'Bloquear Acesso' : 'Liberar / Ativar Acesso'}
                            >
                              {u.status === 'active' ? '🔴 Bloquear' : '🟢 Ativar'}
                            </button>
                          )}

                          {/* Role Alter Buttons */}
                          {currentUser?.role === 'superadmin' && !isMaster && (
                            <>
                              <button
                                type="button"
                                onClick={() => handlePromoteUser(u.id, 'superadmin', u.username)}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                  u.role === 'superadmin'
                                    ? 'bg-amber-200 text-amber-900 border border-amber-400'
                                    : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-800'
                                }`}
                                title="Tornar Superadmin (Apenas o Superadmin pode conceder)"
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
                            </>
                          )}

                          {/* Delete Button */}
                          {!isMaster && !isCurrent && currentUser?.role === 'superadmin' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUserClick(u.id, u.username)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Excluir Usuário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* SEÇÃO 2: CONEXÃO SUPABASE & SINCRONIZAÇÃO AUTOMÁTICA */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Database className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Sincronização com Supabase (Banco de Dados em Nuvem)
              </h3>
              <p className="text-xs text-slate-500">
                Sincronização contínua com validação de status de usuários e persistência em nuvem.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-emerald-50 border-emerald-200 text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Conexão Ativa & Automática</span>
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

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <Globe className="w-4 h-4 text-blue-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                Acesso Universal e Multi-Dispositivo Sem Configuração
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                O CestUP está conectado de forma nativa e automática ao banco de dados compartilhado. Você e sua equipe podem fazer login a partir de <strong>qualquer computador, notebook ou smartphone</strong> sem precisar inserir chaves ou URLs.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span>Sincronização bidirecional em tempo real ativa</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowSqlDetails(!showSqlDetails)}
                className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200 font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
              >
                {showSqlDetails ? 'Ocultar Estrutura SQL' : 'Visualizar Estrutura SQL'}
              </button>

              <button
                type="button"
                disabled={isSyncingUsers}
                onClick={handleSyncUsers}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingUsers ? 'animate-spin' : ''}`} />
                <span>{isSyncingUsers ? 'Sincronizando...' : 'Sincronizar na Nuvem Agora'}</span>
              </button>
            </div>
          </div>
        </div>

        {showSqlDetails && (
          <div className="mt-3 p-3.5 bg-slate-900 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
            <pre className="whitespace-pre-wrap">{SUPABASE_SQL_SCHEMA}</pre>
          </div>
        )}
      </div>

      {/* SEÇÃO 3: GERENCIAMENTO DE DADOS & TESTES */}
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

      {/* SEÇÃO 4: DADOS DA EMPRESA, PIX E PARÂMETROS */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 1. DADOS DA EMPRESA E PIX */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base text-slate-900">
              4. Identificação da Empresa & PIX
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
              5. Parâmetros de Venda & Alertas
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
                6. Modelos de Mensagens para WhatsApp
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

      {/* Modal: Cadastrar Novo Usuário (Exclusivo Superadmin) */}
      <Modal
        isOpen={newUserModalOpen}
        onClose={() => setNewUserModalOpen(false)}
        title="Cadastrar Novo Usuário no Sistema"
        maxWidth="md"
      >
        <form onSubmit={handleCreateNewUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome de Usuário (Username) *
            </label>
            <input
              type="text"
              required
              placeholder="ex: operador_marcos"
              value={newUserData.username}
              onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              E-mail *
            </label>
            <input
              type="email"
              required
              placeholder="ex: marcos@empresa.com"
              value={newUserData.email}
              onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-slate-900 focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Senha Inicial *
            </label>
            <input
              type="password"
              required
              placeholder="Mínimo 6 caracteres"
              value={newUserData.password}
              onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nível de Permissão
              </label>
              <select
                value={newUserData.role}
                onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
              >
                <option value="operator">👤 Operador (Vendas e Cobrança)</option>
                <option value="admin">🛡️ Administrador</option>
                <option value="superadmin">⭐ Superadmin (Acesso Total)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status Inicial
              </label>
              <select
                value={newUserData.status}
                onChange={(e) => setNewUserData({ ...newUserData, status: e.target.value as UserStatus })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
              >
                <option value="active">🟢 Ativo (Acesso Liberado)</option>
                <option value="pending">🟡 Pendente de Liberação</option>
                <option value="blocked">🔴 Bloqueado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Vincular à Empresa (CNPJ) *
            </label>
            <select
              value={newUserData.companyId || activeCompanyId}
              onChange={(e) => setNewUserData({ ...newUserData, companyId: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:bg-white outline-none focus:ring-2 focus:ring-[#2563eb]"
            >
              {companies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name} ({comp.document})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              O usuário só terá acesso aos clientes, vendas e estoque desta empresa específica (a menos que seja Superadmin).
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setNewUserModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Cadastrar Usuário</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Gerenciador de Empresas / Filiais */}
      <CompanyManagerModal
        isOpen={isCompanyManagerOpen}
        onClose={() => setIsCompanyManagerOpen(false)}
      />

      {/* Modal: Exportação e Importação de Catálogo de Produtos */}
      <ProductCatalogExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
      />

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
