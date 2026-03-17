import React, { useMemo, useState } from 'react';
import { AlertCircle, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { validateLicenseAccess } from '../services/licenseGateway';
import { LicenseSession, normalizeLicenseDatabase } from '../services/licenseData';

const STORAGE_KEY = 'marmoraria-license-db-v1';

interface LicenseAccessGateProps {
  onAuthorized: (session: LicenseSession) => void;
}

const readLicenseDatabase = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeLicenseDatabase(JSON.parse(raw)) : normalizeLicenseDatabase(null);
  } catch {
    return normalizeLicenseDatabase(null);
  }
};

export const LicenseAccessGate: React.FC<LicenseAccessGateProps> = ({ onAuthorized }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');

  const database = useMemo(() => readLicenseDatabase(), []);

  const handleValidate = async () => {
    const normalizedKey = licenseKey.trim();
    const normalizedCompany = companyName.trim();

    if (!normalizedKey || !normalizedCompany) {
      setError('Informe a empresa e a chave de licenca.');
      return;
    }

    const existsLocally = database.licenses.some(
      (license) =>
        license.companyName.trim().toLowerCase() === normalizedCompany.toLowerCase() &&
        license.licenseKey.trim().toLowerCase() === normalizedKey.toLowerCase()
    );

    if (!existsLocally) {
      const remoteSession = await validateLicenseAccess(normalizedCompany, normalizedKey);
      if (remoteSession) {
        setError('');
        onAuthorized(remoteSession);
        return;
      }

      setError('Licenca nao encontrada para essa empresa.');
      return;
    }

    const session = await validateLicenseAccess(normalizedCompany, normalizedKey);
    if (!session) {
      setError('A licenca foi encontrada, mas esta expirada, bloqueada ou acima do limite de assentos.');
      return;
    }

    setError('');
    onAuthorized(session);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid md:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="bg-slate-950 text-white rounded-[36px] p-10 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center">
            <ShieldCheck size={32} className="text-indigo-300" />
          </div>
          <p className="mt-8 text-[11px] uppercase tracking-[0.35em] text-slate-500 font-black">Licenciamento</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight">Acesso protegido por licenca</h1>
          <p className="mt-4 text-lg text-slate-400 leading-relaxed">
            O sistema da marmoraria so pode ser utilizado por empresas com licenca ativa cadastrada no Painel de Licencas.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
              <p className="font-black">Fluxo recomendado</p>
              <p className="mt-2 text-slate-400">1. Cadastre a empresa no Painel de Licencas. 2. Gere a chave. 3. Informe empresa e licenca aqui para liberar o sistema.</p>
            </div>
            <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
              <p className="font-black">Status aceitos</p>
              <p className="mt-2 text-slate-400">Licencas em status Ativa ou Teste, dentro do prazo de validade.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[36px] border border-slate-200 p-8 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <LockKeyhole size={26} className="text-indigo-600" />
          </div>
          <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-900">Validar licenca</h2>
          <p className="mt-3 text-slate-500">
            Digite a empresa e a chave gerada no Painel de Licencas para liberar o uso do sistema da marmoraria.
          </p>

          <div className="mt-8 space-y-4">
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
              placeholder="Nome da empresa"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
            />
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-indigo-500">
              <KeyRound size={18} className="text-slate-400" />
              <input
                className="w-full outline-none"
                placeholder="Chave da licenca"
                value={licenseKey}
                onChange={(event) => setLicenseKey(event.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm font-medium flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              onClick={handleValidate}
              className="w-full rounded-2xl bg-slate-900 text-white font-bold py-3"
            >
              Liberar acesso ao sistema
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
