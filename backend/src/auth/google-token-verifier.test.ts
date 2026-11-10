import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTokeninfoVerifier } from './google-token-verifier.js';
import { AppError } from '../domain/errors.js';

const NOW = 1_800_000_000_000;
const CREDENTIAL = 'secret.credential+value/with=chars';
const INVALID = 'Google kimliği geçersiz ya da süresi dolmuş.';
const UNVERIFIED = 'Google hesabının e-postası doğrulanmamış.';
const UNREACHABLE = 'Google ile bağlantı kurulamadı, biraz sonra tekrar dene.';

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    aud: 'cid',
    iss: 'https://accounts.google.com',
    sub: 's1',
    email: 'a@gmail.com',
    email_verified: 'true',
    name: 'Ayşe',
    exp: String(Math.floor(NOW / 1000) + 3600),
    ...overrides,
  };
}

function jsonFetch(body: unknown, status = 200): typeof fetch {
  return (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;
}

function verifierWith(fetchImpl: typeof fetch, timeoutMs?: number) {
  return createTokeninfoVerifier('cid', { fetch: fetchImpl, now: () => NOW, timeoutMs });
}

async function expectAppError(promise: Promise<unknown>, status: number, code: string, message: string) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.status, status);
    assert.equal(error.code, code);
    assert.equal(error.message, message);
    assert.ok(!error.message.includes(CREDENTIAL));
    return true;
  });
}

test('returns the identity for a valid token and asks tokeninfo with the encoded id_token', async () => {
  let called = '';
  const fake = (async (url: string | URL | Request) => {
    called = String(url);
    return new Response(JSON.stringify(validBody()), { status: 200 });
  }) as typeof fetch;
  const identity = await verifierWith(fake).verify(CREDENTIAL);
  assert.equal(called, 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(CREDENTIAL));
  assert.deepEqual(identity, { sub: 's1', email: 'a@gmail.com', name: 'Ayşe' });
});

test('accepts iss "accounts.google.com" without the scheme', async () => {
  const identity = await verifierWith(jsonFetch(validBody({ iss: 'accounts.google.com' }))).verify(CREDENTIAL);
  assert.equal(identity.sub, 's1');
});

test('leaves name undefined when it is missing or empty', async () => {
  const missing = await verifierWith(jsonFetch(validBody({ name: undefined }))).verify(CREDENTIAL);
  assert.equal(missing.name, undefined);
  const empty = await verifierWith(jsonFetch(validBody({ name: '' }))).verify(CREDENTIAL);
  assert.equal(empty.name, undefined);
});

test('rejects a token that Google calls invalid (HTTP 400) with 401', async () => {
  await expectAppError(
    verifierWith(jsonFetch({ error: 'invalid_token' }, 400)).verify(CREDENTIAL),
    401,
    'unauthorized',
    INVALID,
  );
});

test('rejects a token issued for another client id with the same generic message', async () => {
  await expectAppError(
    verifierWith(jsonFetch(validBody({ aud: 'other-client' }))).verify(CREDENTIAL),
    401,
    'unauthorized',
    INVALID,
  );
});

test('rejects an unknown issuer', async () => {
  await expectAppError(
    verifierWith(jsonFetch(validBody({ iss: 'https://evil.example.com' }))).verify(CREDENTIAL),
    401,
    'unauthorized',
    INVALID,
  );
});

test('rejects an expired token', async () => {
  await expectAppError(
    verifierWith(jsonFetch(validBody({ exp: String(Math.floor(NOW / 1000) - 10) }))).verify(CREDENTIAL),
    401,
    'unauthorized',
    INVALID,
  );
});

test('rejects a token with a missing or non-numeric exp', async () => {
  await expectAppError(
    verifierWith(jsonFetch(validBody({ exp: undefined }))).verify(CREDENTIAL),
    401,
    'unauthorized',
    INVALID,
  );
  await expectAppError(
    verifierWith(jsonFetch(validBody({ exp: 'soon' }))).verify(CREDENTIAL),
    401,
    'unauthorized',
    INVALID,
  );
});

test('rejects an unverified email with its own message', async () => {
  await expectAppError(
    verifierWith(jsonFetch(validBody({ email_verified: 'false' }))).verify(CREDENTIAL),
    401,
    'unauthorized',
    UNVERIFIED,
  );
  await expectAppError(
    verifierWith(jsonFetch(validBody({ email_verified: undefined }))).verify(CREDENTIAL),
    401,
    'unauthorized',
    UNVERIFIED,
  );
});

test('rejects a response without sub or email', async () => {
  await expectAppError(
    verifierWith(jsonFetch(validBody({ sub: undefined }))).verify(CREDENTIAL),
    401,
    'unauthorized',
    INVALID,
  );
  await expectAppError(
    verifierWith(jsonFetch(validBody({ email: undefined }))).verify(CREDENTIAL),
    401,
    'unauthorized',
    INVALID,
  );
});

test('rejects a JSON body that is not an object', async () => {
  await expectAppError(verifierWith(jsonFetch(null)).verify(CREDENTIAL), 401, 'unauthorized', INVALID);
});

test('maps a network failure, a 5xx, a non-JSON 200 body and a timeout to 502 upstream_error', async () => {
  const networkFailure = (async () => {
    throw new TypeError(`fetch failed for ${CREDENTIAL}`);
  }) as typeof fetch;
  await expectAppError(verifierWith(networkFailure).verify(CREDENTIAL), 502, 'upstream_error', UNREACHABLE);

  await expectAppError(
    verifierWith(jsonFetch({ error: 'down' }, 503)).verify(CREDENTIAL),
    502,
    'upstream_error',
    UNREACHABLE,
  );

  const nonJson = (async () => new Response('<html>oops</html>', { status: 200 })) as typeof fetch;
  await expectAppError(verifierWith(nonJson).verify(CREDENTIAL), 502, 'upstream_error', UNREACHABLE);

  const hanging = ((_url: unknown, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
    })) as typeof fetch;
  await expectAppError(verifierWith(hanging, 20).verify(CREDENTIAL), 502, 'upstream_error', UNREACHABLE);
});
