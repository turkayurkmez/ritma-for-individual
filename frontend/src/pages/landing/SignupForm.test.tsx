import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SignupForm } from './SignupForm';

function fill(values: { name?: string; email?: string; job?: string }) {
  if (values.name !== undefined) fireEvent.change(screen.getByLabelText('Ad soyad'), { target: { value: values.name } });
  if (values.email !== undefined) fireEvent.change(screen.getByLabelText('E-posta'), { target: { value: values.email } });
  if (values.job !== undefined) fireEvent.change(screen.getByLabelText('Mesleğiniz'), { target: { value: values.job } });
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Erken erişim için kaydol' }));

afterEach(() => vi.unstubAllGlobals());

test('shows a message for every empty field and focuses the first one', () => {
  render(<SignupForm />);
  submit();
  expect(screen.getByText('Lütfen adınızı ve soyadınızı yazın.')).toBeTruthy();
  expect(screen.getByText('Geçerli bir e-posta adresi yazın.')).toBeTruthy();
  expect(screen.getByText('Lütfen mesleğinizi seçin.')).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByLabelText('Ad soyad'));
  expect(screen.getByLabelText('Ad soyad').getAttribute('aria-invalid')).toBe('true');
});

test('shows the failure message, not success, while the form service is not connected', async () => {
  render(<SignupForm />);
  fill({ name: 'Ayşe Kaya', email: 'ayse@example.com', job: 'Koç' });
  submit();
  expect(await screen.findByText('Şu an kayıt alamıyoruz, lütfen daha sonra tekrar deneyin.')).toBeTruthy();
  expect(screen.queryByText(/Teşekkürler/)).toBeNull();
  const button = screen.getByRole('button', { name: 'Erken erişim için kaydol' }) as HTMLButtonElement;
  expect(button.disabled).toBe(false);
});

test('hides the form and thanks the visitor when the service accepts the signup', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  render(<SignupForm endpoint="/form" />);
  fill({ name: 'Ayşe Kaya', email: 'ayse@example.com', job: 'Koç' });
  submit();
  await waitFor(() =>
    expect(screen.getByText('Teşekkürler! Listeye eklendin, Ritma hazır olduğunda sana haber vereceğiz.')).toBeTruthy(),
  );
  expect(screen.queryByLabelText('Ad soyad')).toBeNull();
});
