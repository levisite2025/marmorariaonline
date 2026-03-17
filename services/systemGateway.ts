import {
  createSeedDatabase,
  CustomerRecord,
  InventorySlab,
  MarmorariaDatabase,
  normalizeDatabase,
  ProductionOrder,
  QuoteRecord,
} from './systemData';

const STORAGE_KEY = 'marmoraria-online-db-v2';
const API_BASE_URL = (import.meta.env.VITE_SYSTEM_API_URL || 'http://127.0.0.1:4010/api').replace(/\/$/, '');

const readLocalDatabase = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeDatabase(JSON.parse(raw)) : createSeedDatabase();
  } catch {
    return createSeedDatabase();
  }
};

const saveLocalDatabase = (database: MarmorariaDatabase) => {
  const normalized = normalizeDatabase(database);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};

const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export const loadSystemDatabase = async (): Promise<MarmorariaDatabase> => {
  try {
    const database = normalizeDatabase(await fetchJson<MarmorariaDatabase>('/system'));
    return saveLocalDatabase(database);
  } catch {
    return readLocalDatabase();
  }
};

export const createCustomerRecordApi = async (record: CustomerRecord): Promise<MarmorariaDatabase> => {
  try {
    const database = normalizeDatabase(
      await fetchJson<MarmorariaDatabase>('/system/customers', {
        method: 'POST',
        body: JSON.stringify(record),
      })
    );
    return saveLocalDatabase(database);
  } catch {
    const database = readLocalDatabase();
    return saveLocalDatabase({ ...database, customers: [record, ...database.customers] });
  }
};

export const createInventorySlabApi = async (record: InventorySlab): Promise<MarmorariaDatabase> => {
  try {
    const database = normalizeDatabase(
      await fetchJson<MarmorariaDatabase>('/system/inventory', {
        method: 'POST',
        body: JSON.stringify(record),
      })
    );
    return saveLocalDatabase(database);
  } catch {
    const database = readLocalDatabase();
    return saveLocalDatabase({ ...database, inventory: [record, ...database.inventory] });
  }
};

export const saveQuoteRecordApi = async (record: QuoteRecord): Promise<MarmorariaDatabase> => {
  try {
    const database = normalizeDatabase(
      await fetchJson<MarmorariaDatabase>('/system/quotes', {
        method: 'POST',
        body: JSON.stringify(record),
      })
    );
    return saveLocalDatabase(database);
  } catch {
    const database = readLocalDatabase();
    return saveLocalDatabase({ ...database, quotes: [record, ...database.quotes] });
  }
};

export const sendQuoteToProductionApi = async (quote: QuoteRecord, order: ProductionOrder): Promise<MarmorariaDatabase> => {
  try {
    const database = normalizeDatabase(
      await fetchJson<MarmorariaDatabase>(`/system/quotes/${quote.id}/production`, {
        method: 'POST',
        body: JSON.stringify(order),
      })
    );
    return saveLocalDatabase(database);
  } catch {
    const database = readLocalDatabase();
    return saveLocalDatabase({
      ...database,
      quotes: database.quotes.map((item) => (item.id === quote.id ? { ...item, status: 'Produzindo' } : item)),
      production: [order, ...database.production],
    });
  }
};

export const advanceProductionOrderApi = async (orderId: string): Promise<MarmorariaDatabase> => {
  try {
    const database = normalizeDatabase(
      await fetchJson<MarmorariaDatabase>(`/system/production/${orderId}/advance`, {
        method: 'PATCH',
      })
    );
    return saveLocalDatabase(database);
  } catch {
    return readLocalDatabase();
  }
};
