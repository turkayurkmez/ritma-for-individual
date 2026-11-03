import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderApp, stubFetch } from '../../../test-utils';
import type { Customer } from '../../../api/types';
import { CustomersPage } from './CustomersPage';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const ali: Customer = {
  id: 'c1', userId: 'u1', firstName: 'Ali', lastName: 'Veli',
  birthDate: '1990-01-01', gender: 'male', deletedAt: null,
};
const ayse: Customer = {
  id: 'c2', userId: 'u1', firstName: 'Ayşe', lastName: 'Kaya',
  birthDate: '1985-05-05', gender: 'female', deletedAt: null,
};
const LIST = 'GET /api/v1/customers';

// AuthProvider de /auth/me çağırır; bu testler yalnızca müşteri isteklerine bakar.
function customerCalls(calls: { method: string; url: string }[]) {
  return calls.filter((c) => c.url.startsWith('/api/v1/customers'));
}

function typeSearch(value: string) {
  fireEvent.change(screen.getByLabelText('Müşteri ara'), { target: { value } });
}

// Sahte zamanlayıcı yalnızca bekleme süresini ilerletmek için açılır; findBy gerçek zamanla çalışır.
async function advanceDebounce() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  typeSearch('ali');
  await act(async () => {
    vi.advanceTimersByTime(300);
  });
  vi.useRealTimers();
}

test('lists customers with full name and gender label', async () => {
  stubFetch({ [LIST]: () => ({ body: { customers: [ali, ayse] } }) });
  renderApp(<CustomersPage />);
  expect(await screen.findByText('Ali Veli')).toBeTruthy();
  expect(screen.getByText('Ayşe Kaya')).toBeTruthy();
  expect(screen.getByText('Erkek')).toBeTruthy();
  expect(screen.getByText('Kadın')).toBeTruthy();
});

test('shows an empty message when there are no customers', async () => {
  stubFetch({ [LIST]: () => ({ body: { customers: [] } }) });
  renderApp(<CustomersPage />);
  expect(await screen.findByText('Henüz müşteri yok.')).toBeTruthy();
});

test('shows the error and retries on "Yeniden dene"', async () => {
  let attempt = 0;
  const { calls } = stubFetch({
    [LIST]: () => (++attempt === 1
      ? { status: 500, body: { error: { code: 'internal', message: 'Bir şeyler ters gitti.' } } }
      : { body: { customers: [ali] } }),
  });
  renderApp(<CustomersPage />);
  expect(await screen.findByText('Bir şeyler ters gitti.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));
  expect(await screen.findByText('Ali Veli')).toBeTruthy();
  expect(customerCalls(calls)).toHaveLength(2);
});

test('searches 300 ms after typing, with ?search=', async () => {
  const { calls } = stubFetch({
    [LIST]: () => ({ body: { customers: [ali, ayse] } }),
    [`${LIST}?search=ali`]: () => ({ body: { customers: [ali] } }),
  });
  renderApp(<CustomersPage />);
  await screen.findByText('Ayşe Kaya');
  await advanceDebounce();
  await waitFor(() => expect(screen.queryByText('Ayşe Kaya')).toBeNull());
  expect(screen.getByText('Ali Veli')).toBeTruthy();
  expect(customerCalls(calls).map((c) => c.url)).toEqual(['/api/v1/customers', '/api/v1/customers?search=ali']);
});

test('a late older search response does not overwrite the newer result', async () => {
  let releaseOld: () => void = () => undefined;
  stubFetch({
    [LIST]: () => ({ body: { customers: [ali, ayse] } }),
    [`${LIST}?search=a`]: () =>
      new Promise((resolve) => {
        releaseOld = () => resolve({ body: { customers: [ali, ayse] } });
      }),
    [`${LIST}?search=ali`]: () => ({ body: { customers: [ali] } }),
  });
  renderApp(<CustomersPage />);
  await screen.findByText('Ayşe Kaya');

  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  typeSearch('a');
  await act(async () => { vi.advanceTimersByTime(300); });
  typeSearch('ali');
  await act(async () => { vi.advanceTimersByTime(300); });
  vi.useRealTimers();

  await waitFor(() => expect(screen.queryByText('Ayşe Kaya')).toBeNull());
  await act(async () => { releaseOld(); });
  expect(screen.queryByText('Ayşe Kaya')).toBeNull();
  expect(screen.getByText('Ali Veli')).toBeTruthy();
});

async function openAddForm() {
  fireEvent.click(await screen.findByRole('button', { name: 'Müşteri ekle' }));
  return screen.getByRole('dialog');
}

function fillForm(dialog: HTMLElement, values: { first: string; last: string; birth: string; gender?: string }) {
  fireEvent.change(within(dialog).getByLabelText('Ad'), { target: { value: values.first } });
  fireEvent.change(within(dialog).getByLabelText('Soyad'), { target: { value: values.last } });
  fireEvent.change(within(dialog).getByLabelText('Doğum tarihi'), { target: { value: values.birth } });
  if (values.gender) fireEvent.change(within(dialog).getByLabelText('Cinsiyet'), { target: { value: values.gender } });
}

test('keeps the form open with the backend message and entered values on a 400', async () => {
  stubFetch({
    [LIST]: () => ({ body: { customers: [] } }),
    'POST /api/v1/customers': () => ({
      status: 400,
      body: { error: { code: 'validation_error', message: 'Soyad boş olamaz.' } },
    }),
  });
  renderApp(<CustomersPage />);
  const dialog = await openAddForm();
  fillForm(dialog, { first: 'Can', last: '', birth: '2000-02-02' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
  expect(await within(dialog).findByText('Soyad boş olamaz.')).toBeTruthy();
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect((within(dialog).getByLabelText('Ad') as HTMLInputElement).value).toBe('Can');
  expect((within(dialog).getByLabelText('Doğum tarihi') as HTMLInputElement).value).toBe('2000-02-02');
  expect((within(dialog).getByRole('button', { name: 'Kaydet' }) as HTMLButtonElement).disabled).toBe(false);
});

test('double-clicking Kaydet sends one POST, then closes and reloads the list', async () => {
  let finish: () => void = () => undefined;
  let created = false;
  const can: Customer = { ...ali, id: 'c3', firstName: 'Can', lastName: 'Er' };
  const { calls } = stubFetch({
    [LIST]: () => ({ body: { customers: created ? [can] : [] } }),
    'POST /api/v1/customers': () =>
      new Promise((resolve) => {
        finish = () => { created = true; resolve({ status: 201, body: { customer: can } }); };
      }),
  });
  renderApp(<CustomersPage />);
  const dialog = await openAddForm();
  fillForm(dialog, { first: 'Can', last: 'Er', birth: '2000-02-02', gender: 'male' });
  const save = within(dialog).getByRole('button', { name: 'Kaydet' }) as HTMLButtonElement;
  fireEvent.click(save);
  await waitFor(() => expect(save.disabled).toBe(true));
  fireEvent.click(save);
  expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1);
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
    firstName: 'Can', lastName: 'Er', birthDate: '2000-02-02', gender: 'male',
  });
  await act(async () => { finish(); });
  expect(await screen.findByText('Can Er')).toBeTruthy();
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('editing sends PATCH with the changed form values', async () => {
  const { calls } = stubFetch({
    [LIST]: () => ({ body: { customers: [ali] } }),
    'PATCH /api/v1/customers/c1': () => ({ body: { customer: { ...ali, firstName: 'Alp' } } }),
  });
  renderApp(<CustomersPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Ali Veli düzenle' }));
  const dialog = screen.getByRole('dialog');
  expect((within(dialog).getByLabelText('Ad') as HTMLInputElement).value).toBe('Ali');
  fireEvent.change(within(dialog).getByLabelText('Ad'), { target: { value: 'Alp' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({
    firstName: 'Alp', lastName: 'Veli', birthDate: '1990-01-01', gender: 'male',
  });
});

test('deleting goes through the confirm dialog and calls DELETE', async () => {
  let deleted = false;
  const { calls } = stubFetch({
    [LIST]: () => ({ body: { customers: deleted ? [] : [ali] } }),
    'DELETE /api/v1/customers/c1': () => { deleted = true; return {}; },
  });
  renderApp(<CustomersPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Ali Veli sil' }));
  expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sil' }));
  expect(await screen.findByText('Henüz müşteri yok.')).toBeTruthy();
  expect(calls.some((c) => c.method === 'DELETE' && c.url === '/api/v1/customers/c1')).toBe(true);
});
