import { randomBytes } from 'node:crypto';
import type pg from 'pg';
import { createPool } from './db/pool.js';
import { MIGRATIONS_DIR, runMigrations } from './db/migrate.js';

const url = process.env.TEST_DATABASE_URL;

/** TEST_DATABASE_URL tanımlı değilse Postgres testleri atlanır. */
export const testDbEnabled = Boolean(url);

export interface TestDb {
  pool: pg.Pool;
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

  const pool = createPool(url, { max: 1 });
  pool.on('connect', (client) => {
    void client.query(`SET search_path TO ${schema}, public`);
  });
  await runMigrations(pool, MIGRATIONS_DIR);
  return {
    pool,
    reset: async () => {
      await pool.query('TRUNCATE sessions, appointments, customers, users CASCADE');
    },
    close: async () => {
      await pool.end();
      const cleanup = createPool(url, { max: 1 });
      try {
        await cleanup.query(`DROP SCHEMA ${schema} CASCADE`);
      } finally {
        await cleanup.end();
      }
    },
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
