import { randomBytes } from 'node:crypto';
import type pg from 'pg';
import { createPool } from './db/pool.js';
import { MIGRATIONS_DIR, runMigrations } from './db/migrate.js';

const rawUrl = process.env.TEST_DATABASE_URL;
const url = rawUrl ? directDatabaseUrl(rawUrl) : undefined;

/**
 * Neon'un havuzlu (-pooler) adresi PgBouncer üzerinden geçer ve oturum ayarlarını (search_path) korumaz.
 * Testler şemayı bağlantı başlangıcında ayarladığı için doğrudan adres kullanılır.
 */
export function directDatabaseUrl(databaseUrl: string): string {
  const parsed = new URL(databaseUrl);
  parsed.hostname = parsed.hostname.replace('-pooler', '');
  return parsed.toString();
}

/** TEST_DATABASE_URL tanımlı değilse Postgres testleri atlanır. */
export const testDbEnabled = Boolean(url);

export interface TestDb {
  pool: pg.Pool;
  /** Aynı şemaya bağlanan ek bir havuz (gerçek eşzamanlılık testleri için); `close` kapatır. */
  extraPool(): pg.Pool;
  /** Dört veri tablosunu boşaltır. */
  reset(): Promise<void>;
  /** Geçici şemayı siler ve havuzu kapatır. */
  close(): Promise<void>;
}

/**
 * Rastgele adlı geçici bir şema açar, migration'ları uygular. Havuz tek bağlantılıdır;
 * `search_path` her bağlantıda ayarlanır. TEST_DATABASE_URL Neon'un doğrudan (pooled olmayan) adresi olmalı.
 */
export async function openTestDb(): Promise<TestDb> {
  if (!url) throw new Error('TEST_DATABASE_URL tanımlı değil.');
  const schema = `test_${randomBytes(6).toString('hex')}`;
  const admin = createPool(url, { max: 1 });
  await admin.query(`CREATE SCHEMA ${schema}`);
  await admin.end();

  const pool = createPool(url, { max: 1, options: `-c search_path=${schema},public` });
  const extras: pg.Pool[] = [];
  const close = async () => {
    await Promise.all(extras.map((p) => p.end()));
    await pool.end();
    const cleanup = createPool(url, { max: 1 });
    try {
      await cleanup.query(`DROP SCHEMA ${schema} CASCADE`);
    } finally {
      await cleanup.end();
    }
  };
  try {
    // Şema ayarı tutmazsa testler public'e yazmasın.
    const { rows } = await pool.query('SELECT current_schema() AS schema');
    if (rows[0].schema !== schema) throw new Error('Test şeması ayarlanamadı; TEST_DATABASE_URL doğrudan (pooled olmayan) adres olmalı.');
    await runMigrations(pool, MIGRATIONS_DIR);
  } catch (error) {
    await close();
    throw error;
  }
  return {
    pool,
    extraPool: () => {
      const extra = createPool(url, { max: 1, options: `-c search_path=${schema},public` });
      extras.push(extra);
      return extra;
    },
    reset: async () => {
      await pool.query('TRUNCATE sessions, appointments, customers, users CASCADE');
    },
    close,
  };
}

export async function withTestDb(run: (pool: pg.Pool) => Promise<void>): Promise<void> {
  const db = await openTestDb();
  try {
    await run(db.pool);
  } finally {
    await db.close();
  }
}
