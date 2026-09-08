import React, { useState } from 'react';
import {
  Download,
  Upload,
  Copy,
  Check,
  FileText,
  Boxes,
  Package,
  Building2,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  X,
  Share2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface ProductCatalogExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProductCatalogExportImportModal: React.FC<ProductCatalogExportImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    companies,
    activeCompanyId,
    activeCompany,
    products,
    basketTemplates,
    exportProductsCatalog,
    importProductsCatalog,
    cloneProductsFromCompany,
  } = useApp();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'clone'>('export');
  const [copied, setCopied] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [selectedSourceCompanyId, setSelectedSourceCompanyId] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const otherCompanies = companies.filter((c) => c.id !== activeCompanyId);

  const handleCopyJson = () => {
    const json = exportProductsCatalog(activeCompanyId);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setFeedback({ type: 'success', message: 'JSON do catálogo copiado para a área de transferência!' });
    setTimeout(() => {
      setCopied(false);
      setFeedback(null);
    }, 3000);
  };

  const handleDownloadJson = () => {
    const json = exportProductsCatalog(activeCompanyId);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = activeCompany.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    link.href = url;
    link.download = `catalogo_produtos_${safeName}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedback({ type: 'success', message: 'Download do arquivo de catálogo iniciado com sucesso!' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportJsonText(content);
        setFeedback({ type: 'success', message: `Arquivo "${file.name}" carregado. Clique em "Processar Importação".` });
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (!importJsonText.trim()) {
      setFeedback({ type: 'error', message: 'Insira ou carregue um JSON de produtos para importar.' });
      return;
    }

    const result = importProductsCatalog(importJsonText, activeCompanyId, importMode);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setImportJsonText('');
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const handleExecuteClone = () => {
    if (!selectedSourceCompanyId) {
      setFeedback({ type: 'error', message: 'Selecione a empresa de origem para clonar o catálogo.' });
      return;
    }

    const sourceComp = companies.find((c) => c.id === selectedSourceCompanyId);
    const confirmMsg =
      importMode === 'replace'
        ? `Atenção: O modo "Substituir" irá sobrescrever os produtos da empresa atual (${activeCompany.name}) pelos produtos da empresa "${sourceComp?.name}". Deseja continuar?`
        : `Deseja copiar todos os produtos e modelos de cesta da empresa "${sourceComp?.name}" para a empresa atual (${activeCompany.name})?`;

    if (confirm(confirmMsg)) {
      const result = cloneProductsFromCompany(selectedSourceCompanyId, activeCompanyId, importMode);
      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                Exportar & Importar Catálogo de Produtos
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Transfira e compartilhe cadastros de produtos e modelos de cestas entre empresas.
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

        {/* Current Company Indicator */}
        <div className="bg-blue-50/80 border-b border-blue-100 px-5 py-2.5 flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              Empresa Selecionada:{' '}
              <strong className="text-blue-950 font-bold">{activeCompany.name}</strong>
              {activeCompany.document ? ` (${activeCompany.document})` : ''}
            </span>
          </div>
          <span className="font-semibold text-[11px] text-blue-700">
            {products.length} produtos / {basketTemplates.length} cestas
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('export');
              setFeedback(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'export'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Catálogo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('import');
              setFeedback(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'import'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar Arquivo JSON</span>
          </button>

          {isSuperAdmin && otherCompanies.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('clone');
                setFeedback(null);
              }}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'clone'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Clonar de Outra Empresa</span>
            </button>
          )}
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

        {/* Tab Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[60vh]">
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                <p className="font-semibold text-slate-900">
                  Você está exportando o catálogo completo de <strong>{activeCompany.name}</strong>:
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Total de Produtos</span>
                    <strong className="text-sm text-slate-900">{products.length} itens</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Modelos de Cesta</span>
                    <strong className="text-sm text-slate-900">{basketTemplates.length} modelos</strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Arquivo JSON (.json)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                Selecione um arquivo <code>.json</code> exportado previamente ou cole o conteúdo JSON abaixo.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Carregar Arquivo .JSON do Computador
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-300 rounded-lg p-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ou Cole o Texto JSON Diretamente:
                </label>
                <textarea
                  rows={5}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder="Cole aqui o conteúdo JSON do catálogo de produtos..."
                  className="w-full text-xs font-mono p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Modo de Importação
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer text-xs ${
                      importMode === 'merge'
                        ? 'bg-blue-50/70 border-blue-400 text-blue-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-0.5"
                    />
                    <div>
                      <span>Mesclar (Recomendado)</span>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                        Adiciona novos produtos mantendo os já cadastrados na empresa.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer text-xs ${
                      importMode === 'replace'
                        ? 'bg-rose-50/70 border-rose-400 text-rose-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5"
                    />
                    <div>
                      <span>Substituir Tudo</span>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                        Remove produtos antigos da empresa e substitui pelos importados.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExecuteImport}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>Processar Importação para {activeCompany.name}</span>
              </button>
            </div>
          )}

          {/* TAB 3: CLONE FROM ANOTHER REGISTERED COMPANY */}
          {activeTab === 'clone' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                Copie o catálogo de produtos e cestas de uma empresa existente diretamente para{' '}
                <strong>{activeCompany.name}</strong> com 1 clique!
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Selecione a Empresa de Origem (de onde copiar):
                </label>
                <select
                  value={selectedSourceCompanyId}
                  onChange={(e) => setSelectedSourceCompanyId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white font-medium"
                >
                  <option value="">-- Escolha a Empresa de Origem --</option>
                  {otherCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.document ? `(CNPJ: ${c.document})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Modo de Cópia
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer text-xs ${
                      importMode === 'merge'
                        ? 'bg-blue-50/70 border-blue-400 text-blue-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cloneMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-0.5"
                    />
                    <div>
                      <span>Mesclar Cadastros</span>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                        Adiciona produtos que ainda não existem nesta empresa.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer text-xs ${
                      importMode === 'replace'
                        ? 'bg-rose-50/70 border-rose-400 text-rose-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cloneMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5"
                    />
                    <div>
                      <span>Substituir Catálogo</span>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                        Sobrescreve o catálogo desta empresa pelo da empresa de origem.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExecuteClone}
                disabled={!selectedSourceCompanyId}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs ${
                  selectedSourceCompanyId
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Clonar Catálogo para {activeCompany.name}</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
