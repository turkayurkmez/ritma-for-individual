import type { AppDeps } from './app.js';
import { DEMO_USERS, DemoIdentityProvider } from './auth/demo-identity-provider.js';
import type { IdentityProvider } from './auth/identity-provider.js';
import { createTokeninfoVerifier } from './auth/google-token-verifier.js';
import { SessionService } from './auth/session-service.js';
import { loadConfig } from './config.js';
import { createPool } from './db/pool.js';
import { upsertUsers } from './db/users.js';
import { MemoryAppointmentRepository } from './repositories/memory/appointment-repository.js';
import { MemoryCustomerRepository } from './repositories/memory/customer-repository.js';
import { MemorySessionStore } from './repositories/memory/session-store.js';
import { MemoryUserRepository } from './repositories/memory/user-repository.js';
import { PostgresAppointmentRepository } from './repositories/postgres/appointment-repository.js';
import { PostgresCustomerRepository } from './repositories/postgres/customer-repository.js';
import { PostgresSessionStore } from './repositories/postgres/session-store.js';
import { PostgresUserRepository } from './repositories/postgres/user-repository.js';
import type { AppointmentRepository, CustomerRepository, SessionStore, UserRepository } from './repositories/types.js';
import { AppointmentService } from './services/appointment-service.js';
import { CustomerService } from './services/customer-service.js';

/** Demo hesaplar kapalıyken hiç kimse giriş yapamaz. */
const noIdentityProvider: IdentityProvider = {
  authenticate: async () => undefined,
};

interface Stores {
  customers: CustomerRepository;
  appointments: AppointmentRepository;
  sessions: SessionStore;
  users: UserRepository;
}

/** DATABASE_URL varsa Postgres, yoksa bellek. Bağlantı kurulamazsa adresi göstermeden hata verir. */
async function buildStores(databaseUrl: string | undefined, seedDemoUsers: boolean): Promise<Stores> {
  if (!databaseUrl) {
    return {
      customers: new MemoryCustomerRepository(),
      appointments: new MemoryAppointmentRepository(),
      sessions: new MemorySessionStore(),
      users: new MemoryUserRepository(seedDemoUsers ? DEMO_USERS : []),
    };
  }
  const pool = createPool(databaseUrl);
  try {
    await pool.query('SELECT 1');
  } catch {
    await pool.end().catch(() => {});
    throw new Error('Veritabanına bağlanılamadı. backend/.env içindeki DATABASE_URL değerini ve ağ erişimini kontrol et.');
  }
  if (seedDemoUsers) await upsertUsers(pool, DEMO_USERS);
  return {
    customers: new PostgresCustomerRepository(pool),
    appointments: new PostgresAppointmentRepository(pool),
    sessions: new PostgresSessionStore(pool),
    users: new PostgresUserRepository(pool),
  };
}

export async function buildDeps(env: NodeJS.ProcessEnv): Promise<AppDeps> {
  const config = loadConfig(env);
  const stores = await buildStores(config.databaseUrl, config.demoAccountsEnabled);
  if (!config.demoAccountsEnabled) await stores.sessions.deleteByUserIds(DEMO_USERS.map((u) => u.id));
  const provider = config.demoAccountsEnabled ? new DemoIdentityProvider() : noIdentityProvider;
  return {
    sessions: new SessionService(
      provider,
      stores.sessions,
      stores.users,
      config.googleClientId ? createTokeninfoVerifier(config.googleClientId) : undefined,
    ),
    customers: new CustomerService(stores.customers),
    appointments: new AppointmentService(stores.appointments, stores.customers),
    production: config.production,
    googleClientId: config.googleClientId,
  };
}
