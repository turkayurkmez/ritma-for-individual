import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { App } from './App';

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

test('renders the landing page at /', () => {
  renderAt('/');
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Ritma.');
  expect(screen.getByRole('link', { name: 'Giriş' }).getAttribute('href')).toBe('/giris');
});

test('shows a not-found message for unknown paths', () => {
  renderAt('/yok');
  expect(screen.getByText('Sayfa bulunamadı.')).toBeTruthy();
});
