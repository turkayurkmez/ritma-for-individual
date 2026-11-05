import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AYSE } from './test-support.js';
import { buildDeps } from './deps.js';

test('without DATABASE_URL buildDeps uses memory and logging in works', async () => {
  const deps = await buildDeps({});
  const { token } = await deps.sessions.login(AYSE);
  assert.match(token, /^[0-9a-f]{64}$/);
});

test('an unreachable DATABASE_URL fails with a clear message that hides the address', async () => {
  await assert.rejects(
    () => buildDeps({ DATABASE_URL: 'postgres://user:secretpw@127.0.0.1:1/db' }),
    (error: Error) => {
      assert.match(error.message, /DATABASE_URL/);
      assert.ok(!error.message.includes('secretpw'));
      assert.ok(!error.message.includes('user:'));
      return true;
    },
  );
});
