import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { App } from '../../App';
import { renderApp, stubFetch } from '../../test-utils';

afterEach(() => vi.unstubAllGlobals());

const user = { id: 'u1', email: 'ayse@ritma.demo', displayName: 'Ayşe Yılmaz' };
const noSession = { status: 401, body: { error: { code: 'unauthorized', message: 'Oturum gerekli.' } } };

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('E-posta'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Parola'), { target: { value: password } });
}

test('shows the backend message under the form on a wrong password and keeps the email', async () => {
  stubFetch({
    'GET /api/v1/auth/me': () => noSession,
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
