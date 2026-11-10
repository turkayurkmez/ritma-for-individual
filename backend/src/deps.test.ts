import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AYSE } from './test-support.js';
import { AppError } from './domain/errors.js';
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

test('without GOOGLE_CLIENT_ID Google sign-in is not_found', async () => {
  const deps = await buildDeps({});
  await assert.rejects(deps.sessions.loginWithGoogle('x'), (e: unknown) => e instanceof AppError && e.status === 404);
});

test('with demo accounts off nobody can sign in with a password', async () => {
  const deps = await buildDeps({ DEMO_ACCOUNTS_ENABLED: 'false' });
  await assert.rejects(deps.sessions.login(AYSE), (e: unknown) => e instanceof AppError && e.status === 401);
});
