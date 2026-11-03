import { sendSignup, validateSignup } from './signup';

const valid = { name: 'Ayşe Kaya', email: 'ayse@example.com', job: 'Koç' };

describe('validateSignup', () => {
  test('returns an error for each empty field', () => {
    expect(validateSignup({ name: '', email: '', job: '' })).toEqual({
      name: 'Lütfen adınızı ve soyadınızı yazın.',
      email: 'Geçerli bir e-posta adresi yazın.',
      job: 'Lütfen mesleğinizi seçin.',
    });
  });

  test('returns no errors for valid values', () => {
    expect(validateSignup(valid)).toEqual({});
  });

  test('rejects an email without a dot after the at sign', () => {
    expect(validateSignup({ ...valid, email: 'a@b' }).email).toBe('Geçerli bir e-posta adresi yazın.');
  });

  test('rejects a name made only of spaces', () => {
    expect(validateSignup({ ...valid, name: '   ' }).name).toBe('Lütfen adınızı ve soyadınızı yazın.');
  });
});

describe('sendSignup', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('rejects without calling fetch when the endpoint is empty', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(sendSignup(valid, '')).rejects.toThrow('Form servisi henüz bağlanmadı.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('posts the values as JSON to the endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    await sendSignup(valid, '/form');
    expect(fetchMock).toHaveBeenCalledWith('/form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(valid),
    });
  });

  test('rejects when the service answers with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(sendSignup(valid, '/form')).rejects.toThrow('Servis hata döndü.');
  });
});
