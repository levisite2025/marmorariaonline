import { BudgetState, Customer, MaterialType, SlabState } from '../types';

export type QuoteStatus = 'Rascunho' | 'Enviado' | 'Aprovado' | 'Produzindo' | 'Entregue';
export type ProductionStatus = 'Novo' | 'Medicao' | 'Corte' | 'Acabamento' | 'Instalacao' | 'Concluido';
export type InventoryStatus = 'Disponivel' | 'Reservada' | 'Em uso';

export interface CustomerRecord extends Customer {
  id: string;
  companyName: string;
  contactName: string;
  tags: string[];
  lastContact: string;
}

export interface InventorySlab {
  id: string;
  code: string;
  material: MaterialType;
  textureId: string;
  width: number;
  height: number;
  thickness: number;
  status: InventoryStatus;
  supplier: string;
  location: string;
  cost: number;
}

export interface QuoteRecord {
  id: string;
  title: string;
  customerId: string;
  customerSnapshot: Customer;
  budgetSnapshot: BudgetState;
  slabSnapshot: SlabState;
  status: QuoteStatus;
  total: number;
  createdAt: string;
}

export interface ProductionOrder {
  id: string;
  quoteId: string;
  customerName: string;
  projectName: string;
  status: ProductionStatus;
  dueDate: string;
  assignedTo: string;
  notes: string;
}

export interface MarmorariaDatabase {
  customers: CustomerRecord[];
  inventory: InventorySlab[];
  quotes: QuoteRecord[];
  production: ProductionOrder[];
}

export const createEmptyDatabase = (): MarmorariaDatabase => ({
  customers: [],
  inventory: [],
  quotes: [],
  production: [],
});

export const createEmptyCustomer = (): Customer => ({
  name: '',
  phone: '',
  email: '',
  address: { street: '', number: '', district: '', city: '', zip: '' },
  paymentMethod: 'Pix',
});

export const createEmptyBudget = (): BudgetState => ({
  projectName: 'Novo projeto',
  pricePerMq: 0,
  laborCost: 0,
  transportCost: 0,
  installationCost: 0,
  extraCosts: 0,
  deadlineDays: 7,
  validityDays: 5,
  notes: '',
});

export const createDefaultSlab = (): SlabState => ({
  material: MaterialType.GRANITE,
  activeTextureId: 'saogabriel',
  dimensions: { width: 280, height: 160, thickness: 2, curvature: 0, inclination: 0 },
  pieces: [],
});

export const calculateQuoteTotal = (slab: SlabState, budget: BudgetState) => {
  const area = (slab.dimensions.width * slab.dimensions.height) / 10000;
  const materialCost = area * budget.pricePerMq;
  return materialCost + budget.laborCost + budget.transportCost + budget.installationCost + budget.extraCosts;
};

export const createSeedDatabase = (): MarmorariaDatabase => ({
  customers: [
    {
      id: 'cust-1',
      companyName: 'Residencial Orion',
      contactName: 'Mariana Alves',
      name: 'Mariana Alves',
      phone: '(11) 99999-1001',
      email: 'mariana@orion.com',
      address: { street: 'Rua das Acacias', number: '120', district: 'Centro', city: 'Sao Paulo', zip: '01010-000' },
      paymentMethod: 'Pix',
      tags: ['alto padrao', 'arquitetura'],
      lastContact: '2026-03-15',
    },
    {
      id: 'cust-2',
      companyName: 'Construtora Atlas',
      contactName: 'Carlos Menezes',
      name: 'Carlos Menezes',
      phone: '(11) 98888-2002',
      email: 'carlos@atlas.com',
      address: { street: 'Av. Brasil', number: '450', district: 'Jardins', city: 'Sao Paulo', zip: '01430-000' },
      paymentMethod: 'Boleto',
      tags: ['obra', 'corporativo'],
      lastContact: '2026-03-14',
    },
  ],
  inventory: [
    {
      id: 'slab-1',
      code: 'SG-280x160',
      material: MaterialType.GRANITE,
      textureId: 'saogabriel',
      width: 280,
      height: 160,
      thickness: 2,
      status: 'Disponivel',
      supplier: 'Pedras Brasil',
      location: 'Galpao A',
      cost: 1450,
    },
    {
      id: 'slab-2',
      code: 'CA-300x180',
      material: MaterialType.MARBLE,
      textureId: 'calacatta',
      width: 300,
      height: 180,
      thickness: 2,
      status: 'Reservada',
      supplier: 'Premium Stones',
      location: 'Galpao B',
      cost: 4200,
    },
  ],
  quotes: [],
  production: [],
});

export const normalizeDatabase = (raw: unknown): MarmorariaDatabase => {
  const seed = createSeedDatabase();
  if (!raw || typeof raw !== 'object') return seed;

  const source = raw as Partial<MarmorariaDatabase>;
  return {
    customers: Array.isArray(source.customers) ? source.customers : seed.customers,
    inventory: Array.isArray(source.inventory) ? source.inventory : seed.inventory,
    quotes: Array.isArray(source.quotes) ? source.quotes : seed.quotes,
    production: Array.isArray(source.production) ? source.production : seed.production,
  };
};
