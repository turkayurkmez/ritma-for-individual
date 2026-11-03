import { fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import type { Appointment } from '../../../api/types';
import { renderApp, stubFetch } from '../../../test-utils';
import { WeeklyPage } from './WeeklyPage';

afterEach(() => vi.unstubAllGlobals());

function appt(id: string, date: string, startTime: string, first: string, status: Appointment['status'] = 'scheduled'): Appointment {
  return {
    id, userId: 'u1', customerId: `c-${first}`, date, startTime, endTime: '23:00', status, note: '',
    customer: { id: `c-${first}`, firstName: first, lastName: 'Kaya' },
  };
}

// 2026-11-04 Çarşamba → hafta 2026-11-02 (Pzt) … 2026-11-08 (Paz)
const WEEK = 'GET /api/v1/appointments?from=2026-11-02&to=2026-11-08';
const ROUTE = '/panel/hafta?tarih=2026-11-04';

function renderWeekly(route = ROUTE) {
  return renderApp(
    <Routes>
      <Route path="/panel/hafta" element={<WeeklyPage />} />
      <Route path="/panel" element={<p>GÜNLÜK SAYFA</p>} />
    </Routes>,
    { route },
  );
}

test('requests Monday to Sunday and lists each day\'s appointments with time and name', async () => {
  const { calls } = stubFetch({
    [WEEK]: () => ({
      body: { appointments: [appt('a1', '2026-11-02', '09:00', 'Ayşe'), appt('a2', '2026-11-08', '14:30', 'Ali')] },
    }),
  });
  renderWeekly();
  expect(await screen.findByText('09:00 Ayşe Kaya')).toBeTruthy();
  expect(screen.getByText('14:30 Ali Kaya')).toBeTruthy();
  expect(calls.filter((c) => c.url.startsWith('/api/v1/appointments')).map((c) => c.url)).toEqual([
    '/api/v1/appointments?from=2026-11-02&to=2026-11-08',
  ]);
  expect(screen.getAllByRole('link')).toHaveLength(7);
});

test('a Sunday appointment belongs to the week that ends on that Sunday', async () => {
  stubFetch({ [WEEK]: () => ({ body: { appointments: [appt('a2', '2026-11-08', '14:30', 'Ali')] } }) });
  renderWeekly('/panel/hafta?tarih=2026-11-08');
  expect(await screen.findByText('14:30 Ali Kaya')).toBeTruthy();
});

test('clicking a day goes to the daily view with ?tarih=', async () => {
  stubFetch({ [WEEK]: () => ({ body: { appointments: [] } }) });
  renderWeekly();
  fireEvent.click(await screen.findByRole('link', { name: /4 Kasım/ }));
  expect(await screen.findByText('GÜNLÜK SAYFA')).toBeTruthy();
});

test('"Sonraki hafta" requests the following week', async () => {
  const { calls } = stubFetch({
    [WEEK]: () => ({ body: { appointments: [] } }),
    'GET /api/v1/appointments?from=2026-11-09&to=2026-11-15': () => ({ body: { appointments: [] } }),
  });
  renderWeekly();
  await screen.findByText('Bu hafta için randevu yok.');
  fireEvent.click(screen.getByRole('button', { name: 'Sonraki hafta' }));
  await screen.findByText('9 Kasım – 15 Kasım 2026');
  expect(calls.at(-1)?.url).toBe('/api/v1/appointments?from=2026-11-09&to=2026-11-15');
});

test('shows an empty message', async () => {
  stubFetch({ [WEEK]: () => ({ body: { appointments: [] } }) });
  renderWeekly();
  expect(await screen.findByText('Bu hafta için randevu yok.')).toBeTruthy();
});

test('shows the error and retries', async () => {
  let attempt = 0;
  stubFetch({
    [WEEK]: () => (++attempt === 1
      ? { status: 500, body: { error: { code: 'internal', message: 'Bir şeyler ters gitti.' } } }
      : { body: { appointments: [appt('a1', '2026-11-02', '09:00', 'Ayşe')] } }),
  });
  renderWeekly();
  expect(await screen.findByText('Bir şeyler ters gitti.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));
  expect(await screen.findByText('09:00 Ayşe Kaya')).toBeTruthy();
});
