import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../domain/errors.js';
import { MemorySessionStore } from '../repositories/memory/session-store.js';
import { DemoIdentityProvider } from './demo-identity-provider.js';
import { SessionService } from './session-service.js';

const unauthorized = (e: unknown) => e instanceof AppError && e.status === 401;
const ayse = { email: 'ayse@ritma.demo', password: 'demo-ayse-123' };

function setup() {
  return new SessionService(new DemoIdentityProvider(), new MemorySessionStore());
}

test('login returns a token that authenticates the same user', async () => {
  const sessions = setup();
  const { token, user } = await sessions.login(ayse);
  assert.equal(user.email, 'ayse@ritma.demo');
  assert.equal((await sessions.authenticateToken(token)).id, user.id);
});

test('login with bad credentials is unauthorized', async () => {
  await assert.rejects(setup().login({ ...ayse, password: 'yanlis' }), unauthorized);
  await assert.rejects(setup().login({ email: 'yok@ritma.demo', password: 'x' }), unauthorized);
});

test('missing or unknown tokens are unauthorized', async () => {
  const sessions = setup();
  await assert.rejects(sessions.authenticateToken(undefined), unauthorized);
  await assert.rejects(sessions.authenticateToken('rastgele'), unauthorized);
});

test('a token stops working after logout', async () => {
  const sessions = setup();
  const { token } = await sessions.login(ayse);
  await sessions.logout(token);
  await assert.rejects(sessions.authenticateToken(token), unauthorized);
});
