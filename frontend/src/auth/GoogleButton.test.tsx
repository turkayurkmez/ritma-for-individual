import { render, screen, fireEvent } from '@testing-library/react';
import { GoogleButton } from './GoogleButton';

type GoogleId = { initialize: ReturnType<typeof vi.fn>; renderButton: ReturnType<typeof vi.fn> };

function fakeGoogle(): GoogleId {
  const id = { initialize: vi.fn(), renderButton: vi.fn() };
  (window as unknown as { google?: unknown }).google = { accounts: { id } };
  return id;
}

afterEach(() => {
  delete (window as unknown as { google?: unknown }).google;
  document.getElementById('google-gsi')?.remove();
});

test('initializes Google with the client id and renders the button without loading the script when google is already present', () => {
  const id = fakeGoogle();
  render(<GoogleButton clientId="cid" onCredential={() => undefined} />);
  expect(id.initialize.mock.calls[0][0]).toMatchObject({ client_id: 'cid' });
  expect(id.renderButton).toHaveBeenCalled();
  expect(document.getElementById('google-gsi')).toBeNull();
});

test('passes the credential to onCredential', () => {
  const id = fakeGoogle();
  const onCredential = vi.fn();
  render(<GoogleButton clientId="cid" onCredential={onCredential} />);
  id.initialize.mock.calls[0][0].callback({ credential: 'abc' });
  expect(onCredential).toHaveBeenCalledWith('abc');
});

test('loads the Google script when it is missing and shows a message if it fails', async () => {
  render(<GoogleButton clientId="cid" onCredential={() => undefined} />);
  const script = document.getElementById('google-gsi') as HTMLScriptElement;
  expect(script.src).toBe('https://accounts.google.com/gsi/client');
  fireEvent.error(script);
  expect((await screen.findByRole('alert')).textContent).toBe('Google ile giriş şu an yüklenemedi.');
});
