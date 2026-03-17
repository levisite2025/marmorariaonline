import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ClipboardList,
  FileText,
  LayoutDashboard,
  PackagePlus,
  Printer,
  Save,
  LogOut,
  UserPlus,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { PrintLayout } from './PrintLayout';
import { BudgetState, Customer, MaterialType, SlabState, TEXTURE_OPTIONS } from '../types';
import { LicenseSession } from '../services/licenseData';
import {
  calculateQuoteTotal,
  createDefaultSlab,
  createEmptyBudget,
  createEmptyCustomer,
  CustomerRecord,
  InventorySlab,
  MarmorariaDatabase,
  ProductionOrder,
  ProductionStatus,
  QuoteRecord,
} from '../services/systemData';
import {
  advanceProductionOrderApi,
  createCustomerRecordApi,
  createInventorySlabApi,
  loadSystemDatabase,
  saveQuoteRecordApi,
  sendQuoteToProductionApi,
} from '../services/systemGateway';

const StudioWorkspace = lazy(() =>
  import('./StudioWorkspace').then((module) => ({ default: module.StudioWorkspace }))
);

type ModuleId = 'dashboard' | 'customers' | 'inventory' | 'quotes' | 'production' | 'studio';

const moduleLabels: Record<ModuleId, string> = {
  dashboard: 'Dashboard',
  customers: 'Clientes',
  inventory: 'Estoque',
  quotes: 'Orcamentos',
  production: 'Producao',
  studio: 'Studio',
};

const productionFlow: ProductionStatus[] = ['Novo', 'Medicao', 'Corte', 'Acabamento', 'Instalacao', 'Concluido'];

const emptyCustomerForm = {
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
  city: '',
  paymentMethod: 'Pix',
};

const emptyInventoryForm = {
  code: '',
  material: MaterialType.GRANITE,
  textureId: 'saogabriel',
  width: '280',
  height: '160',
  thickness: '2',
  supplier: '',
  location: '',
  cost: '0',
};

const StatCard = ({ label, value, helper }: { label: string; value: string; helper: string }) => (
  <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
    <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</p>
    <p className="mt-2 text-sm text-slate-500">{helper}</p>
  </div>
);

export const MarmorariaSystem: React.FC<{ licenseSession: LicenseSession; onLogout: () => void }> = ({ licenseSession, onLogout }) => {
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [database, setDatabase] = useState<MarmorariaDatabase>({ customers: [], inventory: [], quotes: [], production: [] });
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const [inventoryForm, setInventoryForm] = useState(emptyInventoryForm);
  const [workspaceCustomer, setWorkspaceCustomer] = useState<Customer>(createEmptyCustomer());
  const [workspaceBudget, setWorkspaceBudget] = useState<BudgetState>(createEmptyBudget());
  const [workspaceSlab, setWorkspaceSlab] = useState<SlabState>(createDefaultSlab());
  const [showPrintView, setShowPrintView] = useState(false);
  const [flashMessage, setFlashMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    loadSystemDatabase()
      .then(setDatabase)
      .finally(() => setIsSyncing(false));
  }, []);

  useEffect(() => {
    if (!flashMessage) return;
    const timer = window.setTimeout(() => setFlashMessage(''), 2500);
    return () => window.clearTimeout(timer);
  }, [flashMessage]);

  const totalRevenue = useMemo(() => database.quotes.reduce((acc, quote) => acc + quote.total, 0), [database.quotes]);
  const totalInventoryArea = useMemo(
    () => database.inventory.reduce((acc, slab) => acc + (slab.width * slab.height) / 10000, 0),
    [database.inventory]
  );
  const workspaceTotal = useMemo(() => calculateQuoteTotal(workspaceSlab, workspaceBudget), [workspaceBudget, workspaceSlab]);
  const licenseDaysRemaining = useMemo(() => {
    const expiry = new Date(licenseSession.expiresAt);
    if (Number.isNaN(expiry.getTime())) return 0;
    expiry.setHours(23, 59, 59, 999);
    return Math.ceil((expiry.getTime() - Date.now()) / 86400000);
  }, [licenseSession.expiresAt]);
  const shouldWarnLicense = licenseDaysRemaining <= 15;

  const notify = (message: string) => setFlashMessage(message);

  const createCustomerRecord = async () => {
    if (!customerForm.contactName.trim()) return notify('Informe pelo menos o nome do contato.');

    const record: CustomerRecord = {
      id: `cust-${Date.now()}`,
      companyName: customerForm.companyName.trim() || customerForm.contactName.trim(),
      contactName: customerForm.contactName.trim(),
      name: customerForm.contactName.trim(),
      phone: customerForm.phone.trim(),
      email: customerForm.email.trim(),
      address: {
        street: '',
        number: '',
        district: '',
        city: customerForm.city.trim(),
        zip: '',
      },
      paymentMethod: customerForm.paymentMethod,
      tags: [],
      lastContact: new Date().toISOString().slice(0, 10),
    };

    setDatabase(await createCustomerRecordApi(record));
    setCustomerForm(emptyCustomerForm);
    notify('Cliente cadastrado.');
  };

  const createInventorySlab = async () => {
    const width = Number(inventoryForm.width);
    const height = Number(inventoryForm.height);
    const thickness = Number(inventoryForm.thickness);
    const cost = Number(inventoryForm.cost);

    if (!inventoryForm.code.trim() || width <= 0 || height <= 0 || thickness <= 0) {
      return notify('Preencha codigo e medidas validas da chapa.');
    }

    const record: InventorySlab = {
      id: `slab-${Date.now()}`,
      code: inventoryForm.code.trim(),
      material: inventoryForm.material,
      textureId: inventoryForm.textureId,
      width,
      height,
      thickness,
      status: 'Disponivel',
      supplier: inventoryForm.supplier.trim(),
      location: inventoryForm.location.trim(),
      cost: Number.isFinite(cost) ? Math.max(0, cost) : 0,
    };

    setDatabase(await createInventorySlabApi(record));
    setInventoryForm(emptyInventoryForm);
    notify('Chapa adicionada ao estoque.');
  };

  const applyInventoryToWorkspace = (slabItem: InventorySlab) => {
    setWorkspaceSlab((prev) => ({
      ...prev,
      material: slabItem.material,
      activeTextureId: slabItem.textureId,
      dimensions: {
        ...prev.dimensions,
        width: slabItem.width,
        height: slabItem.height,
        thickness: slabItem.thickness,
      },
    }));
    setActiveModule('studio');
    notify(`Chapa ${slabItem.code} carregada no studio.`);
  };

  const loadCustomerIntoWorkspace = (customer: CustomerRecord) => {
    setWorkspaceCustomer({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      paymentMethod: customer.paymentMethod,
    });
    setWorkspaceBudget((prev) => ({ ...prev, projectName: `${customer.companyName} - novo projeto` }));
    setActiveModule('studio');
    notify(`Cliente ${customer.contactName} carregado no studio.`);
  };

  const saveWorkspaceAsQuote = async () => {
    if (!workspaceCustomer.name.trim()) return notify('Defina um cliente no studio antes de salvar o orcamento.');

    const matchingCustomer = database.customers.find(
      (customer) =>
        customer.name.toLowerCase() === workspaceCustomer.name.toLowerCase() ||
        customer.phone === workspaceCustomer.phone
    );

    const quote: QuoteRecord = {
      id: `quote-${Date.now()}`,
      title: workspaceBudget.projectName.trim() || 'Projeto sem titulo',
      customerId: matchingCustomer?.id || '',
      customerSnapshot: workspaceCustomer,
      budgetSnapshot: workspaceBudget,
      slabSnapshot: workspaceSlab,
      status: 'Rascunho',
      total: workspaceTotal,
      createdAt: new Date().toISOString(),
    };

    setDatabase(await saveQuoteRecordApi(quote));
    notify('Orcamento salvo no sistema.');
  };

  const loadQuoteIntoWorkspace = (quote: QuoteRecord) => {
    setWorkspaceCustomer(quote.customerSnapshot);
    setWorkspaceBudget(quote.budgetSnapshot);
    setWorkspaceSlab(quote.slabSnapshot);
    setActiveModule('studio');
    notify(`Orcamento "${quote.title}" carregado no studio.`);
  };

  const sendQuoteToProduction = async (quote: QuoteRecord) => {
    const alreadyExists = database.production.some((order) => order.quoteId === quote.id);
    if (alreadyExists) return notify('Esse orcamento ja esta na producao.');

    const order: ProductionOrder = {
      id: `prod-${Date.now()}`,
      quoteId: quote.id,
      customerName: quote.customerSnapshot.name,
      projectName: quote.title,
      status: 'Novo',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      assignedTo: 'Equipe de corte',
      notes: quote.budgetSnapshot.notes,
    };

    setDatabase(await sendQuoteToProductionApi(quote, order));
    notify('Orcamento enviado para producao.');
  };

  const advanceProduction = async (orderId: string) => {
    const nextDatabase = await advanceProductionOrderApi(orderId);
    const hasServerResult = nextDatabase.production.length > 0 || nextDatabase.quotes.length > 0 || nextDatabase.customers.length > 0 || nextDatabase.inventory.length > 0;
    if (hasServerResult) {
      setDatabase(nextDatabase);
      return;
    }

    setDatabase((prev) => ({
      ...prev,
      production: prev.production.map((order) => {
        if (order.id !== orderId) return order;
        const currentIndex = productionFlow.indexOf(order.status);
        const nextStatus = productionFlow[Math.min(currentIndex + 1, productionFlow.length - 1)];
        return { ...order, status: nextStatus };
      }),
    }));
  };

  const resetWorkspace = () => {
    setWorkspaceCustomer(createEmptyCustomer());
    setWorkspaceBudget(createEmptyBudget());
    setWorkspaceSlab(createDefaultSlab());
    notify('Studio resetado para um novo projeto.');
  };

  if (showPrintView) {
    return <PrintLayout slab={workspaceSlab} customer={workspaceCustomer} budget={workspaceBudget} onBack={() => setShowPrintView(false)} />;
  }

  return (
    <div className="h-screen bg-slate-100 text-slate-900 flex overflow-hidden">
      <aside className="w-[260px] bg-slate-950 text-white p-6 flex flex-col gap-6 overflow-y-auto">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 font-black">Marmoraria Online</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">Sistema operacional</h1>
          <p className="mt-2 text-sm text-slate-400">Gestao comercial, producao e studio 3D em um fluxo so.</p>
        </div>

        <div className="rounded-3xl bg-slate-900 p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck size={18} className="text-emerald-300" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-black">Empresa licenciada</p>
              <p className="text-sm font-black text-white">{licenseSession.companyName}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">Chave {licenseSession.licenseKey}</p>
          <p className="text-xs text-slate-400">
            Status {licenseSession.status} ate {new Date(licenseSession.expiresAt).toLocaleDateString('pt-BR')}
          </p>
        </div>

        <nav className="space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard },
            { id: 'customers', icon: Users },
            { id: 'inventory', icon: Boxes },
            { id: 'quotes', icon: FileText },
            { id: 'production', icon: ClipboardList },
            { id: 'studio', icon: BarChart3 },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id as ModuleId)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors ${
                activeModule === item.id ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              <item.icon size={18} />
              <span className="font-bold">{moduleLabels[item.id as ModuleId]}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-3xl bg-slate-900 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-black">Studio atual</p>
          <p className="mt-2 text-lg font-black">{workspaceBudget.projectName}</p>
          <p className="text-sm text-slate-400">{workspaceCustomer.name || 'Cliente nao definido'}</p>
          <p className="mt-3 text-xl font-black text-indigo-400">
            {workspaceTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">Modulo ativo</p>
            <h2 className="text-3xl font-black tracking-tight">{moduleLabels[activeModule]}</h2>
          </div>
          <div className="flex items-center gap-3">
            {isSyncing && <div className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-500 text-sm font-bold">Sincronizando base...</div>}
            {flashMessage && <div className="px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-700 text-sm font-bold">{flashMessage}</div>}
            <button onClick={onLogout} className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold flex items-center gap-2">
              <LogOut size={16} /> Sair
            </button>
            <button onClick={saveWorkspaceAsQuote} className="px-4 py-3 rounded-2xl bg-slate-900 text-white font-bold flex items-center gap-2">
              <Save size={16} /> Salvar orcamento
            </button>
            <button onClick={() => setShowPrintView(true)} className="px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold flex items-center gap-2">
              <Printer size={16} /> Imprimir
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {shouldWarnLicense && (
            <div className={`rounded-3xl border px-5 py-4 flex items-center gap-4 ${licenseDaysRemaining <= 5 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${licenseDaysRemaining <= 5 ? 'bg-red-100' : 'bg-amber-100'}`}>
                <AlertTriangle size={20} className={licenseDaysRemaining <= 5 ? 'text-red-600' : 'text-amber-600'} />
              </div>
              <div>
                <p className="font-black text-slate-900">
                  {licenseDaysRemaining <= 0 ? 'Licenca vencendo ou vencida' : `Licenca proxima do vencimento: ${licenseDaysRemaining} dia(s) restantes`}
                </p>
                <p className="text-sm text-slate-500">
                  Renove a licenca de {licenseSession.companyName} no Painel de Licencas para evitar bloqueio operacional.
                </p>
              </div>
            </div>
          )}

          {activeModule === 'dashboard' && (
            <>
              <section className="grid grid-cols-4 gap-5">
                <StatCard label="Clientes" value={`${database.customers.length}`} helper="Base ativa de relacionamento" />
                <StatCard label="Chapas" value={`${database.inventory.length}`} helper={`${totalInventoryArea.toFixed(2)} m² em estoque`} />
                <StatCard label="Orcamentos" value={`${database.quotes.length}`} helper="Propostas registradas no sistema" />
                <StatCard label="Faturamento" value={totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} helper="Valor acumulado dos orcamentos" />
              </section>

              <section className="grid grid-cols-3 gap-5">
                <div className="bg-white rounded-3xl border border-slate-200 p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">Acoes rapidas</p>
                  <div className="mt-4 space-y-3">
                    <button onClick={() => setActiveModule('customers')} className="w-full px-4 py-3 rounded-2xl bg-slate-100 font-bold flex items-center gap-2">
                      <UserPlus size={16} /> Cadastrar cliente
                    </button>
                    <button onClick={() => setActiveModule('inventory')} className="w-full px-4 py-3 rounded-2xl bg-slate-100 font-bold flex items-center gap-2">
                      <PackagePlus size={16} /> Adicionar chapa
                    </button>
                    <button onClick={() => setActiveModule('studio')} className="w-full px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold">
                      Abrir studio de cortes
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">Ultimos clientes</p>
                  <div className="mt-4 space-y-3">
                    {database.customers.slice(0, 4).map((customer) => (
                      <button key={customer.id} onClick={() => loadCustomerIntoWorkspace(customer)} className="w-full text-left px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
                        <p className="font-bold">{customer.contactName}</p>
                        <p className="text-sm text-slate-500">{customer.companyName}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">Fila de producao</p>
                  <div className="mt-4 space-y-3">
                    {database.production.slice(0, 4).map((order) => (
                      <div key={order.id} className="px-4 py-3 rounded-2xl bg-slate-50">
                        <p className="font-bold">{order.projectName}</p>
                        <p className="text-sm text-slate-500">{order.customerName}</p>
                        <p className="mt-1 text-xs font-bold uppercase text-indigo-600">{order.status}</p>
                      </div>
                    ))}
                    {database.production.length === 0 && <p className="text-sm text-slate-500">Nenhum projeto em producao ainda.</p>}
                  </div>
                </div>
              </section>
            </>
          )}

          {activeModule === 'customers' && (
            <section className="grid grid-cols-[360px_1fr] gap-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">Novo cliente</p>
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Empresa / obra" value={customerForm.companyName} onChange={(e) => setCustomerForm((prev) => ({ ...prev, companyName: e.target.value }))} />
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Contato" value={customerForm.contactName} onChange={(e) => setCustomerForm((prev) => ({ ...prev, contactName: e.target.value }))} />
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Telefone" value={customerForm.phone} onChange={(e) => setCustomerForm((prev) => ({ ...prev, phone: e.target.value }))} />
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="E-mail" value={customerForm.email} onChange={(e) => setCustomerForm((prev) => ({ ...prev, email: e.target.value }))} />
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Cidade" value={customerForm.city} onChange={(e) => setCustomerForm((prev) => ({ ...prev, city: e.target.value }))} />
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Forma de pagamento" value={customerForm.paymentMethod} onChange={(e) => setCustomerForm((prev) => ({ ...prev, paymentMethod: e.target.value }))} />
                <button onClick={createCustomerRecord} className="w-full rounded-2xl bg-slate-900 text-white font-bold py-3">Salvar cliente</button>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {database.customers.map((customer) => (
                  <div key={customer.id} className="bg-white rounded-3xl border border-slate-200 p-5">
                    <p className="text-sm font-black text-slate-400 uppercase">{customer.companyName}</p>
                    <h3 className="mt-2 text-xl font-black">{customer.contactName}</h3>
                    <p className="text-sm text-slate-500">{customer.phone}</p>
                    <p className="text-sm text-slate-500">{customer.email}</p>
                    <p className="mt-4 text-xs font-bold uppercase text-slate-400">Ultimo contato: {customer.lastContact}</p>
                    <button onClick={() => loadCustomerIntoWorkspace(customer)} className="mt-4 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold">
                      Abrir no studio
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeModule === 'inventory' && (
            <section className="grid grid-cols-[380px_1fr] gap-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">Nova chapa</p>
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Codigo interno" value={inventoryForm.code} onChange={(e) => setInventoryForm((prev) => ({ ...prev, code: e.target.value }))} />
                <select className="w-full rounded-2xl border border-slate-200 px-4 py-3" value={inventoryForm.material} onChange={(e) => setInventoryForm((prev) => ({ ...prev, material: e.target.value as MaterialType }))}>
                  {Object.values(MaterialType).map((material) => (
                    <option key={material} value={material}>{material}</option>
                  ))}
                </select>
                <select className="w-full rounded-2xl border border-slate-200 px-4 py-3" value={inventoryForm.textureId} onChange={(e) => setInventoryForm((prev) => ({ ...prev, textureId: e.target.value }))}>
                  {TEXTURE_OPTIONS.filter((texture) => texture.materialType === inventoryForm.material).map((texture) => (
                    <option key={texture.id} value={texture.id}>{texture.name}</option>
                  ))}
                </select>
                <div className="grid grid-cols-3 gap-3">
                  <input className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Largura" value={inventoryForm.width} onChange={(e) => setInventoryForm((prev) => ({ ...prev, width: e.target.value }))} />
                  <input className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Altura" value={inventoryForm.height} onChange={(e) => setInventoryForm((prev) => ({ ...prev, height: e.target.value }))} />
                  <input className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Espessura" value={inventoryForm.thickness} onChange={(e) => setInventoryForm((prev) => ({ ...prev, thickness: e.target.value }))} />
                </div>
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Fornecedor" value={inventoryForm.supplier} onChange={(e) => setInventoryForm((prev) => ({ ...prev, supplier: e.target.value }))} />
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Localizacao" value={inventoryForm.location} onChange={(e) => setInventoryForm((prev) => ({ ...prev, location: e.target.value }))} />
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Custo" value={inventoryForm.cost} onChange={(e) => setInventoryForm((prev) => ({ ...prev, cost: e.target.value }))} />
                <button onClick={createInventorySlab} className="w-full rounded-2xl bg-slate-900 text-white font-bold py-3">Salvar chapa</button>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {database.inventory.map((slab) => (
                  <div key={slab.id} className="bg-white rounded-3xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black uppercase text-slate-400">{slab.code}</p>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-xs font-bold">{slab.status}</span>
                    </div>
                    <h3 className="mt-2 text-xl font-black">{slab.material}</h3>
                    <p className="text-sm text-slate-500">{slab.width} x {slab.height} x {slab.thickness} cm</p>
                    <p className="text-sm text-slate-500">{slab.location} • {slab.supplier || 'Fornecedor nao informado'}</p>
                    <p className="mt-4 text-2xl font-black text-indigo-600">{slab.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <button onClick={() => applyInventoryToWorkspace(slab)} className="mt-4 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold">Usar no studio</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeModule === 'quotes' && (
            <section className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">Workspace atual</p>
                  <h3 className="mt-2 text-2xl font-black">{workspaceBudget.projectName}</h3>
                  <p className="text-sm text-slate-500">{workspaceCustomer.name || 'Cliente nao definido'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={resetWorkspace} className="px-4 py-3 rounded-2xl bg-slate-100 font-bold">Novo projeto</button>
                  <button onClick={saveWorkspaceAsQuote} className="px-4 py-3 rounded-2xl bg-slate-900 text-white font-bold">Salvar orcamento</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {database.quotes.map((quote) => (
                  <div key={quote.id} className="bg-white rounded-3xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black uppercase text-slate-400">{quote.status}</p>
                      <p className="text-sm text-slate-500">{new Date(quote.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <h3 className="mt-2 text-2xl font-black">{quote.title}</h3>
                    <p className="text-sm text-slate-500">{quote.customerSnapshot.name}</p>
                    <p className="mt-4 text-3xl font-black text-indigo-600">{quote.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <div className="mt-4 flex gap-3">
                      <button onClick={() => loadQuoteIntoWorkspace(quote)} className="px-4 py-3 rounded-2xl bg-slate-100 font-bold">Abrir</button>
                      <button onClick={() => sendQuoteToProduction(quote)} className="px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold">Enviar para producao</button>
                    </div>
                  </div>
                ))}
                {database.quotes.length === 0 && (
                  <div className="col-span-2 bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-500">
                    Nenhum orcamento salvo ainda. Monte um projeto no studio e salve aqui.
                  </div>
                )}
              </div>
            </section>
          )}

          {activeModule === 'production' && (
            <section className="grid grid-cols-3 gap-5">
              {productionFlow.map((status) => (
                <div key={status} className="bg-white rounded-3xl border border-slate-200 p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">{status}</p>
                  <div className="mt-4 space-y-3">
                    {database.production.filter((order) => order.status === status).map((order) => (
                      <div key={order.id} className="rounded-2xl bg-slate-50 p-4">
                        <p className="font-black">{order.projectName}</p>
                        <p className="text-sm text-slate-500">{order.customerName}</p>
                        <p className="text-sm text-slate-500">Entrega prevista: {order.dueDate}</p>
                        <button onClick={() => advanceProduction(order.id)} className="mt-3 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold">
                          Avancar etapa
                        </button>
                      </div>
                    ))}
                    {database.production.every((order) => order.status !== status) && <p className="text-sm text-slate-400">Sem itens nesta etapa.</p>}
                  </div>
                </div>
              ))}
            </section>
          )}

          {activeModule === 'studio' && (
            <Suspense
              fallback={
                <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500 font-bold">
                  Carregando studio 3D...
                </div>
              }
            >
              <StudioWorkspace
                slab={workspaceSlab}
                setSlab={setWorkspaceSlab}
                customer={workspaceCustomer}
                setCustomer={setWorkspaceCustomer}
                budget={workspaceBudget}
                setBudget={setWorkspaceBudget}
                onOpenPrint={() => setShowPrintView(true)}
                onNotify={notify}
                onSave={saveWorkspaceAsQuote}
                onReset={resetWorkspace}
                workspaceTotal={workspaceTotal}
              />
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
};
