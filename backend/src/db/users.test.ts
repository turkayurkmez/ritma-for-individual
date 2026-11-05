import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { openTestDb, testDbEnabled, type TestDb } from '../test-db.js';
import { upsertUsers } from './users.js';

const skip = !testDbEnabled;
let db: TestDb;
before(async () => {
  if (!skip) db = await openTestDb();
});
after(async () => {
  if (!skip) await db.close();
});

const ayse = { id: 'u1', email: 'ayse@ritma.demo', displayName: 'Ayşe Demir' };

test('upsertUsers is idempotent', { skip }, async () => {
  await db.reset();
  await upsertUsers(db.pool, [ayse]);
  await upsertUsers(db.pool, [ayse]);
  const { rows } = await db.pool.query('SELECT count(*)::int AS n FROM users');
  assert.equal(rows[0].n, 1);
});

test('upsertUsers updates a changed display name', { skip }, async () => {
  await db.reset();
  await upsertUsers(db.pool, [ayse]);
  await upsertUsers(db.pool, [{ ...ayse, displayName: 'Ayşe Kaya' }]);
  const { rows } = await db.pool.query('SELECT display_name FROM users WHERE id = $1', ['u1']);
  assert.equal(rows[0].display_name, 'Ayşe Kaya');
});
