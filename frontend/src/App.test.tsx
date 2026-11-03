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

test('renders the landing placeholder at /', () => {
  renderAt('/');
  expect(screen.getByText('Ritma')).toBeTruthy();
});

test('shows a not-found message for unknown paths', () => {
  renderAt('/yok');
  expect(screen.getByText('Sayfa bulunamadı.')).toBeTruthy();
});
