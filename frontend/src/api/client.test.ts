import { ApiError, request, setUnauthorizedHandler } from './client';

function respond(status: number, body?: unknown) {
  const fetchMock = vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
});

test('returns undefined for 204', async () => {
  respond(204);
  expect(await request('/auth/logout', { method: 'POST' })).toBeUndefined();
});

test('decodes a JSON response and sends the body as JSON', async () => {
  const fetchMock = respond(200, { user: { id: 'u1' } });
  const result = await request<{ user: { id: string } }>('/auth/login', { method: 'POST', body: { email: 'a' } });
  expect(result).toEqual({ user: { id: 'u1' } });
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('/api/v1/auth/login');
  expect(init.method).toBe('POST');
  expect(init.body).toBe(JSON.stringify({ email: 'a' }));
});

test('throws ApiError with the backend code and message on 400', async () => {
  respond(400, { error: { code: 'validation_error', message: 'Ad zorunlu.' } });
  const error = await request('/customers').catch((e) => e);
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status: 400, code: 'validation_error', message: 'Ad zorunlu.' });
});

test('turns a rejected fetch into a network error', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('failed'); }));
  const error = await request('/customers').catch((e) => e);
  expect(error).toMatchObject({ status: 0, code: 'network_error', message: 'Sunucuya ulaşılamadı.' });
});

test('calls the unauthorized handler on 401', async () => {
  respond(401, { error: { code: 'unauthorized', message: 'Oturum gerekli.' } });
  const handler = vi.fn();
  setUnauthorizedHandler(handler);
  await request('/customers').catch(() => undefined);
  expect(handler).toHaveBeenCalledTimes(1);
});

test('skips the unauthorized handler when asked', async () => {
  respond(401, { error: { code: 'unauthorized', message: 'Oturum gerekli.' } });
  const handler = vi.fn();
  setUnauthorizedHandler(handler);
  await request('/auth/me', { skipUnauthorizedHandler: true }).catch(() => undefined);
  expect(handler).not.toHaveBeenCalled();
});
