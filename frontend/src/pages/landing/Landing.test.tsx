import { screen } from '@testing-library/react';
import { renderApp } from '../../test-utils';
import { Landing } from './Landing';

function renderLanding() {
  vi.stubGlobal('fetch', async () => new Response(null, { status: 401 }));
  return renderApp(<Landing />);
}

test('the main button says "İki hafta ücretsiz dene" and goes to /giris', () => {
  renderLanding();
  const cta = screen.getByRole('link', { name: 'İki hafta ücretsiz dene' });
  expect(cta.getAttribute('href')).toBe('/giris');
  expect(cta.className).toContain('cta');
});

test('no "erken erişim" text is left anywhere on the page', () => {
  const { container } = renderLanding();
  expect(container.textContent).not.toMatch(/erken erişim/i);
});

test('there is no sign-up form', () => {
  const { container } = renderLanding();
  expect(container.querySelector('form')).toBeNull();
  expect(container.querySelector('input[type="email"]')).toBeNull();
  expect(screen.queryByRole('button', { name: /kaydol/i })).toBeNull();
});

test('the footer keeps the "Giriş" link and the section links', () => {
  renderLanding();
  expect(screen.getByRole('link', { name: 'Giriş' }).getAttribute('href')).toBe('/giris');
  expect(screen.getByRole('link', { name: 'Sorun ve çözüm' }).getAttribute('href')).toBe('#sorun-cozum');
  expect(screen.getByRole('link', { name: 'Nasıl çalışır' }).getAttribute('href')).toBe('#nasil-calisir');
});
