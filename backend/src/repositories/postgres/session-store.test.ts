import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { sessionStoreContract } from '../contract/session-store.contract.js';
import { openTestDb, testDbEnabled, type TestDb } from '../../test-db.js';
import { PostgresSessionStore } from './session-store.js';

let db: TestDb;
before(async () => {
  if (testDbEnabled) db = await openTestDb();
});
after(async () => {
  if (testDbEnabled) await db.close();
});

async function seedUser(id: string): Promise<void> {
  await db.pool.query('INSERT INTO users (id, email, display_name) VALUES ($1, $2, $1)', [id, `${id}@test.local`]);
}

sessionStoreContract(
  'postgres',
  async () => {
    await db.reset();
    return { store: new PostgresSessionStore(db.pool), seedUser };
  },
  { skip: !testDbEnabled },
);

test('[postgres] the database stores a SHA-256 digest, never the raw token', { skip: !testDbEnabled }, async () => {
  await db.reset();
  await seedUser('u1');
  const session = await new PostgresSessionStore(db.pool).create('u1');
  const { rows } = await db.pool.query('SELECT token_hash FROM sessions');
  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].token_hash, session.token);
  assert.match(rows[0].token_hash, /^[0-9a-f]{64}$/);
});
