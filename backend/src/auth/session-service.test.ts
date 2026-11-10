import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppError, upstreamError } from '../domain/errors.js';
import { MemorySessionStore } from '../repositories/memory/session-store.js';
import { MemoryUserRepository } from '../repositories/memory/user-repository.js';
import { DEMO_USERS, DemoIdentityProvider } from './demo-identity-provider.js';
import type { GoogleIdentity, GoogleTokenVerifier } from './google-token-verifier.js';
import { SessionService } from './session-service.js';

const unauthorized = (e: unknown) => e instanceof AppError && e.status === 401;
const ayse = { email: 'ayse@ritma.demo', password: 'demo-ayse-123' };

function setup() {
  return new SessionService(new DemoIdentityProvider(), new MemorySessionStore(), new MemoryUserRepository(DEMO_USERS));
}

const fakeGoogle = (identity: GoogleIdentity): GoogleTokenVerifier => ({ verify: async () => identity });
const withGoogle = (google?: GoogleTokenVerifier) =>
  new SessionService(new DemoIdentityProvider(), new MemorySessionStore(), new MemoryUserRepository(DEMO_USERS), google);
const status = (code: number) => (e: unknown) => e instanceof AppError && e.status === code;

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

test('loginWithGoogle opens an account on the first sign-in and returns the same user next time', async () => {
  const sessions = withGoogle(fakeGoogle({ sub: 'g-1', email: 'ali@gmail.com', name: 'Ali Veli' }));
  const first = await sessions.loginWithGoogle('kimlik');
  const second = await sessions.loginWithGoogle('kimlik');
  assert.equal(first.user.id, second.user.id);
  assert.equal((await sessions.authenticateToken(first.token)).id, first.user.id);
});

test('the display name falls back to the part of the email before @ when Google gives no name', async () => {
  const noName = withGoogle(fakeGoogle({ sub: 'g-2', email: 'ali.veli@gmail.com' }));
  assert.equal((await noName.loginWithGoogle('k')).user.displayName, 'ali.veli');
  const blankName = withGoogle(fakeGoogle({ sub: 'g-3', email: 'ali.veli@gmail.com', name: '   ' }));
  assert.equal((await blankName.loginWithGoogle('k')).user.displayName, 'ali.veli');
});

test('a Google user stays signed in when demo accounts are off', async () => {
  const sessions = new SessionService(
    { authenticate: async () => undefined },
    new MemorySessionStore(),
    new MemoryUserRepository(),
    fakeGoogle({ sub: 'g-4', email: 'zeynep@gmail.com', name: 'Zeynep' }),
  );
  const { token } = await sessions.loginWithGoogle('k');
  assert.equal((await sessions.authenticateToken(token)).email, 'zeynep@gmail.com');
});

test('loginWithGoogle is not_found when Google sign-in is not configured', async () => {
  await assert.rejects(withGoogle().loginWithGoogle('k'), status(404));
});

test('loginWithGoogle is conflict when the email belongs to a demo user', async () => {
  const sessions = withGoogle(fakeGoogle({ sub: 'g-5', email: 'ayse@ritma.demo', name: 'Ayşe' }));
  await assert.rejects(sessions.loginWithGoogle('k'), status(409));
});

test('verifier errors reach the caller unchanged', async () => {
  const error = upstreamError('Google ulaşılamıyor.');
  const sessions = withGoogle({ verify: async () => { throw error; } });
  await assert.rejects(sessions.loginWithGoogle('k'), (e: unknown) => e === error);
});
