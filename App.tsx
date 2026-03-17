import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, KeyRound, LayoutGrid, LogOut, ShieldCheck, UserCog } from 'lucide-react';
import { LoginScreen } from './components/LoginScreen';
import { LicenseAccessGate } from './components/LicenseAccessGate';
import { clearValidatedSession, refreshValidatedSession } from './services/licenseGateway';
import {
  LicenseSession,
} from './services/licenseData';

const MarmorariaSystem = lazy(() =>
  import('./components/MarmorariaSystem').then((module) => ({ default: module.MarmorariaSystem }))
);

const LicensePanel = lazy(() =>
  import('./components/LicensePanel').then((module) => ({ default: module.LicensePanel }))
);

type AppMode = 'hub' | 'marmoraria' | 'licenses';
type UserRole = 'admin' | 'operator';

interface AuthSession {
  username: string;
  role: UserRole;
}

const AUTH_STORAGE_KEY = 'marmoraria-auth-session-v1';

const HubCard = ({
  title,
  description,
  action,
  icon: Icon,
  onClick,
  disabled = false,
}: {
  title: string;
  description: string;
  action: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`text-left rounded-[32px] border p-8 shadow-sm transition-all ${
      disabled
        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
        : 'bg-white border-slate-200 hover:shadow-xl hover:-translate-y-1'
    }`}
  >
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${disabled ? 'bg-slate-200' : 'bg-indigo-50'}`}>
      <Icon size={26} className={disabled ? 'text-slate-400' : 'text-indigo-600'} />
    </div>
    <h2 className="mt-6 text-2xl font-black tracking-tight">{title}</h2>
    <p className="mt-3 leading-relaxed">{description}</p>
    <p className={`mt-6 text-sm font-black uppercase tracking-[0.2em] ${disabled ? 'text-slate-400' : 'text-indigo-600'}`}>{action}</p>
  </button>
);

const App: React.FC = () => {
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  });
  const [mode, setMode] = useState<AppMode>('hub');
  const [licenseSession, setLicenseSession] = useState<LicenseSession | null>(null);

  useEffect(() => {
    const syncLicenseSession = () => {
      refreshValidatedSession().then(setLicenseSession).catch(() => setLicenseSession(null));
    };

    syncLicenseSession();
    window.addEventListener('storage', syncLicenseSession);
    window.addEventListener('focus', syncLicenseSession);

    return () => {
      window.removeEventListener('storage', syncLicenseSession);
      window.removeEventListener('focus', syncLicenseSession);
    };
  }, []);

  useEffect(() => {
    try {
      if (authSession) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authSession));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      // Ignore storage persistence issues for auth session.
    }
  }, [authSession]);

  useEffect(() => {
    if (authSession?.role === 'operator' && licenseSession && mode === 'hub') {
      setMode('marmoraria');
    }
  }, [authSession, licenseSession, mode]);

  const isAdmin = authSession?.role === 'admin';
  const licenseSummary = useMemo(() => {
    if (!licenseSession) return null;
    return `${licenseSession.companyName} · validade ate ${new Date(licenseSession.expiresAt).toLocaleDateString('pt-BR')}`;
  }, [licenseSession]);

  const handleAuthorized = (session: LicenseSession) => {
    setLicenseSession(session);
    setMode('marmoraria');
  };

  const handleLogin = (session: AuthSession) => {
    setAuthSession(session);

    if (session.role === 'operator' && licenseSession) {
      setMode('marmoraria');
      return;
    }

    setMode('hub');
  };

  const clearLicenseSession = () => {
    clearValidatedSession();
    setLicenseSession(null);
    if (mode === 'marmoraria') {
      setMode('hub');
    }
  };

  const clearUserSession = () => {
    setAuthSession(null);
    setMode('hub');
  };

  if (!authSession) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="px-6 py-4 rounded-3xl bg-white border border-slate-200 shadow-sm text-slate-700 font-bold">
            Carregando sistema...
          </div>
        </div>
      }
    >
      {mode === 'hub' && (
        <div className="min-h-screen bg-slate-100 px-8 py-10">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10 flex items-start justify-between gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400 font-black">Central de sistemas</p>
                <h1 className="mt-3 text-5xl font-black tracking-tight text-slate-900">Escolha o app que deseja abrir</h1>
                <p className="mt-4 text-lg text-slate-500 max-w-3xl">
                  Use o sistema da marmoraria para operacao comercial e produtiva, ou abra o Painel de Licencas para controlar quais empresas podem acessar a plataforma.
                </p>
              </div>

              <div className="bg-white rounded-[28px] border border-slate-200 px-6 py-5 min-w-[290px] shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400 font-black">Sessao atual</p>
                <p className="mt-3 text-xl font-black text-slate-900">{authSession.username}</p>
                <p className="text-sm text-slate-500">
                  Perfil {isAdmin ? 'administrador' : 'operador'}
                </p>
                <div className="mt-4 grid gap-3">
                  <button
                    onClick={clearUserSession}
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 flex items-center justify-center gap-2"
                  >
                    <UserCog size={16} /> Trocar usuario
                  </button>
                  <button
                    onClick={clearLicenseSession}
                    disabled={!licenseSession}
                    className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LogOut size={16} /> Encerrar licenca ativa
                  </button>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <HubCard
                title="Marmoraria Online"
                description="Gestao de clientes, estoque, orcamentos, producao e studio 3D para corte de chapas."
                action="Abrir sistema da marmoraria"
                icon={LayoutGrid}
                onClick={() => setMode('marmoraria')}
              />
              <HubCard
                title="Painel de Licencas"
                description={isAdmin ? 'Gere licencas de acesso, controle validade, status, assentos e acompanhe empresas que compraram o sistema.' : 'Disponivel apenas para administradores responsáveis pela distribuicao e suporte do sistema.'}
                action={isAdmin ? 'Abrir painel de licencas' : 'Acesso restrito ao administrador'}
                icon={KeyRound}
                onClick={() => setMode('licenses')}
                disabled={!isAdmin}
              />
            </div>

            <div className="mt-8 bg-white rounded-[32px] border border-slate-200 p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <ShieldCheck size={24} className="text-emerald-600" />
              </div>
              <div>
                <p className="font-black text-slate-900">Fluxo sugerido</p>
                <p className="text-slate-500">
                  Primeiro gere a licenca da empresa no Painel de Licencas. Depois valide essa licenca para liberar o sistema principal da marmoraria.
                </p>
              </div>
            </div>

            <div className={`mt-6 rounded-[32px] border p-6 flex items-center gap-4 ${licenseSession ? 'bg-white border-slate-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${licenseSession ? 'bg-indigo-50' : 'bg-amber-100'}`}>
                {licenseSession ? <ShieldCheck size={24} className="text-indigo-600" /> : <AlertTriangle size={24} className="text-amber-600" />}
              </div>
              <div>
                <p className="font-black text-slate-900">{licenseSession ? 'Licenca validada nesta sessao' : 'Nenhuma licenca validada'}</p>
                <p className="text-slate-500">
                  {licenseSummary || 'Acesse o sistema da marmoraria e valide uma licenca antes de operar o studio e os modulos comerciais.'}
                </p>
              </div>
              {licenseSession && (
                <button
                  onClick={clearLicenseSession}
                  className="ml-auto rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700"
                >
                  Trocar licenca
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {mode === 'marmoraria' && (
        licenseSession ? (
          <MarmorariaSystem licenseSession={licenseSession} onLogout={clearUserSession} />
        ) : (
          <LicenseAccessGate onAuthorized={handleAuthorized} />
        )
      )}

      {mode === 'licenses' && isAdmin && <LicensePanel />}

      {mode !== 'hub' && (
        <button
          onClick={() => setMode('hub')}
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white font-bold shadow-xl"
        >
          Voltar para central
        </button>
      )}
    </Suspense>
  );
};

export default App;
