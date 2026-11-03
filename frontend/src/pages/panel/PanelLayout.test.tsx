import { fireEvent, screen } from '@testing-library/react';
import { App } from '../../App';
import { renderApp, stubFetch } from '../../test-utils';

afterEach(() => vi.unstubAllGlobals());

const user = { id: 'u1', email: 'ayse@ritma.demo', displayName: 'Ayşe Yılmaz' };

test('shows the display name and the four tabs', async () => {
  stubFetch({ 'GET /api/v1/auth/me': () => ({ body: { user } }) });
  renderApp(<App />, { route: '/panel' });
  expect(await screen.findByText('Ayşe Yılmaz')).toBeTruthy();
  const hrefs = ['Bugün', 'Hafta', 'Ay', 'Müşteriler'].map((name) =>
    screen.getByRole('link', { name }).getAttribute('href'),
  );
  expect(hrefs).toEqual(['/panel', '/panel/hafta', '/panel/ay', '/panel/musteriler']);
});

test('Çıkış calls logout and returns to the login page', async () => {
  const { calls } = stubFetch({
    'GET /api/v1/auth/me': () => ({ body: { user } }),
    'POST /api/v1/auth/logout': () => ({ status: 204 }),
  });
  renderApp(<App />, { route: '/panel' });
  await screen.findByText('Ayşe Yılmaz');
  fireEvent.click(screen.getByRole('button', { name: 'Çıkış' }));
  expect(await screen.findByRole('heading', { name: 'Giriş' })).toBeTruthy();
  expect(calls.some((c) => c.method === 'POST' && c.url === '/api/v1/auth/logout')).toBe(true);
});
