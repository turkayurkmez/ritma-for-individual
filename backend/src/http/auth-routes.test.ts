import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AYSE, buildTestDeps, startTestServer } from '../test-support.js';

const json = { 'content-type': 'application/json' };

async function withServer(fn: (s: ReturnType<typeof startTestServer>) => Promise<void>, production = false) {
  const server = startTestServer(buildTestDeps({ production }));
  try {
    await fn(server);
  } finally {
    server.close();
  }
}

const post = (base: string, path: string, body: string) =>
  fetch(`${base}/api/v1${path}`, { method: 'POST', headers: json, body });

test('login succeeds with a token, an HttpOnly cookie and the user', () =>
  withServer(async ({ baseUrl }) => {
    const res = await post(baseUrl, '/auth/login', JSON.stringify(AYSE));
    assert.equal(res.status, 200);
    const body = (await res.json()) as { token: string; user: { email: string } };
    assert.match(body.token, /^[0-9a-f]{64}$/);
    assert.equal(body.user.email, AYSE.email);
    const cookie = res.headers.get('set-cookie') ?? '';
    assert.match(cookie, /ritma_session=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.doesNotMatch(cookie, /Secure/);
  }));

test('the session cookie is Secure in production', () =>
  withServer(async ({ baseUrl }) => {
    const res = await post(baseUrl, '/auth/login', JSON.stringify(AYSE));
    assert.match(res.headers.get('set-cookie') ?? '', /Secure/);
  }, true));

test('login with a wrong password is 401', () =>
  withServer(async ({ baseUrl }) => {
    const res = await post(baseUrl, '/auth/login', JSON.stringify({ ...AYSE, password: 'yanlis' }));
    assert.equal(res.status, 401);
    assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'unauthorized');
  }));

test('login without a usable body is 400', () =>
  withServer(async ({ baseUrl }) => {
    const empty = await fetch(`${baseUrl}/api/v1/auth/login`, { method: 'POST' });
    assert.equal(empty.status, 400);
    const missing = await post(baseUrl, '/auth/login', JSON.stringify({ email: AYSE.email }));
    assert.equal(missing.status, 400);
  }));

test('malformed JSON is 400 validation_error', () =>
  withServer(async ({ baseUrl }) => {
    const res = await post(baseUrl, '/auth/login', '{bozuk');
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'validation_error');
  }));

test('/auth/me works with a Bearer token and with the cookie', () =>
  withServer(async (server) => {
    const { token } = await server.login(AYSE);
    const bearer = await fetch(`${server.baseUrl}/api/v1/auth/me`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(bearer.status, 200);
    assert.equal(((await bearer.json()) as { user: { email: string } }).user.email, AYSE.email);
    const cookie = await fetch(`${server.baseUrl}/api/v1/auth/me`, { headers: { cookie: `a=b; ritma_session=${token}` } });
    assert.equal(cookie.status, 200);
  }));

test('/auth/me without a token or with a bad token is 401', () =>
  withServer(async ({ baseUrl }) => {
    assert.equal((await fetch(`${baseUrl}/api/v1/auth/me`)).status, 401);
    const bad = await fetch(`${baseUrl}/api/v1/auth/me`, { headers: { authorization: 'Bearer uydurma' } });
    assert.equal(bad.status, 401);
  }));

test('a token stops working after logout, which also clears the cookie', () =>
  withServer(async (server) => {
    const { token } = await server.login(AYSE);
    const headers = { authorization: `Bearer ${token}` };
    const out = await fetch(`${server.baseUrl}/api/v1/auth/logout`, { method: 'POST', headers });
    assert.equal(out.status, 204);
    assert.match(out.headers.get('set-cookie') ?? '', /Max-Age=0/);
    assert.equal((await fetch(`${server.baseUrl}/api/v1/auth/me`, { headers })).status, 401);
  }));

test('unknown API paths return a JSON 404', () =>
  withServer(async ({ baseUrl }) => {
    const res = await fetch(`${baseUrl}/api/v1/olmayan`);
    assert.equal(res.status, 404);
    assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'not_found');
  }));
