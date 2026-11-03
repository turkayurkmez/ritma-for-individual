import { act, screen } from '@testing-library/react';
import { App } from '../App';
import { request } from '../api/client';
import { addDays, startOfWeek, todayString } from '../lib/date';
import { renderApp, stubFetch } from '../test-utils';

afterEach(() => vi.unstubAllGlobals());

const user = { id: 'u1', email: 'ayse@ritma.demo', displayName: 'Ayşe Yılmaz' };
const unauthorized = { status: 401, body: { error: { code: 'unauthorized', message: 'Oturum gerekli.' } } };

test('shows the protected page when the session is valid', async () => {
  const monday = startOfWeek(todayString());
  stubFetch({
    'GET /api/v1/auth/me': () => ({ body: { user } }),
    [`GET /api/v1/appointments?from=${monday}&to=${addDays(monday, 6)}`]: () => ({ body: { appointments: [] } }),
  });
  renderApp(<App />, { route: '/panel/hafta' });
  expect(await screen.findByRole('button', { name: 'Sonraki hafta' })).toBeTruthy();
});

test('redirects a deep link to the login page when there is no session', async () => {
  stubFetch({ 'GET /api/v1/auth/me': () => unauthorized });
  renderApp(<App />, { route: '/panel/hafta' });
  expect(await screen.findByRole('heading', { name: 'Giriş' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Sonraki hafta' })).toBeNull();
});

test('sends the user to the login page when a request returns 401 mid-session', async () => {
  stubFetch({
    'GET /api/v1/auth/me': () => ({ body: { user } }),
    'GET /api/v1/customers': () => unauthorized,
  });
  renderApp(<App />, { route: '/panel' });
  await screen.findByText(user.displayName);
  await act(async () => {
    await request('/customers').catch(() => undefined);
  });
  expect(await screen.findByRole('heading', { name: 'Giriş' })).toBeTruthy();
});
