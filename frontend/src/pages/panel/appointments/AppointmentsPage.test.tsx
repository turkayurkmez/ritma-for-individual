import { fireEvent, screen, within } from '@testing-library/react';
import { App } from '../../../App';
import type { Appointment } from '../../../api/types';
import { formatDayLong, todayString, weekDays } from '../../../lib/date';
import { renderApp, stubFetch } from '../../../test-utils';
import { AppointmentsPage } from './AppointmentsPage';

afterEach(() => vi.unstubAllGlobals());

const user = { id: 'u1', email: 'ayse@ritma.demo', displayName: 'Ayşe Yılmaz' };

function makeAppt(
  id: string,
  date: string,
  startTime: string,
  endTime: string,
  firstName: string,
  lastName: string,
  status: Appointment['status'] = 'scheduled',
  note = '',
): Appointment {
  return {
    id,
    userId: 'u1',
    customerId: `c-${id}`,
    date,
    startTime,
    endTime,
    status,
    note,
    customer: { id: `c-${id}`, firstName, lastName },
  };
}

test('requests only the current week and sorts appointments by date and startTime', async () => {
  const today = todayString();
  const days = weekDays(today);
  const from = days[0];
  const to = days[6];
  const otherDay = days[0] === today ? days[6] : days[0];
  const weekUrl = `GET /api/v1/appointments?from=${from}&to=${to}`;

  const appts = [
    makeAppt('a1', today, '14:00', '15:00', 'Zeynep', 'Demir', 'scheduled', 'Kontrol görüşmesi'),
    makeAppt('a2', otherDay, '18:00', '19:00', 'Ali', 'Veli', 'scheduled'),
    makeAppt('a3', today, '09:30', '10:30', 'Ayşe', 'Kaya', 'completed'),
  ];

  const { calls } = stubFetch({
    [weekUrl]: () => ({ body: { appointments: appts } }),
  });

  renderApp(<AppointmentsPage />, { route: '/panel/randevular' });

  expect(await screen.findByText('Ayşe Kaya')).toBeTruthy();
  expect(screen.getByText('Zeynep Demir')).toBeTruthy();
  expect(screen.getByText('Ali Veli')).toBeTruthy();
  expect(screen.getByText('Kontrol görüşmesi')).toBeTruthy();

  const appointmentCalls = calls.filter((c) => c.url.startsWith('/api/v1/appointments'));
  expect(appointmentCalls.map((c) => c.url)).toEqual([
    `/api/v1/appointments?from=${from}&to=${to}`,
  ]);

  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(3);

  const ayseIndex = items.findIndex((el) => el.textContent?.includes('Ayşe Kaya'));
  const zeynepIndex = items.findIndex((el) => el.textContent?.includes('Zeynep Demir'));
  const aliIndex = items.findIndex((el) => el.textContent?.includes('Ali Veli'));

  // Aynı gündeki randevular başlangıç saatine göre sıralanmalı (09:30 < 14:00)
  expect(ayseIndex).toBeLessThan(zeynepIndex);

  // Farklı gündeki randevu tarihe göre doğru sırada olmalı
  if (otherDay < today) {
    expect(aliIndex).toBeLessThan(ayseIndex);
  } else {
    expect(zeynepIndex).toBeLessThan(aliIndex);
  }
});

test('highlights today appointments and shows "Bugün" badge only on today appointments', async () => {
  const today = todayString();
  const days = weekDays(today);
  const from = days[0];
  const to = days[6];
  const otherDay = days[0] === today ? days[1] : days[0];
  const weekUrl = `GET /api/v1/appointments?from=${from}&to=${to}`;

  const appts = [
    makeAppt('a1', today, '10:00', '11:00', 'Ayşe', 'Kaya'),
    makeAppt('a2', otherDay, '12:00', '13:00', 'Mehmet', 'Yılmaz'),
  ];

  stubFetch({
    [weekUrl]: () => ({ body: { appointments: appts } }),
  });

  renderApp(<AppointmentsPage />, { route: '/panel/randevular' });

  expect(await screen.findByText('Ayşe Kaya')).toBeTruthy();
  expect(screen.getByText(formatDayLong(today))).toBeTruthy();
  expect(screen.getByText(formatDayLong(otherDay))).toBeTruthy();

  const items = screen.getAllByRole('listitem');
  const todayItem = items.find((el) => el.textContent?.includes('Ayşe Kaya'))!;
  const otherItem = items.find((el) => el.textContent?.includes('Mehmet Yılmaz'))!;

  expect(todayItem.className).toContain('appointments-item-today');
  expect(within(todayItem).getByText('Bugün')).toBeTruthy();

  expect(otherItem.className).not.toContain('appointments-item-today');
  expect(within(otherItem).queryByText('Bugün')).toBeNull();
});

test('renders via /panel/randevular route in App and handles empty and error states', async () => {
  const today = todayString();
  const days = weekDays(today);
  const weekUrl = `GET /api/v1/appointments?from=${days[0]}&to=${days[6]}`;

  let attempt = 0;
  stubFetch({
    'GET /api/v1/auth/me': () => ({ body: { user } }),
    [weekUrl]: () =>
      ++attempt === 1
        ? { status: 500, body: { error: { code: 'internal', message: 'Sunucu hatası.' } } }
        : { body: { appointments: [] } },
  });

  renderApp(<App />, { route: '/panel/randevular' });

  expect(await screen.findByText('Sunucu hatası.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));
  expect(await screen.findByText('Bu hafta için randevu yok.')).toBeTruthy();
});
