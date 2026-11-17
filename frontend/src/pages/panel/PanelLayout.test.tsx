import { fireEvent, screen } from '@testing-library/react';
import { App } from '../../App';
import { renderApp, stubFetch } from '../../test-utils';

afterEach(() => vi.unstubAllGlobals());

const user = { id: 'u1', email: 'ayse@ritma.demo', displayName: 'Ayşe Yılmaz' };

test('shows the display name and the five tabs', async () => {
  stubFetch({ 'GET /api/v1/auth/me': () => ({ body: { user } }) });
  renderApp(<App />, { route: '/panel' });
  expect(await screen.findByText('Ayşe Yılmaz')).toBeTruthy();
  const hrefs = ['Bugün', 'Hafta', 'Ay', 'Randevular', 'Müşteriler'].map((name) =>
    screen.getByRole('link', { name }).getAttribute('href'),
  );
  expect(hrefs).toEqual(['/panel', '/panel/hafta', '/panel/ay', '/panel/randevular', '/panel/musteriler']);
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

test('shows the trial banner above the panel on the daily and customers tabs', async () => {
  stubFetch({ 'GET /api/v1/auth/me': () => ({ body: { user } }) });
  const first = renderApp(<App />, { route: '/panel' });
  expect(await screen.findByText('İki hafta ücretsiz dene')).toBeTruthy();
  first.unmount();
  renderApp(<App />, { route: '/panel/musteriler' });
  expect(await screen.findByText('İki hafta ücretsiz dene')).toBeTruthy();
});

test('footer updates reminder settings and checks reminders with AI summary preview', async () => {
  const { calls } = stubFetch({
    'GET /api/v1/auth/me': () => ({ body: { user } }),
    'GET /api/v1/settings/reminders': () => ({ body: { reminderMinutesBefore: 30 } }),
    'GET /api/v1/reminders/sent': () => ({ body: [] }),
    'PATCH /api/v1/settings/reminders': () => ({ body: { reminderMinutesBefore: 15 } }),
    'POST /api/v1/reminders/check': () => ({
      body: {
        sentCount: 1,
        notifications: [
          {
            id: 'n1',
            userId: 'u1',
            appointmentId: 'a1',
            recipientEmail: 'ayse@ritma.demo',
            subject: 'Yaklaşan Randevu: Ali Veli (2026-11-17 14:00)',
            body: 'Ali Veli ile son seansta su tüketimi konuşuldu.',
            sentAt: '2026-11-17T13:45:00.000Z',
          },
        ],
      },
    }),
  });

  renderApp(<App />, { route: '/panel' });
  expect(await screen.findByText('Ayşe Yılmaz')).toBeTruthy();

  const select = screen.getByLabelText('Hatırlatma süresi') as HTMLSelectElement;
  fireEvent.change(select, { target: { value: '15' } });
  expect(await screen.findByText('Hatırlatma ayarı kaydedildi.')).toBeTruthy();
  expect(calls.find((c) => c.method === 'PATCH' && c.url === '/api/v1/settings/reminders')?.body).toEqual({
    reminderMinutesBefore: 15,
  });

  fireEvent.click(screen.getByRole('button', { name: 'Şimdi kontrol et' }));
  expect(await screen.findByText('Yaklaşan Randevu: Ali Veli (2026-11-17 14:00)')).toBeTruthy();
  expect(screen.getByText('Ali Veli ile son seansta su tüketimi konuşuldu.')).toBeTruthy();
});
