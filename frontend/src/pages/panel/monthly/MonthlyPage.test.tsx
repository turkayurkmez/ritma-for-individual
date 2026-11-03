import { fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import type { Appointment } from '../../../api/types';
import { renderApp, stubFetch } from '../../../test-utils';
import { MonthlyPage } from './MonthlyPage';

afterEach(() => vi.unstubAllGlobals());

function appt(id: string, date: string, status: Appointment['status'] = 'scheduled'): Appointment {
  return {
    id, userId: 'u1', customerId: 'c1', date, startTime: '10:00', endTime: '11:00', status, note: '',
    customer: { id: 'c1', firstName: 'Ayşe', lastName: 'Kaya' },
  };
}

const MONTH = 'GET /api/v1/appointments?from=2026-11-01&to=2026-11-30';
const ROUTE = '/panel/ay?tarih=2026-11-15';

function renderMonthly(route = ROUTE) {
  return renderApp(
    <Routes>
      <Route path="/panel/ay" element={<MonthlyPage />} />
      <Route path="/panel" element={<p>GÜNLÜK SAYFA</p>} />
    </Routes>,
    { route },
  );
}

test('requests the month range and shows the appointment count per day, ignoring cancelled', async () => {
  const { calls } = stubFetch({
    [MONTH]: () => ({
      body: {
        appointments: [
          appt('a1', '2026-11-03'),
          appt('a2', '2026-11-03'),
          appt('a3', '2026-11-03', 'cancelled'),
          appt('a4', '2026-11-30'),
        ],
      },
    }),
  });
  renderMonthly();
  expect(await screen.findByRole('link', { name: '3 Kasım 2026, 2 randevu' })).toBeTruthy();
  expect(screen.getByRole('link', { name: '30 Kasım 2026, 1 randevu' })).toBeTruthy();
  expect(screen.getByRole('link', { name: '4 Kasım 2026, randevu yok' })).toBeTruthy();
  expect(screen.getAllByRole('link')).toHaveLength(30);
  expect(screen.getByText('Kasım 2026')).toBeTruthy();
  expect(calls.filter((c) => c.url.startsWith('/api/v1/appointments')).map((c) => c.url)).toEqual([
    '/api/v1/appointments?from=2026-11-01&to=2026-11-30',
  ]);
});

test('clicking a day goes to the daily view', async () => {
  stubFetch({ [MONTH]: () => ({ body: { appointments: [] } }) });
  renderMonthly();
  fireEvent.click(await screen.findByRole('link', { name: '4 Kasım 2026, randevu yok' }));
  expect(await screen.findByText('GÜNLÜK SAYFA')).toBeTruthy();
});

test('"Sonraki ay" and "Önceki ay" request the neighbouring months (year boundary included)', async () => {
  const { calls } = stubFetch({
    [MONTH]: () => ({ body: { appointments: [] } }),
    'GET /api/v1/appointments?from=2026-12-01&to=2026-12-31': () => ({ body: { appointments: [] } }),
    'GET /api/v1/appointments?from=2027-01-01&to=2027-01-31': () => ({ body: { appointments: [] } }),
  });
  renderMonthly();
  await screen.findByText('Kasım 2026');
  fireEvent.click(screen.getByRole('button', { name: 'Sonraki ay' }));
  await screen.findByText('Aralık 2026');
  fireEvent.click(screen.getByRole('button', { name: 'Sonraki ay' }));
  await screen.findByText('Ocak 2027');
  expect(calls.at(-1)?.url).toBe('/api/v1/appointments?from=2027-01-01&to=2027-01-31');
});

test('shows the error and retries', async () => {
  let attempt = 0;
  stubFetch({
    [MONTH]: () => (++attempt === 1
      ? { status: 500, body: { error: { code: 'internal', message: 'Bir şeyler ters gitti.' } } }
      : { body: { appointments: [appt('a1', '2026-11-03')] } }),
  });
  renderMonthly();
  expect(await screen.findByText('Bir şeyler ters gitti.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));
  expect(await screen.findByRole('link', { name: '3 Kasım 2026, 1 randevu' })).toBeTruthy();
});
