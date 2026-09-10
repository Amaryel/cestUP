import React, { useState } from 'react';
import {
  Shield,
  Crown,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import {
  SUPABASE_SQL_SCHEMA,
  MASTER_ADMIN_EMAIL,
  MASTER_ADMIN_USERNAME,
} from '../../lib/supabase';

export const AuthView: React.FC = () => {
  const { login, register, isSupabaseOnline, refreshUsers } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(loginIdentifier, password);
        if (!res.success) {
          setErrorMessage(res.error || 'Não foi possível efetuar login.');
        } else {
          try {
            confetti({ particleCount: 40, spread: 50 });
          } catch {}
        }
      } else {
        // Registration mode
        const res = await register(email, username, password);
        if (!res.success) {
          setErrorMessage(res.error || 'Erro ao realizar cadastro.');
        } else {
          const isMaster = res.user?.role === 'superadmin';
          setSuccessMessage(
            isMaster
              ? `Bem-vindo(a) Superadmin Mestre ${res.user?.username}! Acesso total concedido.`
              : `Cadastro realizado com sucesso! Bem-vindo(a), ${res.user?.username}. Seu perfil foi criado como Operador.`
          );
          try {
            confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
          } catch {}
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ocorreu um erro durante a operação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 backdrop-blur-xs relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center text-white font-black text-xs shadow-md tracking-wider">
            CUP
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-tight">CestUP</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">SaaS Gestão de Cestas Básicas</p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-colors cursor-pointer"
            title="Visualizar instruções SQL do banco de dados"
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Script SQL</span>
          </button>

          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border bg-emerald-950/70 border-emerald-800 text-emerald-300"
            title="Conexão central ativa para todas as máquinas e dispositivos"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sistema Conectado</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Card Header & Title */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-2">
              {mode === 'register' ? <User className="w-6 h-6 text-blue-400" /> : <Lock className="w-6 h-6 text-blue-400" />}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {mode === 'register' ? 'Criar Nova Conta' : 'Acessar o CestUP'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {mode === 'register'
                ? 'Cadastre seu usuário para acessar o sistema'
                : 'Entre com seu nome de usuário ou e-mail cadastrado'}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Já tenho Conta (Login)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Criar Novo Cadastro
            </button>
          </div>

          {/* Error & Success Banners */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-800/80 rounded-xl text-xs text-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* LOGIN MODE: Single Identifier for Email OR Username */}
            {mode === 'login' ? (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  E-mail ou Nome de Usuário *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="ex: amaryelcc ou seu@email.com"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Você pode conectar usando seu <strong>Nome de Usuário</strong> ou <strong>E-mail</strong>.
                </p>
              </div>
            ) : (
              /* REGISTER MODE: Username & Email separate */
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Nome de Usuário (Username) *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="ex: amaryelcc ou joao_vendas"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Será usado para entrar no sistema e identificar suas operações.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    E-mail Comercial / Pessoal *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="ex: amaryelcc@gmail.com ou seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Senha Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Senha de Acesso *
                </label>
                <span className="text-[11px] text-slate-500">Mínimo 6 caracteres</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Security Role Notice in Register Mode */}
            {mode === 'register' && (
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Política de Acesso & Níveis de Usuário</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Somente a conta mestre <strong className="text-white">amaryelcc@gmail.com</strong> ou usuário <strong className="text-white">amaryelcc</strong> possui privilégios automáticos de <strong>Superadmin</strong>. Novos usuários cadastrados iniciam como <strong>Operador</strong> e podem ser promovidos ou liberados pelo Superadmin dentro do sistema.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'register' ? 'Concluir Cadastro' : 'Entrar no Sistema'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

            {/* Footer actions / SQL modal link */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="text-[11px] text-slate-500">
                Acesso seguro com criptografia
              </span>
              <button
                type="button"
                onClick={() => setShowSqlModal(true)}
                className="hover:text-blue-400 text-slate-400 text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Database className="w-3 h-3 text-blue-400" />
                <span>Script SQL Supabase</span>
              </button>
            </div>
          </div>
        </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 relative z-10">
        CestUP © 2026 — Gestão Estruturada de Cestas Básicas & Vendas Recorrentes
      </footer>

      {/* Supabase SQL Schema Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">Script SQL para o Supabase</h3>
                  <p className="text-[11px] text-slate-400">
                    Copie e execute no <strong>SQL Editor</strong> do painel Supabase
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-emerald-400 bg-slate-950">
              <pre className="whitespace-pre-wrap">{SUPABASE_SQL_SCHEMA}</pre>
            </div>

            <div className="p-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-900">
              <span className="text-xs text-slate-400">
                Tabelas com RLS, validação de status de usuários e Superadmin amaryelcc.
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedSql ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? 'Copiado para Área de Transferência!' : 'Copiar Script SQL'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
