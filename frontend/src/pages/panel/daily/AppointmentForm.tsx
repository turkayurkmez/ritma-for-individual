import { useRef, useState, type FormEvent } from 'react';
import { createAppointment, updateAppointment } from '../../../api/appointments';
import { listCustomers } from '../../../api/customers';
import type { Appointment, AppointmentInput, AppointmentStatus } from '../../../api/types';
import { Modal } from '../../../components/Modal';
import { addHour } from '../../../lib/date';
import { statusLabel, STATUSES } from '../../../lib/labels';
import { useApi } from '../../../lib/useApi';
import './AppointmentForm.css';

interface AppointmentFormProps {
  appointment?: Appointment;
  defaultDate: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function AppointmentForm({ appointment, defaultDate, onSaved, onCancel }: AppointmentFormProps) {
  const [customerId, setCustomerId] = useState(appointment?.customerId ?? '');
  const [date, setDate] = useState(appointment?.date ?? defaultDate);
  const [startTime, setStartTime] = useState(appointment?.startTime ?? '');
  const [endTime, setEndTime] = useState(appointment?.endTime ?? '');
  const [status, setStatus] = useState<AppointmentStatus>(appointment?.status ?? 'scheduled');
  const [note, setNote] = useState(appointment?.note ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  // Bitişi kullanıcı elle değiştirdiyse başlangıç değişince ezilmez; düzenlemede hiç otomatik doldurulmaz.
  const endEdited = useRef(Boolean(appointment));
  const customers = useApi(() => listCustomers(), []);

  const activeCustomers = customers.data ?? [];
  // Silinmiş müşterinin randevusu düzenlenirken mevcut müşteri seçim kutusunda kalır.
  const deletedCustomer =
    appointment && customers.data && !customers.data.some((c) => c.id === appointment.customerId)
      ? appointment.customer
      : null;

  function handleStartChange(value: string) {
    setStartTime(value);
    if (!endEdited.current) setEndTime(addHour(value));
  }

  function handleEndChange(value: string) {
    endEdited.current = true;
    setEndTime(value);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError('');
    const input: AppointmentInput = { customerId, date, startTime, endTime, status, note };
    try {
      if (appointment) await updateAppointment(appointment.id, input);
      else await createAppointment(input);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bir sorun oluştu.');
      setSubmitting(false);
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <Modal title={appointment ? 'Randevuyu düzenle' : 'Randevu ekle'} onClose={onCancel}>
      <form className="appointment-form" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="appointment-customer">Müşteri</label>
          <select id="appointment-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Müşteri seçin</option>
            {deletedCustomer && (
              <option value={deletedCustomer.id}>
                {`${deletedCustomer.firstName} ${deletedCustomer.lastName} (silinmiş)`}
              </option>
            )}
            {activeCustomers.map((c) => (
              <option key={c.id} value={c.id}>{`${c.firstName} ${c.lastName}`}</option>
            ))}
          </select>
          {customers.error && <p className="appointment-form-hint">Müşteriler yüklenemedi: {customers.error.message}</p>}
        </div>
        <div>
          <label htmlFor="appointment-date">Tarih</label>
          <input id="appointment-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="appointment-form-times">
          <div>
            <label htmlFor="appointment-start">Başlangıç</label>
            <input id="appointment-start" type="time" value={startTime} onChange={(e) => handleStartChange(e.target.value)} />
          </div>
          <div>
            <label htmlFor="appointment-end">Bitiş</label>
            <input id="appointment-end" type="time" value={endTime} onChange={(e) => handleEndChange(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="appointment-status">Durum</label>
          <select
            id="appointment-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="appointment-note">Not</label>
          <textarea id="appointment-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <p className="appointment-form-error" role="alert" hidden={!error}>{error}</p>
        <div className="modal-actions">
          <button type="button" className="modal-button" onClick={onCancel}>Vazgeç</button>
          <button type="submit" className="modal-button modal-button-primary" disabled={submitting}>Kaydet</button>
        </div>
      </form>
    </Modal>
  );
}
