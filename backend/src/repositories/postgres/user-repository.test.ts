import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { userRepositoryContract } from '../contract/user-repository.contract.js';
import { openTestDb, testDbEnabled, type TestDb } from '../../test-db.js';
import { PostgresUserRepository } from './user-repository.js';

let db: TestDb;
before(async () => {
  if (testDbEnabled) db = await openTestDb();
});
after(async () => {
  if (testDbEnabled) await db.close();
});

userRepositoryContract(
  'postgres',
  async () => {
    await db.reset();
    return { repo: new PostgresUserRepository(db.pool) };
  },
  { skip: !testDbEnabled },
);

test('[postgres] a demo user row with the same email blocks the Google account', { skip: !testDbEnabled }, async () => {
  await db.reset();
  await db.pool.query("INSERT INTO users (id, email, display_name) VALUES ('demo-user-ayse', 'ayse@ritma.demo', 'Ayşe Demir')");
  const repo = new PostgresUserRepository(db.pool);
  assert.equal(
    await repo.findOrCreateByGoogle({ googleSub: 'x', email: 'AYSE@ritma.demo', displayName: 'Başkası' }),
    undefined,
  );
});
