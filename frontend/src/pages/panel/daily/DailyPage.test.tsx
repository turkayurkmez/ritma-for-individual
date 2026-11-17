import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { Appointment, Customer } from '../../../api/types';
import { renderApp, stubFetch } from '../../../test-utils';
import { DailyPage } from './DailyPage';

afterEach(() => vi.unstubAllGlobals());

const ayse: Customer = {
  id: 'c1', userId: 'u1', firstName: 'Ayşe', lastName: 'Kaya',
  birthDate: '1985-05-05', gender: 'female', deletedAt: null,
};
const ali: Customer = { ...ayse, id: 'c2', firstName: 'Ali', lastName: 'Veli', gender: 'male' };

const appt: Appointment = {
  id: 'a1', userId: 'u1', customerId: 'c1', date: '2026-11-03',
  startTime: '10:00', endTime: '11:00', status: 'scheduled', note: 'İlk görüşme',
  customer: { id: 'c1', firstName: 'Ayşe', lastName: 'Kaya' },
};

const DAY = 'GET /api/v1/appointments?from=2026-11-03&to=2026-11-03';
const CUSTOMERS = 'GET /api/v1/customers';
const ROUTE = '/panel?tarih=2026-11-03';

function appointmentCalls(calls: { method: string; url: string }[]) {
  return calls.filter((c) => c.url.startsWith('/api/v1/appointments'));
}

test('requests the day from ?tarih= and shows time, name, status and note', async () => {
  const { calls } = stubFetch({ [DAY]: () => ({ body: { appointments: [appt] } }) });
  renderApp(<DailyPage />, { route: ROUTE });
  expect(await screen.findByText('Ayşe Kaya')).toBeTruthy();
  expect(screen.getByText('10:00–11:00')).toBeTruthy();
  expect(screen.getByText('Planlandı')).toBeTruthy();
  expect(screen.getByText('İlk görüşme')).toBeTruthy();
  expect(screen.getByText('3 Kasım 2026 Salı')).toBeTruthy();
  expect(appointmentCalls(calls).map((c) => c.url)).toEqual([
    '/api/v1/appointments?from=2026-11-03&to=2026-11-03',
  ]);
});

test('"Sonraki gün" requests the next day', async () => {
  const { calls } = stubFetch({
    [DAY]: () => ({ body: { appointments: [appt] } }),
    'GET /api/v1/appointments?from=2026-11-04&to=2026-11-04': () => ({ body: { appointments: [] } }),
  });
  renderApp(<DailyPage />, { route: ROUTE });
  await screen.findByText('Ayşe Kaya');
  fireEvent.click(screen.getByRole('button', { name: 'Sonraki gün' }));
  expect(await screen.findByText('Bu gün için randevu yok.')).toBeTruthy();
  expect(appointmentCalls(calls).at(-1)?.url).toBe('/api/v1/appointments?from=2026-11-04&to=2026-11-04');
  expect(screen.getByText('4 Kasım 2026 Çarşamba')).toBeTruthy();
});

test('shows an empty message', async () => {
  stubFetch({ [DAY]: () => ({ body: { appointments: [] } }) });
  renderApp(<DailyPage />, { route: ROUTE });
  expect(await screen.findByText('Bu gün için randevu yok.')).toBeTruthy();
});

test('shows the error and retries', async () => {
  let attempt = 0;
  stubFetch({
    [DAY]: () => (++attempt === 1
      ? { status: 500, body: { error: { code: 'internal', message: 'Bir şeyler ters gitti.' } } }
      : { body: { appointments: [appt] } }),
  });
  renderApp(<DailyPage />, { route: ROUTE });
  expect(await screen.findByText('Bir şeyler ters gitti.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));
  expect(await screen.findByText('Ayşe Kaya')).toBeTruthy();
});

test('shows the customer name from the appointment even if the customer is deleted', async () => {
  stubFetch({
    [DAY]: () => ({
      body: { appointments: [{ ...appt, customerId: 'gone', customer: { id: 'gone', firstName: 'Silik', lastName: 'Kişi' } }] },
    }),
  });
  renderApp(<DailyPage />, { route: ROUTE });
  expect(await screen.findByText('Silik Kişi')).toBeTruthy();
});

test('edit form lists a deleted customer with a "(silinmiş)" suffix', async () => {
  stubFetch({
    [DAY]: () => ({
      body: { appointments: [{ ...appt, customerId: 'gone', customer: { id: 'gone', firstName: 'Silik', lastName: 'Kişi' } }] },
    }),
    [CUSTOMERS]: () => ({ body: { customers: [ayse, ali] } }),
  });
  renderApp(<DailyPage />, { route: ROUTE });
  fireEvent.click(await screen.findByRole('button', { name: '10:00 Silik Kişi düzenle' }));
  const dialog = screen.getByRole('dialog');
  expect(await within(dialog).findByRole('option', { name: 'Silik Kişi (silinmiş)' })).toBeTruthy();
  const select = within(dialog).getByLabelText('Müşteri') as HTMLSelectElement;
  expect(select.value).toBe('gone');
  expect(within(dialog).getByRole('option', { name: 'Ali Veli' })).toBeTruthy();
});

async function openAddForm() {
  fireEvent.click(await screen.findByRole('button', { name: 'Randevu ekle' }));
  const dialog = screen.getByRole('dialog');
  await within(dialog).findByRole('option', { name: 'Ali Veli' });
  return dialog;
}

function fillForm(dialog: HTMLElement, start: string, end: string) {
  fireEvent.change(within(dialog).getByLabelText('Müşteri'), { target: { value: 'c2' } });
  fireEvent.change(within(dialog).getByLabelText('Başlangıç'), { target: { value: start } });
  fireEvent.change(within(dialog).getByLabelText('Bitiş'), { target: { value: end } });
  fireEvent.change(within(dialog).getByLabelText('Not'), { target: { value: 'Not metni' } });
}

test('keeps the form open with the backend message and values on a 409', async () => {
  stubFetch({
    [DAY]: () => ({ body: { appointments: [] } }),
    [CUSTOMERS]: () => ({ body: { customers: [ayse, ali] } }),
    'POST /api/v1/appointments': () => ({
      status: 409,
      body: { error: { code: 'conflict', message: 'Bu saatte başka bir randevu var.' } },
    }),
  });
  renderApp(<DailyPage />, { route: ROUTE });
  const dialog = await openAddForm();
  fillForm(dialog, '10:00', '11:00');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
  expect(await within(dialog).findByText('Bu saatte başka bir randevu var.')).toBeTruthy();
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect((within(dialog).getByLabelText('Başlangıç') as HTMLInputElement).value).toBe('10:00');
  expect((within(dialog).getByLabelText('Not') as HTMLTextAreaElement).value).toBe('Not metni');
  expect((within(dialog).getByLabelText('Müşteri') as HTMLSelectElement).value).toBe('c2');
  expect((within(dialog).getByRole('button', { name: 'Kaydet' }) as HTMLButtonElement).disabled).toBe(false);
});

test('double-clicking Kaydet sends one POST, then closes and reloads the day', async () => {
  let finish: () => void = () => undefined;
  let created = false;
  const newAppt: Appointment = {
    ...appt, id: 'a2', customerId: 'c2', startTime: '12:00', endTime: '13:00', note: 'Not metni',
    customer: { id: 'c2', firstName: 'Ali', lastName: 'Veli' },
  };
  const { calls } = stubFetch({
    [DAY]: () => ({ body: { appointments: created ? [newAppt] : [] } }),
    [CUSTOMERS]: () => ({ body: { customers: [ayse, ali] } }),
    'POST /api/v1/appointments': () =>
      new Promise((resolve) => {
        finish = () => { created = true; resolve({ status: 201, body: { appointment: newAppt } }); };
      }),
  });
  renderApp(<DailyPage />, { route: ROUTE });
  const dialog = await openAddForm();
  fillForm(dialog, '12:00', '13:00');
  const save = within(dialog).getByRole('button', { name: 'Kaydet' }) as HTMLButtonElement;
  fireEvent.click(save);
  await waitFor(() => expect(save.disabled).toBe(true));
  fireEvent.click(save);
  const posts = calls.filter((c) => c.method === 'POST');
  expect(posts).toHaveLength(1);
  expect(posts[0].body).toEqual({
    customerId: 'c2', date: '2026-11-03', startTime: '12:00', endTime: '13:00',
    status: 'scheduled', note: 'Not metni',
  });
  await act(async () => { finish(); });
  expect(await screen.findByText('12:00–13:00')).toBeTruthy();
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('"İptal et" asks first, then PATCHes status cancelled', async () => {
  const { calls } = stubFetch({
    [DAY]: () => ({ body: { appointments: [appt] } }),
    'PATCH /api/v1/appointments/a1': () => ({ body: { appointment: { ...appt, status: 'cancelled' } } }),
  });
  renderApp(<DailyPage />, { route: ROUTE });
  fireEvent.click(await screen.findByRole('button', { name: '10:00 Ayşe Kaya iptal et' }));
  expect(calls.some((c) => c.method === 'PATCH')).toBe(false);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'İptal et' }));
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ status: 'cancelled' });
});

test('"Sil" asks first, then calls DELETE', async () => {
  let deleted = false;
  const { calls } = stubFetch({
    [DAY]: () => ({ body: { appointments: deleted ? [] : [appt] } }),
    'DELETE /api/v1/appointments/a1': () => { deleted = true; return {}; },
  });
  renderApp(<DailyPage />, { route: ROUTE });
  fireEvent.click(await screen.findByRole('button', { name: '10:00 Ayşe Kaya sil' }));
  expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sil' }));
  expect(await screen.findByText('Bu gün için randevu yok.')).toBeTruthy();
  expect(calls.some((c) => c.method === 'DELETE' && c.url === '/api/v1/appointments/a1')).toBe(true);
});

test('does not show the previous day\'s appointments under the new date while loading', async () => {
  let release: () => void = () => undefined;
  stubFetch({
    [DAY]: () => ({ body: { appointments: [appt] } }),
    'GET /api/v1/appointments?from=2026-11-04&to=2026-11-04': () =>
      new Promise((resolve) => {
        release = () => resolve({ body: { appointments: [] } });
      }),
  });
  renderApp(<DailyPage />, { route: ROUTE });
  await screen.findByText('Ayşe Kaya');
  fireEvent.click(screen.getByRole('button', { name: 'Sonraki gün' }));
  expect(await screen.findByText('4 Kasım 2026 Çarşamba')).toBeTruthy();
  expect(screen.queryByText('Ayşe Kaya')).toBeNull();
  expect(screen.getByText('Yükleniyor…')).toBeTruthy();
  await act(async () => { release(); });
  expect(await screen.findByText('Bu gün için randevu yok.')).toBeTruthy();
});

test('fills the end time one hour after the start time when adding', async () => {
  stubFetch({
    [DAY]: () => ({ body: { appointments: [] } }),
    [CUSTOMERS]: () => ({ body: { customers: [ayse, ali] } }),
  });
  renderApp(<DailyPage />, { route: ROUTE });
  const dialog = await openAddForm();
  const end = within(dialog).getByLabelText('Bitiş') as HTMLInputElement;
  fireEvent.change(within(dialog).getByLabelText('Başlangıç'), { target: { value: '10:00' } });
  expect(end.value).toBe('11:00');
  fireEvent.change(within(dialog).getByLabelText('Başlangıç'), { target: { value: '14:30' } });
  expect(end.value).toBe('15:30');
});

test('keeps a hand-edited end time when the start time changes', async () => {
  stubFetch({
    [DAY]: () => ({ body: { appointments: [] } }),
    [CUSTOMERS]: () => ({ body: { customers: [ayse, ali] } }),
  });
  renderApp(<DailyPage />, { route: ROUTE });
  const dialog = await openAddForm();
  fireEvent.change(within(dialog).getByLabelText('Başlangıç'), { target: { value: '10:00' } });
  fireEvent.change(within(dialog).getByLabelText('Bitiş'), { target: { value: '10:30' } });
  fireEvent.change(within(dialog).getByLabelText('Başlangıç'), { target: { value: '12:00' } });
  expect((within(dialog).getByLabelText('Bitiş') as HTMLInputElement).value).toBe('10:30');
});

test('does not touch the end time when editing an existing appointment', async () => {
  stubFetch({
    [DAY]: () => ({ body: { appointments: [appt] } }),
    [CUSTOMERS]: () => ({ body: { customers: [ayse, ali] } }),
  });
  renderApp(<DailyPage />, { route: ROUTE });
  fireEvent.click(await screen.findByRole('button', { name: '10:00 Ayşe Kaya düzenle' }));
  const dialog = screen.getByRole('dialog');
  const endBefore = (within(dialog).getByLabelText('Bitiş') as HTMLInputElement).value;
  fireEvent.change(within(dialog).getByLabelText('Başlangıç'), { target: { value: '16:00' } });
  expect((within(dialog).getByLabelText('Bitiş') as HTMLInputElement).value).toBe(endBefore);
});

test('the empty state offers "Müşteri ekle", which opens the customer form and can be cancelled', async () => {
  stubFetch({ [DAY]: () => ({ body: { appointments: [] } }) });
  renderApp(<DailyPage />, { route: ROUTE });
  await screen.findByText('Bu gün için randevu yok.');
  fireEvent.click(screen.getByRole('button', { name: 'Müşteri ekle' }));
  expect(screen.getByLabelText('Ad')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
  expect(screen.queryByLabelText('Ad')).toBeNull();
});

test('there is only one "Randevu ekle" button in the empty state', async () => {
  stubFetch({ [DAY]: () => ({ body: { appointments: [] } }) });
  renderApp(<DailyPage />, { route: ROUTE });
  await screen.findByText('Bu gün için randevu yok.');
  expect(screen.getAllByRole('button', { name: 'Randevu ekle' })).toHaveLength(1);
});

test('the empty-state "Müşteri ekle" is not shown when the day has appointments', async () => {
  stubFetch({ [DAY]: () => ({ body: { appointments: [appt] } }) });
  renderApp(<DailyPage />, { route: ROUTE });
  await screen.findByText('Ayşe Kaya');
  expect(screen.queryByRole('button', { name: 'Müşteri ekle' })).toBeNull();
});

test('natural language bar parses a prompt for an existing customer and opens pre-filled AppointmentForm', async () => {
  stubFetch({
    [DAY]: () => ({ body: { appointments: [] } }),
    [CUSTOMERS]: () => ({ body: { customers: [ayse, ali] } }),
    'POST /api/v1/ai/parse-appointment': () => ({
      body: {
        customerId: 'c2',
        suggestedCustomer: null,
        date: '2026-11-04',
        startTime: '14:00',
        endTime: '15:00',
        note: 'Kontrol seansı',
      },
    }),
  });
  renderApp(<DailyPage />, { route: ROUTE });
  await screen.findByText('Bu gün için randevu yok.');

  const input = screen.getByLabelText('Hızlı randevu komutu');
  fireEvent.change(input, { target: { value: 'Yarın 14:00 Ali Veli kontrol seansı' } });
  fireEvent.click(screen.getByRole('button', { name: 'Oluştur' }));

  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByRole('option', { name: 'Ali Veli' });
  expect((within(dialog).getByLabelText('Müşteri') as HTMLSelectElement).value).toBe('c2');
  expect((within(dialog).getByLabelText('Tarih') as HTMLInputElement).value).toBe('2026-11-04');
  expect((within(dialog).getByLabelText('Başlangıç') as HTMLInputElement).value).toBe('14:00');
  expect((within(dialog).getByLabelText('Bitiş') as HTMLInputElement).value).toBe('15:00');
  expect((within(dialog).getByLabelText('Not') as HTMLTextAreaElement).value).toBe('Kontrol seansı');
});

test('natural language bar opens CustomerForm first when customer is unknown, then chains to AppointmentForm on save', async () => {
  const newCustomer: Customer = {
    id: 'c-new',
    userId: 'u1',
    firstName: 'Zeynep',
    lastName: 'Demir',
    birthDate: '1993-02-10',
    gender: 'female',
    deletedAt: null,
  };
  let customerSaved = false;
  stubFetch({
    [DAY]: () => ({ body: { appointments: [] } }),
    [CUSTOMERS]: () => ({ body: { customers: customerSaved ? [ayse, ali, newCustomer] : [ayse, ali] } }),
    'POST /api/v1/ai/parse-appointment': () => ({
      body: {
        customerId: null,
        suggestedCustomer: { firstName: 'Zeynep', lastName: 'Demir' },
        date: '2026-11-03',
        startTime: '16:00',
        endTime: '17:00',
        note: 'İlk değerlendirme',
      },
    }),
    'POST /api/v1/customers': () => {
      customerSaved = true;
      return { status: 201, body: { customer: newCustomer } };
    },
  });

  renderApp(<DailyPage />, { route: ROUTE });
  await screen.findByText('Bu gün için randevu yok.');

  fireEvent.change(screen.getByLabelText('Hızlı randevu komutu'), {
    target: { value: 'Bugün 16:00 Zeynep Demir ilk değerlendirme' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Oluştur' }));

  const custDialog = await screen.findByRole('dialog');
  expect(within(custDialog).getByText(/kayıtlı değil/i)).toBeTruthy();
  expect((within(custDialog).getByLabelText('Ad') as HTMLInputElement).value).toBe('Zeynep');
  expect((within(custDialog).getByLabelText('Soyad') as HTMLInputElement).value).toBe('Demir');

  fireEvent.change(within(custDialog).getByLabelText('Doğum tarihi'), { target: { value: '1993-02-10' } });
  fireEvent.change(within(custDialog).getByLabelText('Cinsiyet'), { target: { value: 'female' } });
  fireEvent.click(within(custDialog).getByRole('button', { name: 'Kaydet' }));

  // Müşteri kaydedilince otomatik olarak dolu AppointmentForm açılır
  await screen.findByRole('heading', { name: 'Randevu ekle' });
  const apptDialog = screen.getByRole('dialog');
  await within(apptDialog).findByRole('option', { name: 'Zeynep Demir' });
  expect((within(apptDialog).getByLabelText('Müşteri') as HTMLSelectElement).value).toBe('c-new');
  expect((within(apptDialog).getByLabelText('Başlangıç') as HTMLInputElement).value).toBe('16:00');
  expect((within(apptDialog).getByLabelText('Not') as HTMLTextAreaElement).value).toBe('İlk değerlendirme');
});
