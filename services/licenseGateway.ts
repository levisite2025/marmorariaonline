import {
  CompanyLicense,
  findLicenseByCompanyAndKey,
  generateLicenseKey,
  getActiveUserCount,
  LicenseDatabase,
  LicenseSession,
  LicenseStatus,
  LicenseUser,
  normalizeLicenseDatabase,
  normalizeLicenseSession,
  validateStoredLicenseSession,
} from './licenseData';
import { createEmptyDatabase } from './systemData';

const STORAGE_KEY = 'marmoraria-license-db-v1';
const SESSION_KEY = 'marmoraria-license-session-v1';
const SYSTEM_STORAGE_KEY = 'marmoraria-online-db-v2';
const API_BASE_URL = (import.meta.env.VITE_LICENSE_API_URL || 'http://127.0.0.1:4010/api').replace(/\/$/, '');

interface CreateLicensePayload {
  companyName: string;
  document: string;
  contactName: string;
  contactEmail: string;
  phone: string;
  systemName: string;
  planName: string;
  seats: number;
  expiresAt: string;
  notes: string;
  status: LicenseStatus;
}

const readLocalDatabase = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeLicenseDatabase(JSON.parse(raw)) : normalizeLicenseDatabase(null);
  } catch {
    return normalizeLicenseDatabase(null);
  }
};

const saveLocalDatabase = (database: LicenseDatabase) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  return database;
};

const readLocalSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return normalizeLicenseSession(raw ? JSON.parse(raw) : null);
  } catch {
    return null;
  }
};

const saveLocalSession = (session: LicenseSession | null) => {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
};

const clearLocalSystemDatabase = () => {
  localStorage.setItem(SYSTEM_STORAGE_KEY, JSON.stringify(createEmptyDatabase()));
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

export const loadLicenseDatabase = async (): Promise<LicenseDatabase> => {
  try {
    const database = normalizeLicenseDatabase(await fetchJson<LicenseDatabase>('/licenses'));
    return saveLocalDatabase(database);
  } catch {
    return readLocalDatabase();
  }
};

export const createLicenseRecord = async (payload: CreateLicensePayload): Promise<LicenseDatabase> => {
  try {
    const database = normalizeLicenseDatabase(
      await fetchJson<LicenseDatabase>('/licenses', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );
    return saveLocalDatabase(database);
  } catch {
    const issuedAt = new Date().toISOString().slice(0, 10);
    const record: CompanyLicense = {
      id: `lic-${Date.now()}`,
      companyName: payload.companyName,
      document: payload.document,
      contactName: payload.contactName,
      contactEmail: payload.contactEmail,
      phone: payload.phone,
      systemName: payload.systemName,
      planName: payload.planName,
      licenseKey: generateLicenseKey(),
      seats: Math.max(1, payload.seats),
      activeUsers: 1,
      users: [
        {
          id: `user-${Date.now()}`,
          name: payload.contactName,
          email: payload.contactEmail,
          role: 'Admin',
          status: 'Ativo',
          lastAccessAt: new Date().toISOString(),
        },
      ],
      renewalHistory: [],
      issuedAt,
      expiresAt: payload.expiresAt || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      status: payload.status,
      notes: payload.notes,
    };
    const nextDatabase = {
      licenses: [record, ...readLocalDatabase().licenses],
    };
    return saveLocalDatabase(normalizeLicenseDatabase(nextDatabase));
  }
};

const updateDatabaseThroughApi = async (path: string, body: unknown) => {
  try {
    const database = normalizeLicenseDatabase(
      await fetchJson<LicenseDatabase>(path, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
    );
    return saveLocalDatabase(database);
  } catch {
    return null;
  }
};

export const regenerateLicenseRecord = async (licenseId: string) => {
  const apiResult = await updateDatabaseThroughApi(`/licenses/${licenseId}/regenerate`, {});
  if (apiResult) return apiResult;

  const database = readLocalDatabase();
  return saveLocalDatabase({
    licenses: database.licenses.map((license) =>
      license.id === licenseId ? { ...license, licenseKey: generateLicenseKey() } : license
    ),
  });
};

export const cycleLicenseStatus = async (licenseId: string) => {
  const apiResult = await updateDatabaseThroughApi(`/licenses/${licenseId}/status`, {});
  if (apiResult) return apiResult;

  const nextStatus: Record<LicenseStatus, LicenseStatus> = {
    Ativa: 'Suspensa',
    Suspensa: 'Ativa',
    Expirada: 'Ativa',
    Teste: 'Ativa',
  };

  const database = readLocalDatabase();
  return saveLocalDatabase({
    licenses: database.licenses.map((license) =>
      license.id === licenseId ? { ...license, status: nextStatus[license.status] } : license
    ),
  });
};

export const renewLicenseRecord = async (licenseId: string, months: number) => {
  const apiResult = await updateDatabaseThroughApi(`/licenses/${licenseId}/renew`, { months });
  if (apiResult) return apiResult;

  const database = readLocalDatabase();
  return saveLocalDatabase({
    licenses: database.licenses.map((license) => {
      if (license.id !== licenseId) return license;
      const baseDate = new Date(license.expiresAt);
      const now = new Date();
      const startDate = Number.isNaN(baseDate.getTime()) || baseDate < now ? now : baseDate;
      const renewedDate = new Date(startDate);
      renewedDate.setMonth(renewedDate.getMonth() + months);
      const users = license.users;
      return {
        ...license,
        expiresAt: renewedDate.toISOString().slice(0, 10),
        status: license.status === 'Expirada' ? 'Ativa' : license.status,
        users,
        activeUsers: getActiveUserCount({ users, activeUsers: license.activeUsers }),
        renewalHistory: [
          {
            id: `ren-${Date.now()}`,
            renewedAt: new Date().toISOString().slice(0, 10),
            previousExpiresAt: license.expiresAt,
            nextExpiresAt: renewedDate.toISOString().slice(0, 10),
            monthsAdded: months,
            note: `Renovacao manual pelo painel por ${months} ${months === 1 ? 'mes' : 'meses'}.`,
          },
          ...license.renewalHistory,
        ],
      };
    }),
  });
};

export const addLicenseUser = async (licenseId: string) => {
  const apiResult = await updateDatabaseThroughApi(`/licenses/${licenseId}/users`, { action: 'add' });
  if (apiResult) return apiResult;

  const database = readLocalDatabase();
  return saveLocalDatabase({
    licenses: database.licenses.map((license) => {
      if (license.id !== licenseId) return license;
      const users = [
        {
          id: `user-${Date.now()}`,
          name: license.contactName || 'Novo usuario',
          email: license.contactEmail || '',
          role: 'Operador',
          status: getActiveUserCount(license) < license.seats ? 'Ativo' : 'Inativo',
          lastAccessAt: new Date().toISOString(),
        },
        ...license.users,
      ];
      return { ...license, users, activeUsers: getActiveUserCount({ users, activeUsers: license.activeUsers }) };
    }),
  });
};

export const updateLicenseUser = async (
  licenseId: string,
  userId: string,
  patch: Partial<Pick<LicenseUser, 'status' | 'role'>>
) => {
  const apiResult = await updateDatabaseThroughApi(`/licenses/${licenseId}/users/${userId}`, patch);
  if (apiResult) return apiResult;

  const database = readLocalDatabase();
  return saveLocalDatabase({
    licenses: database.licenses.map((license) => {
      if (license.id !== licenseId) return license;
      const users = license.users.map((user) =>
        user.id === userId
          ? {
              ...user,
              ...patch,
              lastAccessAt: new Date().toISOString(),
            }
          : user
      );
      return { ...license, users, activeUsers: getActiveUserCount({ users, activeUsers: license.activeUsers }) };
    }),
  });
};

export const deleteLicenseRecord = async (licenseId: string) => {
  try {
    const deletedLicense = readLocalDatabase().licenses.find((license) => license.id === licenseId);
    const database = normalizeLicenseDatabase(
      await fetchJson<LicenseDatabase>(`/licenses/${licenseId}`, {
        method: 'DELETE',
      })
    );
    const activeSession = readLocalSession();
    if (activeSession && deletedLicense && activeSession.licenseKey === deletedLicense.licenseKey) {
      saveLocalSession(null);
    }
    if (deletedLicense) {
      clearLocalSystemDatabase();
    }
    return saveLocalDatabase(database);
  } catch {
    const database = readLocalDatabase();
    const deletedLicense = database.licenses.find((license) => license.id === licenseId);
    if (deletedLicense) {
      const activeSession = readLocalSession();
      if (activeSession?.licenseKey === deletedLicense.licenseKey) {
        saveLocalSession(null);
      }
      clearLocalSystemDatabase();
    }
    return saveLocalDatabase({
      licenses: database.licenses.filter((license) => license.id !== licenseId),
    });
  }
};

export const validateLicenseAccess = async (companyName: string, licenseKey: string): Promise<LicenseSession | null> => {
  try {
    const session = normalizeLicenseSession(
      await fetchJson<LicenseSession | null>('/licenses/validate', {
        method: 'POST',
        body: JSON.stringify({ companyName, licenseKey }),
      })
    );
    saveLocalSession(session);
    return session;
  } catch {
    const database = readLocalDatabase();
    const license = findLicenseByCompanyAndKey(database, companyName, licenseKey);
    if (!license) return null;
    const session = validateStoredLicenseSession(database, {
      companyName: license.companyName,
      licenseKey: license.licenseKey,
      validatedAt: new Date().toISOString(),
      expiresAt: license.expiresAt,
      status: license.status,
    });
    saveLocalSession(session);
    return session;
  }
};

export const refreshValidatedSession = async (): Promise<LicenseSession | null> => {
  const localSession = readLocalSession();
  try {
    const database = normalizeLicenseDatabase(await fetchJson<LicenseDatabase>('/licenses'));
    saveLocalDatabase(database);
    const nextSession = validateStoredLicenseSession(database, localSession);
    saveLocalSession(nextSession);
    return nextSession;
  } catch {
    const nextSession = validateStoredLicenseSession(readLocalDatabase(), localSession);
    saveLocalSession(nextSession);
    return nextSession;
  }
};

export const clearValidatedSession = () => {
  saveLocalSession(null);
};
