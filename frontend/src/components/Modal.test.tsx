import { fireEvent, render, screen } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';
import { Modal } from './Modal';

test('renders a labelled modal dialog', () => {
  render(<Modal title="Başlık" onClose={() => undefined}>içerik</Modal>);
  const dialog = screen.getByRole('dialog', { name: 'Başlık' });
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  expect(screen.getByText('içerik')).toBeTruthy();
});

test('Escape calls onClose', () => {
  const onClose = vi.fn();
  render(<Modal title="Başlık" onClose={onClose}>içerik</Modal>);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('ConfirmDialog confirms and cancels', () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(<ConfirmDialog message="Silinsin mi?" confirmLabel="Sil" onConfirm={onConfirm} onCancel={onCancel} />);
  expect(screen.getByText('Silinsin mi?')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Sil' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
  expect(onCancel).toHaveBeenCalledTimes(1);
});
