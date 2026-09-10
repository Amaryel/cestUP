import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  ArrowRight,
  Shield,
  FileText,
  Phone,
  CreditCard,
  MapPin,
  DollarSign,
  Boxes,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Company } from '../../types';

interface CompanyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExportImport?: () => void;
}

export const CompanyManagerModal: React.FC<CompanyManagerModalProps> = ({
  isOpen,
  onClose,
  onOpenExportImport,
}) => {
  const {
    companies,
    activeCompanyId,
    setActiveCompanyId,
    addCompany,
    updateCompany,
    deleteCompany,
    products,
    customers,
  } = useApp();
  const { currentUser, registeredUsers } = useAuth();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'phone' | 'email' | 'random'>('cnpj');
  const [defaultBasketPrice, setDefaultBasketPrice] = useState<number>(340);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const isSuperAdmin = currentUser?.role === 'superadmin';

  const resetForm = () => {
    setName('');
    setTradeName('');
    setDocument('');
    setPhone('');
    setEmail('');
    setAddress('');
    setPixKey('');
    setPixKeyType('cnpj');
    setDefaultBasketPrice(340);
    setStatus('active');
    setIsEditing(false);
    setEditingId(null);
  };

  const handleStartCreate = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleStartEdit = (company: Company) => {
    setName(company.name);
    setTradeName(company.tradeName || '');
    setDocument(company.document || '');
    setPhone(company.phone || '');
    setEmail(company.email || '');
    setAddress(company.address || '');
    setPixKey(company.pixKey || '');
    setPixKeyType(company.pixKeyType || 'cnpj');
    setDefaultBasketPrice(company.defaultBasketPrice || 340);
    setStatus(company.status || 'active');
    setEditingId(company.id);
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'O nome da empresa é obrigatório.' });
      return;
    }

    if (editingId) {
      await updateCompany(editingId, {
        name: name.trim(),
        tradeName: tradeName.trim() || undefined,
        document: document.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        pixKey: pixKey.trim() || undefined,
        pixKeyType,
        defaultBasketPrice: Number(defaultBasketPrice) || 340,
        alertDaysNotice: 7,
        status,
      });
      setFeedback({ type: 'success', message: `Empresa "${name}" atualizada com sucesso!` });
    } else {
      const created = await addCompany({
        name: name.trim(),
        tradeName: tradeName.trim() || undefined,
        document: document.trim() || '',
        phone: phone.trim() || '',
        email: email.trim() || undefined,
        address: address.trim() || '',
        pixKey: pixKey.trim() || '',
        pixKeyType,
        defaultBasketPrice: Number(defaultBasketPrice) || 340,
        alertDaysNotice: 7,
        status,
      });
      setFeedback({ type: 'success', message: `Empresa "${created.name}" cadastrada com sucesso!` });
    }

    resetForm();
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleDelete = async (id: string, compName: string) => {
    if (confirm(`Tem certeza que deseja excluir a empresa "${compName}" e todos os seus dados vinculados?`)) {
      const res = await deleteCompany(id);
      if (res.success) {
        setFeedback({ type: 'success', message: `Empresa "${compName}" excluída com sucesso.` });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erro ao excluir empresa.' });
      }
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const getCompanyUserCount = (companyId: string) => {
    return registeredUsers.filter((u) => u.companyId === companyId).length;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Gestão Multibanco & Empresas (Multi-CNPJ)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Superadmin
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Cadastre e gerencie filiais e empresas independentes com isolamento total de dados e vínculo de usuários.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 text-xs font-semibold flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <span>{feedback.message}</span>
            <button type="button" onClick={() => setFeedback(null)} className="underline cursor-pointer">
              Fechar
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Top Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs text-slate-500 font-medium block">Empresas Cadastradas</span>
              <span className="text-sm font-bold text-slate-800">
                {companies.length} {companies.length === 1 ? 'Empresa ativa' : 'Empresas ativas'} no sistema
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onOpenExportImport && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenExportImport();
                  }}
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Boxes className="w-3.5 h-3.5 text-blue-600" />
                  <span>Exportar / Importar Catálogo</span>
                </button>
              )}

              {!isEditing && isSuperAdmin && (
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Nova Empresa</span>
                </button>
              )}
            </div>
          </div>

          {/* Form when Editing/Creating */}
          {isEditing && (
            <form
              onSubmit={handleSubmit}
              className="bg-blue-50/40 border border-blue-200 rounded-xl p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-blue-200 pb-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>{editingId ? 'Editar Dados da Empresa' : 'Cadastrar Nova Empresa / Filial'}</span>
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Razão Social / Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Cestas Boa Vista Ltda"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Fantasia / Apelido
                  </label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="Ex: Cestas Boa Vista"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CNPJ ou CPF
                  </label>
                  <input
                    type="text"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(85) 98888-7777"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    E-mail Comercial
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@empresa.com"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Preço Padrão da Cesta (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={defaultBasketPrice}
                    onChange={(e) => setDefaultBasketPrice(parseFloat(e.target.value) || 0)}
                    placeholder="340.00"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Chave PIX
                  </label>
                  <select
                    value={pixKeyType}
                    onChange={(e: any) => setPixKeyType(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="cnpj">CNPJ</option>
                    <option value="cpf">CPF</option>
                    <option value="phone">Celular</option>
                    <option value="email">E-mail</option>
                    <option value="random">Chave Aleatória</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chave PIX para Recebimentos
                  </label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Chave PIX da empresa"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status da Empresa
                  </label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="active">Ativa</option>
                    <option value="inactive">Inativa</option>
                  </select>
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Endereço / Cidade / Estado
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-blue-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Empresa'}
                </button>
              </div>
            </form>
          )}

          {/* Companies List */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Empresas & Filiais Cadastradas
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {companies.map((company) => {
                const isActive = company.id === activeCompanyId;
                const userCount = getCompanyUserCount(company.id);

                return (
                  <div
                    key={company.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-bold text-sm text-slate-900 truncate">{company.name}</h5>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold rounded-full">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Empresa Ativa
                            </span>
                          )}
                          {company.status === 'inactive' && (
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-full">
                              Inativa
                            </span>
                          )}
                        </div>

                        {company.tradeName && (
                          <p className="text-xs text-slate-500 mt-0.5">{company.tradeName}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isSuperAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(company)}
                              title="Editar empresa"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {company.id !== 'comp-1' && companies.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDelete(company.id, company.name)}
                                title="Excluir empresa"
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600 border-t border-slate-100 pt-2.5">
                      <div>
                        <span className="text-slate-400 block text-[10px]">CNPJ / CPF</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {company.document || 'Não informado'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Telefone</span>
                        <span className="font-semibold text-slate-800">{company.phone || 'Não informado'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Preço Cesta</span>
                        <span className="font-bold text-emerald-700">
                          R$ {(company.defaultBasketPrice || 340).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Usuários Vinculados</span>
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          {userCount} {userCount === 1 ? 'usuário' : 'usuários'}
                        </span>
                      </div>
                    </div>

                    {/* Switch to this company button */}
                    {!isActive && isSuperAdmin && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCompanyId(company.id);
                            setFeedback({
                              type: 'success',
                              message: `Alternado com sucesso para a empresa "${company.name}"!`,
                            });
                            setTimeout(() => setFeedback(null), 3000);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Acessar esta Empresa</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Todos os dados, cadastros e estoques são 100% isolados por empresa.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
