// Form servisinin adresi. Boşken form hiçbir şey göndermez ve hata gösterir.
export const FORM_ENDPOINT = '';

export interface SignupValues {
  name: string;
  email: string;
  job: string;
}

export type SignupErrors = Partial<Record<keyof SignupValues, string>>;

// Hatalı alanlar için Türkçe mesaj döner; her şey geçerliyse {} döner.
export function validateSignup(values: SignupValues): SignupErrors {
  const errors: SignupErrors = {};
  if (!values.name.trim()) errors.name = 'Lütfen adınızı ve soyadınızı yazın.';
  if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = 'Geçerli bir e-posta adresi yazın.';
  if (!values.job) errors.job = 'Lütfen mesleğinizi seçin.';
  return errors;
}

// Kaydı form servisine gönderir; adres boşsa veya servis hata dönerse reddeder.
export async function sendSignup(values: SignupValues, endpoint: string = FORM_ENDPOINT): Promise<void> {
  if (!endpoint) throw new Error('Form servisi henüz bağlanmadı.');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(values),
  });
  if (!response.ok) throw new Error('Servis hata döndü.');
}
