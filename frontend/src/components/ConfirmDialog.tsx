import { Modal } from './Modal';

interface ConfirmDialogProps {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal title="Emin misiniz?" onClose={onCancel}>
      <p className="modal-message">{message}</p>
      <div className="modal-actions">
        <button type="button" className="modal-button" onClick={onCancel}>Vazgeç</button>
        <button type="button" className="modal-button modal-button-danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}
