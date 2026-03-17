import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  Copy,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  canAddActiveUser,
  createEmptyLicenseDatabase,
  getActiveUserCount,
  hasSeatOverage,
  LicenseStatus,
  LicenseUser,
} from '../services/licenseData';
import {
  addLicenseUser,
  createLicenseRecord,
  cycleLicenseStatus,
  deleteLicenseRecord,
  loadLicenseDatabase,
  regenerateLicenseRecord,
  renewLicenseRecord,
  updateLicenseUser,
} from '../services/licenseGateway';

const emptyForm = {
  companyName: '',
  document: '',
  contactName: '',
  contactEmail: '',
  phone: '',
  systemName: 'Marmoraria Online',
  planName: 'Professional',
  seats: '5',
  expiresAt: '',
  notes: '',
  status: 'Ativa' as LicenseStatus,
};

const statusColors: Record<LicenseStatus, string> = {
  Ativa: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Expirada: 'bg-red-50 text-red-700 border-red-200',
  Suspensa: 'bg-amber-50 text-amber-700 border-amber-200',
  Teste: 'bg-sky-50 text-sky-700 border-sky-200',
};

const SummaryCard = ({ label, value, helper }: { label: string; value: string; helper: string }) => (
  <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
    <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</p>
    <p className="mt-2 text-sm text-slate-500">{helper}</p>
  </div>
);

export const LicensePanel: React.FC = () => {
  const [database, setDatabase] = useState(() => createEmptyLicenseDatabase());
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState('');
  const [validationKey, setValidationKey] = useState('');
  const [flashMessage, setFlashMessage] = useState('');

  useEffect(() => {
    loadLicenseDatabase().then(setDatabase).catch(() => setDatabase(createEmptyLicenseDatabase()));
  }, []);

  useEffect(() => {
    if (!flashMessage) return;
    const timer = window.setTimeout(() => setFlashMessage(''), 2500);
    return () => window.clearTimeout(timer);
  }, [flashMessage]);

  const filteredLicenses = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return database.licenses;
    return database.licenses.filter((license) =>
      [license.companyName, license.contactName, license.licenseKey, license.document, license.contactEmail]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [database.licenses, query]);

  const validationResult = useMemo(
    () => database.licenses.find((license) => license.licenseKey.toLowerCase() === validationKey.trim().toLowerCase()),
    [database.licenses, validationKey]
  );

  const activeCount = database.licenses.filter((license) => license.status === 'Ativa').length;
  const testCount = database.licenses.filter((license) => license.status === 'Teste').length;
  const suspendedCount = database.licenses.filter((license) => license.status === 'Suspensa').length;
  const totalSeats = database.licenses.reduce((acc, license) => acc + license.seats, 0);
  const overLimitCount = database.licenses.filter((license) => hasSeatOverage(license)).length;

  const notify = (message: string) => setFlashMessage(message);

  const createLicense = async () => {
    const seats = Number(form.seats);
    if (!form.companyName.trim() || !form.contactName.trim() || !form.contactEmail.trim()) {
      return notify('Preencha empresa, contato e e-mail antes de gerar a licenca.');
    }

    const nextDatabase = await createLicenseRecord({
      companyName: form.companyName.trim(),
      document: form.document.trim(),
      contactName: form.contactName.trim(),
      contactEmail: form.contactEmail.trim(),
      phone: form.phone.trim(),
      systemName: form.systemName.trim(),
      planName: form.planName.trim(),
      seats: Number.isFinite(seats) ? Math.max(1, seats) : 1,
      expiresAt: form.expiresAt || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      notes: form.notes.trim(),
      status: form.status,
    });
    setDatabase(nextDatabase);
    setForm(emptyForm);
    notify('Licenca gerada com sucesso.');
  };

  const regenerateLicense = async (licenseId: string) => {
    setDatabase(await regenerateLicenseRecord(licenseId));
    notify('Chave de licenca regenerada.');
  };

  const copyLicense = async (licenseKey: string) => {
    try {
      await navigator.clipboard.writeText(licenseKey);
      notify('Chave copiada.');
    } catch {
      notify('Nao foi possivel copiar automaticamente.');
    }
  };

  const cycleStatus = async (licenseId: string) => {
    setDatabase(await cycleLicenseStatus(licenseId));
    notify('Status da licenca atualizado.');
  };

  const renewLicense = async (licenseId: string, months: number) => {
    setDatabase(await renewLicenseRecord(licenseId, months));
    notify(`Licenca renovada por ${months} ${months === 1 ? 'mes' : 'meses'}.`);
  };

  const addUserToLicense = async (licenseId: string) => {
    const currentLicense = database.licenses.find((license) => license.id === licenseId);
    if (currentLicense && !canAddActiveUser(currentLicense)) {
      notify('Novo usuario foi criado como inativo porque a empresa ja atingiu o limite do plano.');
    }
    setDatabase(await addLicenseUser(licenseId));
    notify('Usuario adicionado a licenca.');
  };

  const toggleUserStatus = async (licenseId: string, userId: string) => {
    const license = database.licenses.find((item) => item.id === licenseId);
    const user = license?.users.find((item) => item.id === userId);
    if (!license || !user) return;

    setDatabase(await updateLicenseUser(licenseId, userId, { status: user.status === 'Ativo' ? 'Inativo' : 'Ativo' }));
    notify('Status do usuario atualizado.');
  };

  const changeUserRole = async (licenseId: string, userId: string, role: LicenseUser['role']) => {
    setDatabase(await updateLicenseUser(licenseId, userId, { role }));
    notify('Perfil do usuario atualizado.');
  };

  const deleteLicense = async (licenseId: string, companyName: string) => {
    const confirmed = window.confirm(`Excluir a empresa "${companyName}" e toda a licenca dela?`);
    if (!confirmed) return;

    setDatabase(await deleteLicenseRecord(licenseId));
    notify('Empresa excluida do painel de licencas.');
  };

  return (
    <div className="h-screen bg-slate-100 text-slate-900 flex flex-col overflow-hidden">
      <header className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 font-black">Painel de Licencas</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Gestao de acessos do sistema</h1>
          <p className="mt-2 text-sm text-slate-500">Gere chaves, controle assentos, usuarios e renovacoes de cada empresa que compra o sistema.</p>
        </div>
        {flashMessage && <div className="px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-700 text-sm font-bold">{flashMessage}</div>}
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-8">
        <section className="grid grid-cols-5 gap-5">
          <SummaryCard label="Licencas ativas" value={`${activeCount}`} helper="Clientes liberados para uso do sistema" />
          <SummaryCard label="Em teste" value={`${testCount}`} helper="Avaliacoes comerciais em andamento" />
          <SummaryCard label="Suspensas" value={`${suspendedCount}`} helper="Clientes bloqueados ou pendentes" />
          <SummaryCard label="Assentos" value={`${totalSeats}`} helper="Total de usuarios licenciados" />
          <SummaryCard label="Acima do plano" value={`${overLimitCount}`} helper="Empresas com uso acima do limite de assentos" />
        </section>

        <section className="grid grid-cols-[380px_1fr_360px] gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">Nova licenca</p>
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Empresa" value={form.companyName} onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))} />
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="CNPJ / documento" value={form.document} onChange={(e) => setForm((prev) => ({ ...prev, document: e.target.value }))} />
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Contato" value={form.contactName} onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))} />
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="E-mail" value={form.contactEmail} onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))} />
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Telefone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
            <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Sistema" value={form.systemName} onChange={(e) => setForm((prev) => ({ ...prev, systemName: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <input className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Plano" value={form.planName} onChange={(e) => setForm((prev) => ({ ...prev, planName: e.target.value }))} />
              <input className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Assentos" value={form.seats} onChange={(e) => setForm((prev) => ({ ...prev, seats: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="rounded-2xl border border-slate-200 px-4 py-3" type="date" value={form.expiresAt} onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))} />
              <select className="rounded-2xl border border-slate-200 px-4 py-3" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as LicenseStatus }))}>
                {(['Ativa', 'Teste', 'Suspensa', 'Expirada'] as LicenseStatus[]).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <textarea className="w-full rounded-2xl border border-slate-200 px-4 py-3 min-h-[96px]" placeholder="Observacoes comerciais, implantacao, suporte..." value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
            <button onClick={createLicense} className="w-full rounded-2xl bg-slate-900 text-white font-bold py-3">Gerar licenca</button>
          </div>

          <div className="space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <Search size={18} className="text-slate-400" />
                <input
                  className="w-full outline-none"
                  placeholder="Buscar por empresa, contato, e-mail ou chave..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredLicenses.map((license) => {
                const activeUsers = getActiveUserCount(license);
                const overLimit = hasSeatOverage(license);

                return (
                  <div key={license.id} className="bg-white rounded-3xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-black uppercase text-slate-400">{license.systemName}</p>
                        <h3 className="mt-1 text-2xl font-black">{license.companyName}</h3>
                        <p className="text-sm text-slate-500">{license.contactName} · {license.contactEmail}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full border text-xs font-bold ${statusColors[license.status]}`}>{license.status}</span>
                    </div>

                    {overLimit && (
                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                        Esta empresa ultrapassou o limite de assentos. Novos acessos ficam bloqueados ate regularizar os usuarios ativos.
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">Chave</p>
                        <p className="mt-2 font-black tracking-wide">{license.licenseKey}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">Plano</p>
                        <p className="mt-2 font-black">{license.planName}</p>
                        <p className={`text-sm ${overLimit ? 'text-red-600 font-bold' : 'text-slate-500'}`}>{activeUsers}/{license.seats} usuarios ativos</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                      <button onClick={() => copyLicense(license.licenseKey)} className="px-4 py-3 rounded-2xl bg-slate-100 font-bold flex items-center gap-2">
                        <Copy size={16} /> Copiar chave
                      </button>
                      <button onClick={() => regenerateLicense(license.id)} className="px-4 py-3 rounded-2xl bg-slate-100 font-bold flex items-center gap-2">
                        <RefreshCw size={16} /> Regenerar
                      </button>
                      <button onClick={() => cycleStatus(license.id)} className="px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold flex items-center gap-2">
                        <ShieldCheck size={16} /> Alternar status
                      </button>
                      <button onClick={() => renewLicense(license.id, 1)} className="px-4 py-3 rounded-2xl bg-slate-100 font-bold flex items-center gap-2">
                        <CalendarClock size={16} /> Renovar 1 mes
                      </button>
                      <button onClick={() => renewLicense(license.id, 12)} className="px-4 py-3 rounded-2xl bg-slate-100 font-bold flex items-center gap-2">
                        <CalendarClock size={16} /> Renovar 12 meses
                      </button>
                      <button onClick={() => addUserToLicense(license.id)} className="px-4 py-3 rounded-2xl bg-slate-100 font-bold flex items-center gap-2">
                        <UserPlus size={16} /> Adicionar usuario
                      </button>
                      <button onClick={() => deleteLicense(license.id, license.companyName)} className="px-4 py-3 rounded-2xl bg-red-50 text-red-700 font-bold flex items-center gap-2">
                        <Trash2 size={16} /> Excluir empresa
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-3 text-xs text-slate-500">
                      <div><span className="block text-slate-400 uppercase font-black">Documento</span>{license.document || '-'}</div>
                      <div><span className="block text-slate-400 uppercase font-black">Telefone</span>{license.phone || '-'}</div>
                      <div><span className="block text-slate-400 uppercase font-black">Emissao</span>{license.issuedAt}</div>
                      <div><span className="block text-slate-400 uppercase font-black">Validade</span>{license.expiresAt}</div>
                    </div>

                    {license.notes && (
                      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        {license.notes}
                      </div>
                    )}

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-3xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">Usuarios da empresa</p>
                          <span className="text-xs font-bold text-slate-500">{activeUsers}/{license.seats}</span>
                        </div>
                        <div className="mt-3 space-y-3">
                          {license.users.map((user) => (
                            <div key={user.id} className="rounded-2xl bg-slate-50 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-bold text-slate-900">{user.name}</p>
                                  <p className="text-sm text-slate-500">{user.email || 'E-mail nao informado'}</p>
                                </div>
                                <button
                                  onClick={() => toggleUserStatus(license.id, user.id)}
                                  className={`px-3 py-1 rounded-full text-xs font-bold ${user.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
                                >
                                  {user.status}
                                </button>
                              </div>
                              <div className="mt-3 flex items-center justify-between gap-3">
                                <select
                                  value={user.role}
                                  onChange={(event) => changeUserRole(license.id, user.id, event.target.value as LicenseUser['role'])}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                >
                                  {(['Admin', 'Operador', 'Vendedor'] as LicenseUser['role'][]).map((role) => (
                                    <option key={role} value={role}>{role}</option>
                                  ))}
                                </select>
                                <p className="text-xs text-slate-400">
                                  Ultimo acesso {new Date(user.lastAccessAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                          ))}
                          {license.users.length === 0 && (
                            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                              Nenhum usuario vinculado a esta empresa.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">Historico de renovacoes</p>
                          <button
                            onClick={() => renewLicense(license.id, 1)}
                            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 flex items-center gap-2"
                          >
                            <Plus size={14} /> Registrar
                          </button>
                        </div>
                        <div className="mt-3 space-y-3">
                          {license.renewalHistory.map((entry) => (
                            <div key={entry.id} className="rounded-2xl bg-slate-50 p-3">
                              <p className="font-bold text-slate-900">{entry.monthsAdded} {entry.monthsAdded === 1 ? 'mes' : 'meses'} adicionados</p>
                              <p className="text-sm text-slate-500">{entry.previousExpiresAt} {'->'} {entry.nextExpiresAt}</p>
                              <p className="mt-1 text-xs text-slate-400">Registrado em {entry.renewedAt}</p>
                              <p className="mt-2 text-sm text-slate-600">{entry.note}</p>
                            </div>
                          ))}
                          {license.renewalHistory.length === 0 && (
                            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                              Nenhuma renovacao registrada ainda.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200 p-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">Validar licenca</p>
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <KeyRound size={18} className="text-slate-400" />
                <input
                  className="w-full outline-none"
                  placeholder="Cole a chave da licenca"
                  value={validationKey}
                  onChange={(e) => setValidationKey(e.target.value)}
                />
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                {validationResult ? (
                  <>
                    <div className="flex items-center gap-2 text-emerald-700 font-bold">
                      <BadgeCheck size={18} /> Licenca encontrada
                    </div>
                    <h3 className="mt-3 text-xl font-black">{validationResult.companyName}</h3>
                    <p className="text-sm text-slate-500">{validationResult.contactName}</p>
                    <div className="mt-4 space-y-2 text-sm">
                      <p><span className="font-black">Status:</span> {validationResult.status}</p>
                      <p><span className="font-black">Plano:</span> {validationResult.planName}</p>
                      <p><span className="font-black">Validade:</span> {validationResult.expiresAt}</p>
                      <p><span className="font-black">Assentos:</span> {getActiveUserCount(validationResult)}/{validationResult.seats}</p>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-500">
                    Digite uma chave para verificar se a empresa possui acesso valido ao sistema.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">Visao operacional</p>
              <div className="rounded-2xl bg-slate-50 p-4 flex items-center gap-3">
                <Building2 size={18} className="text-indigo-600" />
                <div>
                  <p className="font-black">{database.licenses.length} empresas licenciadas</p>
                  <p className="text-sm text-slate-500">Base atual de clientes com acesso ao sistema</p>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 flex items-center gap-3">
                <Users size={18} className="text-indigo-600" />
                <div>
                  <p className="font-black">{totalSeats} assentos vendidos</p>
                  <p className="text-sm text-slate-500">Capacidade total liberada entre todas as empresas</p>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 flex items-center gap-3">
                <ShieldCheck size={18} className="text-indigo-600" />
                <div>
                  <p className="font-black">{activeCount} licencas em operacao</p>
                  <p className="text-sm text-slate-500">Clientes aptos a usar o sistema da marmoraria</p>
                </div>
              </div>
              <div className="rounded-2xl bg-red-50 p-4 flex items-center gap-3">
                <BadgeCheck size={18} className="text-red-600" />
                <div>
                  <p className="font-black">{overLimitCount} licencas acima do plano</p>
                  <p className="text-sm text-slate-500">Acessos novos ficam bloqueados enquanto o excesso nao for corrigido</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
