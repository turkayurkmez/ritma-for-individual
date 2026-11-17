import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { parseAppointmentPrompt } from '../../../api/ai';
import { deleteAppointment, listAppointments, updateAppointment } from '../../../api/appointments';
import type { Appointment, Customer } from '../../../api/types';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { addDays, formatDayLong, todayString } from '../../../lib/date';
import { statusLabel } from '../../../lib/labels';
import { useApi } from '../../../lib/useApi';
import { CustomerForm } from '../customers/CustomerForm';
import { AppointmentForm, type AppointmentFormDraft } from './AppointmentForm';
import './DailyPage.css';

type Dialog =
  | { kind: 'form'; appointment?: Appointment; draft?: AppointmentFormDraft }
  | {
      kind: 'customer';
      initialDraft?: { firstName: string; lastName: string };
      hint?: string;
      pendingAppointmentDraft?: AppointmentFormDraft;
    }
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
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

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

  async function handleAiSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = aiPrompt.trim();
    if (!trimmed || aiLoading) return;
    setAiLoading(true);
    setActionError('');
    try {
      const parsed = await parseAppointmentPrompt(trimmed, date);
      const apptDraft: AppointmentFormDraft = {
        customerId: parsed.customerId ?? undefined,
        date: parsed.date,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        note: parsed.note,
      };
      setAiPrompt('');
      if (!parsed.customerId && parsed.suggestedCustomer) {
        const fullName = `${parsed.suggestedCustomer.firstName} ${parsed.suggestedCustomer.lastName}`;
        setDialog({
          kind: 'customer',
          initialDraft: parsed.suggestedCustomer,
          hint: `${fullName} kayıtlı değil. Önce müşteriyi ekleyin, ardından randevu formuna geçilecek.`,
          pendingAppointmentDraft: apptDraft,
        });
      } else {
        setDialog({ kind: 'form', draft: apptDraft });
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Komut ayrıştırılamadı.');
    } finally {
      setAiLoading(false);
    }
  }

  function handleCustomerSaved(savedCustomer: Customer) {
    if (dialog?.kind === 'customer' && dialog.pendingAppointmentDraft) {
      setDialog({
        kind: 'form',
        draft: { ...dialog.pendingAppointmentDraft, customerId: savedCustomer.id },
      });
    } else {
      setDialog(null);
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

      <form className="daily-ai-bar" onSubmit={handleAiSubmit}>
        <input
          className="daily-ai-input"
          aria-label="Hızlı randevu komutu"
          placeholder="Örn: Yarın 14:00 Ali Veli kontrol randevusu"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
        />
        <button type="submit" className="daily-nav-button daily-ai-submit" disabled={aiLoading}>
          {aiLoading ? 'Ayrıştırılıyor…' : 'Oluştur'}
        </button>
      </form>

      {actionError && <p className="daily-error" role="alert">{actionError}</p>}

      {error ? (
        <div className="daily-error" role="alert">
          <p>{error.message}</p>
          <button type="button" className="daily-nav-button" onClick={reload}>Yeniden dene</button>
        </div>
      ) : loading || !data ? (
        <p>Yükleniyor…</p>
      ) : data && data.length === 0 ? (
        <div className="daily-empty">
          <p>Bu gün için randevu yok.</p>
          <button type="button" className="cta" onClick={() => setDialog({ kind: 'customer' })}>Müşteri ekle</button>
        </div>
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
          draft={dialog.draft}
          defaultDate={date}
          onSaved={handleSaved}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'customer' && (
        <CustomerForm
          initialDraft={dialog.initialDraft}
          hint={dialog.hint}
          onSaved={handleCustomerSaved}
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
