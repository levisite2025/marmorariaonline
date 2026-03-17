import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'licenses.json');
const systemDataFile = path.join(dataDir, 'marmoraria-system.json');
const port = Number(process.env.LICENSE_API_PORT || 4010);

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateLicenseKey = () => {
  const parts = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  );
  return `MARM-${parts.join('-')}`;
};

const getActiveUserCount = (license) =>
  Array.isArray(license.users) ? license.users.filter((user) => user.status === 'Ativo').length : Math.max(0, license.activeUsers || 0);

const hasSeatOverage = (license) => getActiveUserCount(license) > Math.max(1, license.seats || 1);

const isLicenseUsable = (license) => {
  if (!(license.status === 'Ativa' || license.status === 'Teste')) return false;
  const expiry = new Date(license.expiresAt);
  expiry.setHours(23, 59, 59, 999);
  return expiry.getTime() >= Date.now() && !hasSeatOverage(license);
};

const seedDatabase = () => ({
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
      activeUsers: 3,
      users: [
        { id: 'user-1', name: 'Joao Pereira', email: 'joao@alpha.com', role: 'Admin', status: 'Ativo', lastAccessAt: new Date().toISOString() },
        { id: 'user-2', name: 'Marina Costa', email: 'marina@alpha.com', role: 'Operador', status: 'Ativo', lastAccessAt: new Date().toISOString() },
        { id: 'user-3', name: 'Lucas Freitas', email: 'lucas@alpha.com', role: 'Vendedor', status: 'Ativo', lastAccessAt: new Date().toISOString() },
      ],
      renewalHistory: [],
      issuedAt: '2026-03-01',
      expiresAt: '2027-03-01',
      status: 'Ativa',
      notes: 'Cliente com implantacao completa e modulo de producao ativo.',
    },
  ],
});

const seedSystemDatabase = () => ({
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
  ],
  inventory: [
    {
      id: 'slab-1',
      code: 'SG-280x160',
      material: 'Granito',
      textureId: 'saogabriel',
      width: 280,
      height: 160,
      thickness: 2,
      status: 'Disponivel',
      supplier: 'Pedras Brasil',
      location: 'Galpao A',
      cost: 1450,
    },
  ],
  quotes: [],
  production: [],
});

const normalizeDatabase = (raw) => {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.licenses)) {
    return seedDatabase();
  }

  return {
    licenses: raw.licenses.map((license, index) => {
      const users = Array.isArray(license.users) ? license.users : [];
      const normalizedUsers = users.map((user, userIndex) => ({
        id: user.id || `user-${index}-${userIndex}`,
        name: user.name || `Usuario ${userIndex + 1}`,
        email: user.email || '',
        role: user.role || 'Operador',
        status: user.status || 'Inativo',
        lastAccessAt: user.lastAccessAt || new Date().toISOString(),
      }));

      return {
        id: license.id || `lic-${index}`,
        companyName: license.companyName || `Empresa ${index + 1}`,
        document: license.document || '',
        contactName: license.contactName || '',
        contactEmail: license.contactEmail || '',
        phone: license.phone || '',
        systemName: license.systemName || 'Marmoraria Online',
        planName: license.planName || 'Professional',
        licenseKey: license.licenseKey || generateLicenseKey(),
        seats: Math.max(1, Number(license.seats) || 1),
        activeUsers: normalizedUsers.filter((user) => user.status === 'Ativo').length,
        users: normalizedUsers,
        renewalHistory: Array.isArray(license.renewalHistory) ? license.renewalHistory : [],
        issuedAt: license.issuedAt || new Date().toISOString().slice(0, 10),
        expiresAt: license.expiresAt || new Date().toISOString().slice(0, 10),
        status: license.status || 'Ativa',
        notes: license.notes || '',
      };
    }),
  };
};

const normalizeSystemDatabase = (raw) => {
  const seed = seedSystemDatabase();
  if (!raw || typeof raw !== 'object') return seed;
  return {
    customers: Array.isArray(raw.customers) ? raw.customers : seed.customers,
    inventory: Array.isArray(raw.inventory) ? raw.inventory : seed.inventory,
    quotes: Array.isArray(raw.quotes) ? raw.quotes : seed.quotes,
    production: Array.isArray(raw.production) ? raw.production : seed.production,
  };
};

const ensureDatabase = async () => {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(seedDatabase(), null, 2), 'utf8');
  }

  try {
    await fs.access(systemDataFile);
  } catch {
    await fs.writeFile(systemDataFile, JSON.stringify(seedSystemDatabase(), null, 2), 'utf8');
  }
};

const readDatabase = async () => {
  await ensureDatabase();
  const raw = await fs.readFile(dataFile, 'utf8');
  return normalizeDatabase(JSON.parse(raw));
};

const writeDatabase = async (database) => {
  const normalized = normalizeDatabase(database);
  await fs.writeFile(dataFile, JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
};

const readSystemDatabase = async () => {
  await ensureDatabase();
  const raw = await fs.readFile(systemDataFile, 'utf8');
  return normalizeSystemDatabase(JSON.parse(raw));
};

const writeSystemDatabase = async (database) => {
  const normalized = normalizeSystemDatabase(database);
  await fs.writeFile(systemDataFile, JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(payload));
};

const readBody = (request) =>
  new Promise((resolve, reject) => {
    let data = '';
    request.on('data', (chunk) => {
      data += chunk;
    });
    request.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: 'URL invalida.' });
    return;
  }

  if (request.method === 'OPTIONS') {
    sendJson(response, 200, { ok: true });
    return;
  }

  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  const pathname = url.pathname;

  try {
    if (request.method === 'GET' && pathname === '/api/health') {
      sendJson(response, 200, { status: 'ok' });
      return;
    }

    if (request.method === 'GET' && pathname === '/api/licenses') {
      sendJson(response, 200, await readDatabase());
      return;
    }

    if (request.method === 'GET' && pathname === '/api/system') {
      sendJson(response, 200, await readSystemDatabase());
      return;
    }

    if (request.method === 'POST' && pathname === '/api/licenses') {
      const body = await readBody(request);
      const database = await readDatabase();
      const record = {
        id: `lic-${Date.now()}`,
        companyName: body.companyName || 'Empresa sem nome',
        document: body.document || '',
        contactName: body.contactName || '',
        contactEmail: body.contactEmail || '',
        phone: body.phone || '',
        systemName: body.systemName || 'Marmoraria Online',
        planName: body.planName || 'Professional',
        licenseKey: generateLicenseKey(),
        seats: Math.max(1, Number(body.seats) || 1),
        activeUsers: 1,
        users: [
          {
            id: `user-${Date.now()}`,
            name: body.contactName || 'Administrador',
            email: body.contactEmail || '',
            role: 'Admin',
            status: 'Ativo',
            lastAccessAt: new Date().toISOString(),
          },
        ],
        renewalHistory: [],
        issuedAt: new Date().toISOString().slice(0, 10),
        expiresAt: body.expiresAt || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        status: body.status || 'Ativa',
        notes: body.notes || '',
      };

      sendJson(response, 200, await writeDatabase({ licenses: [record, ...database.licenses] }));
      return;
    }

    if (request.method === 'POST' && pathname === '/api/licenses/validate') {
      const body = await readBody(request);
      const database = await readDatabase();
      const companyName = String(body.companyName || '').trim().toLowerCase();
      const licenseKey = String(body.licenseKey || '').trim().toLowerCase();
      const license = database.licenses.find(
        (item) => item.companyName.trim().toLowerCase() === companyName && item.licenseKey.trim().toLowerCase() === licenseKey
      );

      if (!license || !isLicenseUsable(license)) {
        sendJson(response, 200, null);
        return;
      }

      sendJson(response, 200, {
        companyName: license.companyName,
        licenseKey: license.licenseKey,
        validatedAt: new Date().toISOString(),
        expiresAt: license.expiresAt,
        status: license.status,
      });
      return;
    }

    if (request.method === 'POST' && pathname === '/api/system/customers') {
      const body = await readBody(request);
      const database = await readSystemDatabase();
      sendJson(response, 200, await writeSystemDatabase({ ...database, customers: [body, ...database.customers] }));
      return;
    }

    if (request.method === 'POST' && pathname === '/api/system/inventory') {
      const body = await readBody(request);
      const database = await readSystemDatabase();
      sendJson(response, 200, await writeSystemDatabase({ ...database, inventory: [body, ...database.inventory] }));
      return;
    }

    if (request.method === 'POST' && pathname === '/api/system/quotes') {
      const body = await readBody(request);
      const database = await readSystemDatabase();
      sendJson(response, 200, await writeSystemDatabase({ ...database, quotes: [body, ...database.quotes] }));
      return;
    }

    const quoteProductionMatch = pathname.match(/^\/api\/system\/quotes\/([^/]+)\/production$/);
    if (request.method === 'POST' && quoteProductionMatch) {
      const [, quoteId] = quoteProductionMatch;
      const body = await readBody(request);
      const database = await readSystemDatabase();
      sendJson(
        response,
        200,
        await writeSystemDatabase({
          ...database,
          quotes: database.quotes.map((item) => (item.id === quoteId ? { ...item, status: 'Produzindo' } : item)),
          production: [body, ...database.production],
        })
      );
      return;
    }

    const advanceProductionMatch = pathname.match(/^\/api\/system\/production\/([^/]+)\/advance$/);
    if (request.method === 'PATCH' && advanceProductionMatch) {
      const [, orderId] = advanceProductionMatch;
      const database = await readSystemDatabase();
      const flow = ['Novo', 'Medicao', 'Corte', 'Acabamento', 'Instalacao', 'Concluido'];
      sendJson(
        response,
        200,
        await writeSystemDatabase({
          ...database,
          production: database.production.map((order) => {
            if (order.id !== orderId) return order;
            const currentIndex = flow.indexOf(order.status);
            const nextStatus = flow[Math.min(currentIndex + 1, flow.length - 1)];
            return { ...order, status: nextStatus };
          }),
        })
      );
      return;
    }

    const licenseMatch = pathname.match(/^\/api\/licenses\/([^/]+)(?:\/(.+))?$/);
    if (request.method === 'PATCH' && licenseMatch) {
      const [, licenseId, restPath = ''] = licenseMatch;
      const body = await readBody(request);
      const database = await readDatabase();

      const licenses = database.licenses.map((license) => {
        if (license.id !== licenseId) return license;

        if (restPath === 'regenerate') {
          return { ...license, licenseKey: generateLicenseKey() };
        }

        if (restPath === 'status') {
          const nextStatus = {
            Ativa: 'Suspensa',
            Suspensa: 'Ativa',
            Expirada: 'Ativa',
            Teste: 'Ativa',
          };
          return { ...license, status: nextStatus[license.status] || 'Ativa' };
        }

        if (restPath === 'renew') {
          const months = Math.max(1, Number(body.months) || 1);
          const baseDate = new Date(license.expiresAt);
          const now = new Date();
          const startDate = Number.isNaN(baseDate.getTime()) || baseDate < now ? now : baseDate;
          const renewedDate = new Date(startDate);
          renewedDate.setMonth(renewedDate.getMonth() + months);
          return {
            ...license,
            expiresAt: renewedDate.toISOString().slice(0, 10),
            status: license.status === 'Expirada' ? 'Ativa' : license.status,
            renewalHistory: [
              {
                id: `ren-${Date.now()}`,
                renewedAt: new Date().toISOString().slice(0, 10),
                previousExpiresAt: license.expiresAt,
                nextExpiresAt: renewedDate.toISOString().slice(0, 10),
                monthsAdded: months,
                note: `Renovacao registrada via API por ${months} ${months === 1 ? 'mes' : 'meses'}.`,
              },
              ...license.renewalHistory,
            ],
          };
        }

        if (restPath === 'users') {
          const nextUser = {
            id: `user-${Date.now()}`,
            name: license.contactName || 'Novo usuario',
            email: license.contactEmail || '',
            role: 'Operador',
            status: getActiveUserCount(license) < license.seats ? 'Ativo' : 'Inativo',
            lastAccessAt: new Date().toISOString(),
          };
          const users = [nextUser, ...license.users];
          return { ...license, users, activeUsers: users.filter((user) => user.status === 'Ativo').length };
        }

        const userMatch = restPath.match(/^users\/([^/]+)$/);
        if (userMatch) {
          const userId = userMatch[1];
          const users = license.users.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  ...(body.status ? { status: body.status } : {}),
                  ...(body.role ? { role: body.role } : {}),
                  lastAccessAt: new Date().toISOString(),
                }
              : user
          );
          return { ...license, users, activeUsers: users.filter((user) => user.status === 'Ativo').length };
        }

        return license;
      });

      sendJson(response, 200, await writeDatabase({ licenses }));
      return;
    }

    sendJson(response, 404, { error: 'Rota nao encontrada.' });
  } catch (error) {
    sendJson(response, 500, { error: 'Erro interno.', detail: String(error) });
  }
});

server.listen(port, () => {
  console.log(`License API rodando em http://127.0.0.1:${port}/api`);
});
