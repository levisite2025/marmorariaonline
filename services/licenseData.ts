export type LicenseStatus = 'Ativa' | 'Expirada' | 'Suspensa' | 'Teste';

export interface LicenseUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Operador' | 'Vendedor';
  status: 'Ativo' | 'Inativo';
  lastAccessAt: string;
}

export interface RenewalRecord {
  id: string;
  renewedAt: string;
  previousExpiresAt: string;
  nextExpiresAt: string;
  monthsAdded: number;
  note: string;
}

export interface CompanyLicense {
  id: string;
  companyName: string;
  document: string;
  contactName: string;
  contactEmail: string;
  phone: string;
  systemName: string;
  planName: string;
  licenseKey: string;
  seats: number;
  activeUsers: number;
  users: LicenseUser[];
  renewalHistory: RenewalRecord[];
  issuedAt: string;
  expiresAt: string;
  status: LicenseStatus;
  notes: string;
}

export interface LicenseDatabase {
  licenses: CompanyLicense[];
}

export interface LicenseSession {
  companyName: string;
  licenseKey: string;
  validatedAt: string;
  expiresAt: string;
  status: LicenseStatus;
}

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generateLicenseKey = () => {
  const parts = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  );
  return `MARM-${parts.join('-')}`;
};

const createLicenseUser = (
  id: string,
  name: string,
  email: string,
  role: LicenseUser['role'],
  status: LicenseUser['status'],
  lastAccessAt: string
): LicenseUser => ({
  id,
  name,
  email,
  role,
  status,
  lastAccessAt,
});

const createRenewalRecord = (
  id: string,
  renewedAt: string,
  previousExpiresAt: string,
  nextExpiresAt: string,
  monthsAdded: number,
  note: string
): RenewalRecord => ({
  id,
  renewedAt,
  previousExpiresAt,
  nextExpiresAt,
  monthsAdded,
  note,
});

export const getActiveUserCount = (license: Pick<CompanyLicense, 'users' | 'activeUsers'>) =>
  Array.isArray(license.users) && license.users.length > 0
    ? license.users.filter((user) => user.status === 'Ativo').length
    : Math.max(0, license.activeUsers || 0);

export const hasSeatOverage = (license: Pick<CompanyLicense, 'users' | 'activeUsers' | 'seats'>) =>
  getActiveUserCount(license) > Math.max(1, license.seats || 1);

export const canAddActiveUser = (license: Pick<CompanyLicense, 'users' | 'activeUsers' | 'seats'>) =>
  getActiveUserCount(license) < Math.max(1, license.seats || 1);

export const isLicenseUsable = (
  status: LicenseStatus,
  expiresAt: string,
  license?: Pick<CompanyLicense, 'users' | 'activeUsers' | 'seats'>
) => {
  if (!(status === 'Ativa' || status === 'Teste')) return false;
  const expiry = new Date(expiresAt);
  const now = new Date();
  expiry.setHours(23, 59, 59, 999);
  if (expiry.getTime() < now.getTime()) return false;
  if (license && hasSeatOverage(license)) return false;
  return true;
};

export const createSeedLicenseDatabase = (): LicenseDatabase => ({
  licenses: [
    {
      id: 'lic-1',
      companyName: 'Granitos Alpha',
      document: '12.345.678/0001-99',
      contactName: 'Joao Pereira',
      contactEmail: 'joao@alpha.com',
      phone: '(11) 98888-1000',
      systemName: 'Marmoraria Online',
      planName: 'Professional',
      licenseKey: generateLicenseKey(),
      seats: 12,
      activeUsers: 7,
      users: [
        createLicenseUser('user-1', 'Joao Pereira', 'joao@alpha.com', 'Admin', 'Ativo', '2026-03-17T08:00:00.000Z'),
        createLicenseUser('user-2', 'Marina Costa', 'marina@alpha.com', 'Operador', 'Ativo', '2026-03-17T10:30:00.000Z'),
        createLicenseUser('user-3', 'Lucas Freitas', 'lucas@alpha.com', 'Vendedor', 'Ativo', '2026-03-16T17:40:00.000Z'),
      ],
      renewalHistory: [
        createRenewalRecord('ren-1', '2026-03-01', '2026-09-01', '2027-03-01', 6, 'Renovacao comercial apos ampliacao do contrato.'),
      ],
      issuedAt: '2026-03-01',
      expiresAt: '2027-03-01',
      status: 'Ativa',
      notes: 'Cliente com implantacao completa e modulo de producao ativo.',
    },
    {
      id: 'lic-2',
      companyName: 'Pedras Nova Era',
      document: '98.765.432/0001-10',
      contactName: 'Camila Souza',
      contactEmail: 'camila@novaera.com',
      phone: '(21) 97777-2222',
      systemName: 'Marmoraria Online',
      planName: 'Teste',
      licenseKey: generateLicenseKey(),
      seats: 3,
      activeUsers: 2,
      users: [
        createLicenseUser('user-4', 'Camila Souza', 'camila@novaera.com', 'Admin', 'Ativo', '2026-03-17T09:20:00.000Z'),
        createLicenseUser('user-5', 'Rafaela Moraes', 'rafaela@novaera.com', 'Operador', 'Ativo', '2026-03-15T13:10:00.000Z'),
      ],
      renewalHistory: [],
      issuedAt: '2026-03-10',
      expiresAt: '2026-04-10',
      status: 'Teste',
      notes: 'Periodo de avaliacao comercial.',
    },
  ],
});

export const createEmptyLicenseDatabase = (): LicenseDatabase => ({
  licenses: [],
});

const normalizeUsers = (users: unknown, fallbackActiveUsers: number): LicenseUser[] => {
  if (!Array.isArray(users)) return [];
  return users
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      const source = item as Partial<LicenseUser>;
      return {
        id: source.id || `user-${Date.now()}-${index}`,
        name: source.name || `Usuario ${index + 1}`,
        email: source.email || '',
        role: source.role || 'Operador',
        status: source.status || (index < fallbackActiveUsers ? 'Ativo' : 'Inativo'),
        lastAccessAt: source.lastAccessAt || new Date().toISOString(),
      };
    });
};

const normalizeRenewalHistory = (renewalHistory: unknown): RenewalRecord[] => {
  if (!Array.isArray(renewalHistory)) return [];
  return renewalHistory
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      const source = item as Partial<RenewalRecord>;
      return {
        id: source.id || `ren-${Date.now()}-${index}`,
        renewedAt: source.renewedAt || new Date().toISOString().slice(0, 10),
        previousExpiresAt: source.previousExpiresAt || new Date().toISOString().slice(0, 10),
        nextExpiresAt: source.nextExpiresAt || new Date().toISOString().slice(0, 10),
        monthsAdded: Number.isFinite(source.monthsAdded) ? Number(source.monthsAdded) : 0,
        note: source.note || 'Renovacao registrada no painel.',
      };
    });
};

const normalizeLicense = (license: Partial<CompanyLicense>, index: number): CompanyLicense => {
  const users = normalizeUsers(license.users, Math.max(0, license.activeUsers || 0));
  const activeUsers = getActiveUserCount({
    users,
    activeUsers: Math.max(0, license.activeUsers || 0),
  });

  return {
    id: license.id || `lic-${Date.now()}-${index}`,
    companyName: license.companyName || `Empresa ${index + 1}`,
    document: license.document || '',
    contactName: license.contactName || '',
    contactEmail: license.contactEmail || '',
    phone: license.phone || '',
    systemName: license.systemName || 'Marmoraria Online',
    planName: license.planName || 'Professional',
    licenseKey: license.licenseKey || generateLicenseKey(),
    seats: Math.max(1, Number(license.seats) || 1),
    activeUsers,
    users,
    renewalHistory: normalizeRenewalHistory(license.renewalHistory),
    issuedAt: license.issuedAt || new Date().toISOString().slice(0, 10),
    expiresAt: license.expiresAt || new Date().toISOString().slice(0, 10),
    status: license.status || 'Ativa',
    notes: license.notes || '',
  };
};

export const normalizeLicenseDatabase = (raw: unknown): LicenseDatabase => {
  const empty = createEmptyLicenseDatabase();
  if (!raw || typeof raw !== 'object') return empty;
  const source = raw as Partial<LicenseDatabase>;
  return {
    licenses: Array.isArray(source.licenses)
      ? source.licenses.map((license, index) => normalizeLicense(license, index))
      : empty.licenses,
  };
};

export const findLicenseByCompanyAndKey = (database: LicenseDatabase, companyName: string, licenseKey: string) => {
  const normalizedCompany = companyName.trim().toLowerCase();
  const normalizedKey = licenseKey.trim().toLowerCase();

  return database.licenses.find(
    (item) =>
      item.companyName.trim().toLowerCase() === normalizedCompany &&
      item.licenseKey.trim().toLowerCase() === normalizedKey
  );
};

export const findLicenseByKey = (database: LicenseDatabase, licenseKey: string) => {
  const normalizedKey = licenseKey.trim().toLowerCase();
  return database.licenses.find((item) => item.licenseKey.trim().toLowerCase() === normalizedKey);
};

export const normalizeLicenseSession = (raw: unknown): LicenseSession | null => {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Partial<LicenseSession>;
  if (!source.companyName || !source.licenseKey || !source.expiresAt || !source.validatedAt || !source.status) {
    return null;
  }

  return {
    companyName: source.companyName,
    licenseKey: source.licenseKey,
    validatedAt: source.validatedAt,
    expiresAt: source.expiresAt,
    status: source.status,
  };
};

export const validateStoredLicenseSession = (database: LicenseDatabase, session: LicenseSession | null) => {
  if (!session) return null;

  const license = findLicenseByCompanyAndKey(database, session.companyName, session.licenseKey);
  if (!license) return null;
  if (!isLicenseUsable(license.status, license.expiresAt, license)) return null;

  return {
    companyName: license.companyName,
    licenseKey: license.licenseKey,
    validatedAt: session.validatedAt,
    expiresAt: license.expiresAt,
    status: license.status,
  } satisfies LicenseSession;
};
