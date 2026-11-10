import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { App } from '../../App';
import { renderApp, stubFetch } from '../../test-utils';

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as unknown as { google?: unknown }).google;
});

function fakeGoogle() {
  const id = { initialize: vi.fn(), renderButton: vi.fn() };
  (window as unknown as { google?: unknown }).google = { accounts: { id } };
  return id;
}

const user = { id: 'u1', email: 'ayse@ritma.demo', displayName: 'Ayşe Yılmaz' };
const noSession = { status: 401, body: { error: { code: 'unauthorized', message: 'Oturum gerekli.' } } };

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('E-posta'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Parola'), { target: { value: password } });
}

test('shows the backend message under the form on a wrong password and keeps the email', async () => {
  stubFetch({
    'GET /api/v1/auth/me': () => noSession,
    'GET /api/v1/auth/config': () => ({ body: { googleClientId: null } }),
    'POST /api/v1/auth/login': () => ({
      status: 401,
      body: { error: { code: 'unauthorized', message: 'E-posta veya parola hatalı.' } },
    }),
  });
  renderApp(<App />, { route: '/giris' });
  await screen.findByLabelText('E-posta');
  fill('ayse@ritma.demo', 'yanlis');
  fireEvent.click(screen.getByRole('button', { name: 'Giriş yap' }));
  expect(await screen.findByText('E-posta veya parola hatalı.')).toBeTruthy();
  expect((screen.getByLabelText('E-posta') as HTMLInputElement).value).toBe('ayse@ritma.demo');
  expect(screen.getByRole('heading', { name: 'Giriş' })).toBeTruthy();
});

test('goes to the panel after a successful login', async () => {
  stubFetch({
    'GET /api/v1/auth/me': () => noSession,
    'GET /api/v1/auth/config': () => ({ body: { googleClientId: null } }),
    'POST /api/v1/auth/login': () => ({ body: { token: 't', user } }),
  });
  renderApp(<App />, { route: '/giris' });
  await screen.findByLabelText('E-posta');
  fill('ayse@ritma.demo', 'demo-ayse-123');
  fireEvent.click(screen.getByRole('button', { name: 'Giriş yap' }));
  expect(await screen.findByText('Ayşe Yılmaz')).toBeTruthy();
});

test('disables the button while the request is in flight and sends only one request', async () => {
  let finish: () => void = () => undefined;
  const { calls } = stubFetch({
    'GET /api/v1/auth/me': () => noSession,
    'GET /api/v1/auth/config': () => ({ body: { googleClientId: null } }),
    'POST /api/v1/auth/login': () =>
      new Promise((resolve) => {
        finish = () => resolve({ body: { token: 't', user } });
      }),
  });
  renderApp(<App />, { route: '/giris' });
  await screen.findByLabelText('E-posta');
  fill('ayse@ritma.demo', 'demo-ayse-123');
  const button = screen.getByRole('button', { name: 'Giriş yap' }) as HTMLButtonElement;
  fireEvent.click(button);
  await waitFor(() => expect(button.disabled).toBe(true));
  fireEvent.click(button);
  expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1);
  await act(async () => finish());
  await screen.findByText('Ayşe Yılmaz');
});

test('shows no Google button and no divider when the server has no Client ID', async () => {
  stubFetch({
    'GET /api/v1/auth/me': () => noSession,
    'GET /api/v1/auth/config': () => ({ body: { googleClientId: null } }),
  });
  renderApp(<App />, { route: '/giris' });
  await screen.findByLabelText('E-posta');
  await new Promise((r) => setTimeout(r, 10));
  expect(screen.queryByText('veya demo hesapla')).toBeNull();
});

test('shows the Google button and the divider when a Client ID is configured', async () => {
  fakeGoogle();
  stubFetch({
    'GET /api/v1/auth/me': () => noSession,
    'GET /api/v1/auth/config': () => ({ body: { googleClientId: 'cid' } }),
  });
  renderApp(<App />, { route: '/giris' });
  expect(await screen.findByText('veya demo hesapla')).toBeTruthy();
  expect(screen.getByLabelText('E-posta')).toBeTruthy();
  expect(screen.getByLabelText('Parola')).toBeTruthy();
});

test('signs in with the Google credential and goes to the panel', async () => {
  const id = fakeGoogle();
  const { calls } = stubFetch({
    'GET /api/v1/auth/me': () => noSession,
    'GET /api/v1/auth/config': () => ({ body: { googleClientId: 'cid' } }),
    'POST /api/v1/auth/google': () => ({ body: { token: 't', user } }),
  });
  renderApp(<App />, { route: '/giris' });
  await screen.findByText('veya demo hesapla');
  await act(async () => id.initialize.mock.calls[0][0].callback({ credential: 'abc' }));
  expect(await screen.findByText('Ayşe Yılmaz')).toBeTruthy();
  expect(calls.find((c) => c.url === '/api/v1/auth/google')?.body).toEqual({ credential: 'abc' });
});

test('shows the backend message when Google sign-in fails', async () => {
  const id = fakeGoogle();
  stubFetch({
    'GET /api/v1/auth/me': () => noSession,
    'GET /api/v1/auth/config': () => ({ body: { googleClientId: 'cid' } }),
    'POST /api/v1/auth/google': () => ({
      status: 401,
      body: { error: { code: 'unauthorized', message: 'Google kimliği geçersiz ya da süresi dolmuş.' } },
    }),
  });
  renderApp(<App />, { route: '/giris' });
  await screen.findByText('veya demo hesapla');
  await act(async () => id.initialize.mock.calls[0][0].callback({ credential: 'abc' }));
  expect(await screen.findByText('Google kimliği geçersiz ya da süresi dolmuş.')).toBeTruthy();
  expect(screen.getByLabelText('E-posta')).toBeTruthy();
});

test('still shows the form when the config request fails', async () => {
  stubFetch({
    'GET /api/v1/auth/me': () => noSession,
    'GET /api/v1/auth/config': () => {
      throw new Error('ağ yok');
    },
  });
  renderApp(<App />, { route: '/giris' });
  await screen.findByLabelText('E-posta');
  await new Promise((r) => setTimeout(r, 10));
  expect(screen.queryByText('veya demo hesapla')).toBeNull();
  expect(screen.getByRole('button', { name: 'Giriş yap' })).toBeTruthy();
});
