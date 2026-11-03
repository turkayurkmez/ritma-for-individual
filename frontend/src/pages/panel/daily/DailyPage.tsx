import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { deleteAppointment, listAppointments, updateAppointment } from '../../../api/appointments';
import type { Appointment } from '../../../api/types';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { addDays, formatDayLong, todayString } from '../../../lib/date';
import { statusLabel } from '../../../lib/labels';
import { useApi } from '../../../lib/useApi';
import { AppointmentForm } from './AppointmentForm';
import './DailyPage.css';

type Dialog =
  | { kind: 'form'; appointment?: Appointment }
  | { kind: 'cancel'; appointment: Appointment }
  | { kind: 'delete'; appointment: Appointment }
  | null;

function isDateString(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function DailyPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tarih');
  const date = isDateString(requested) ? requested : todayString();
  const { data, loading, error, reload } = useApi(() => listAppointments(date, date), [date]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [actionError, setActionError] = useState('');

  function goTo(next: string) {
    setParams({ tarih: next });
  }

  function handleSaved() {
    setDialog(null);
    reload();
  }

  async function runAction(action: () => Promise<unknown>) {
    setDialog(null);
    setActionError('');
    try {
      await action();
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Bir sorun oluştu.');
    }
  }

  return (
    <section className="daily">
      <div className="daily-nav">
        <button type="button" className="daily-nav-button" onClick={() => goTo(addDays(date, -1))}>Önceki gün</button>
        <button type="button" className="daily-nav-button" onClick={() => goTo(todayString())}>Bugün</button>
        <button type="button" className="daily-nav-button" onClick={() => goTo(addDays(date, 1))}>Sonraki gün</button>
      </div>
      <div className="daily-head">
        <h1 className="daily-title">{formatDayLong(date)}</h1>
        <button type="button" className="cta" onClick={() => setDialog({ kind: 'form' })}>Randevu ekle</button>
      </div>

      {actionError && <p className="daily-error" role="alert">{actionError}</p>}

      {error ? (
        <div className="daily-error" role="alert">
          <p>{error.message}</p>
          <button type="button" className="daily-nav-button" onClick={reload}>Yeniden dene</button>
        </div>
      ) : loading || !data ? (
        <p>Yükleniyor…</p>
      ) : data && data.length === 0 ? (
        <p>Bu gün için randevu yok.</p>
      ) : (
        <ul className="daily-list">
          {data?.map((appointment) => {
            const name = `${appointment.customer.firstName} ${appointment.customer.lastName}`;
            const label = `${appointment.startTime} ${name}`;
            return (
              <li key={appointment.id} className={`daily-item daily-item-${appointment.status}`}>
                <div className="daily-info">
                  <span className="daily-time">{`${appointment.startTime}–${appointment.endTime}`}</span>
                  <span className="daily-name">{name}</span>
                  <span className="daily-status">{statusLabel(appointment.status)}</span>
                  {appointment.note && <span className="daily-note">{appointment.note}</span>}
                </div>
                <div className="daily-actions">
                  <button
                    type="button"
                    className="daily-action"
                    aria-label={`${label} düzenle`}
                    onClick={() => setDialog({ kind: 'form', appointment })}
                  >
                    Düzenle
                  </button>
                  {appointment.status !== 'cancelled' && (
                    <button
                      type="button"
                      className="daily-action"
                      aria-label={`${label} iptal et`}
                      onClick={() => setDialog({ kind: 'cancel', appointment })}
                    >
                      İptal et
                    </button>
                  )}
                  <button
                    type="button"
                    className="daily-action daily-action-danger"
                    aria-label={`${label} sil`}
                    onClick={() => setDialog({ kind: 'delete', appointment })}
                  >
                    Sil
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dialog?.kind === 'form' && (
        <AppointmentForm
          appointment={dialog.appointment}
          defaultDate={date}
          onSaved={handleSaved}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'cancel' && (
        <ConfirmDialog
          message="Bu randevu iptal edilsin mi?"
          confirmLabel="İptal et"
          onConfirm={() => runAction(() => updateAppointment(dialog.appointment.id, { status: 'cancelled' }))}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          message="Bu randevu silinsin mi?"
          confirmLabel="Sil"
          onConfirm={() => runAction(() => deleteAppointment(dialog.appointment.id))}
          onCancel={() => setDialog(null)}
        />
      )}
    </section>
  );
}
