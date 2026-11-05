import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type pg from 'pg';
import { openTestDb, testDbEnabled } from '../test-db.js';
import { MIGRATIONS_DIR, runMigrations } from './migrate.js';

const skip = !testDbEnabled;

let db: Awaited<ReturnType<typeof openTestDb>>;
before(async () => {
  if (!skip) db = await openTestDb();
});
after(async () => {
  if (!skip) await db.close();
});

async function tableNames(pool: pg.Pool): Promise<string[]> {
  const { rows } = await pool.query(
    'select table_name from information_schema.tables where table_schema = current_schema() order by 1',
  );
  return rows.map((r) => r.table_name);
}

test('the initial migration creates every table and a second run does nothing', { skip }, async () => {
  const names = await tableNames(db.pool);
  for (const table of ['users', 'customers', 'appointments', 'sessions', 'schema_migrations']) {
    assert.ok(names.includes(table), `${table} tablosu yok`);
  }
  assert.deepEqual(await runMigrations(db.pool, MIGRATIONS_DIR), []);
});

test('a failing migration is rolled back, not recorded, and stops the run', { skip }, async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ritma-migrations-'));
  writeFileSync(path.join(dir, '001_ok.sql'), 'create table t1(id int);');
  writeFileSync(path.join(dir, '002_bad.sql'), 'create table t2(id int); select 1/0;');
  await assert.rejects(() => runMigrations(db.pool, dir));
  const names = await tableNames(db.pool);
  assert.ok(names.includes('t1'));
  assert.ok(!names.includes('t2'));
  const { rows } = await db.pool.query("select name from schema_migrations where name like '00%\\_%.sql' escape '\\' and name in ('001_ok.sql','002_bad.sql')");
  assert.deepEqual(rows.map((r) => r.name), ['001_ok.sql']);
});

test('date and time columns come back as plain strings', { skip }, async () => {
  const { rows } = await db.pool.query("select '2000-01-01'::date as d, '09:30'::time as t");
  assert.deepEqual(rows[0], { d: '2000-01-01', t: '09:30' });
});
