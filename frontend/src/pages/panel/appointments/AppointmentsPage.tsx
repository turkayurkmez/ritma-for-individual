import { listAppointments } from '../../../api/appointments';
import { compareDateAndTime, formatDayLong, todayString, weekDays } from '../../../lib/date';
import { statusLabel } from '../../../lib/labels';
import { useApi } from '../../../lib/useApi';
import './AppointmentsPage.css';

export function AppointmentsPage() {
  const today = todayString();
  const days = weekDays(today);
  const from = days[0];
  const to = days[6];
  const { data, loading, error, reload } = useApi(() => listAppointments(from, to), [from, to]);

  const sorted = data ? [...data].sort(compareDateAndTime) : [];

  return (
    <section className="appointments">
      <h1 className="appointments-title">Bu Haftanın Randevuları</h1>

      {error ? (
        <div className="appointments-error" role="alert">
          <p>{error.message}</p>
          <button type="button" className="appointments-retry" onClick={reload}>Yeniden dene</button>
        </div>
      ) : loading || !data ? (
        <p>Yükleniyor…</p>
      ) : sorted.length === 0 ? (
        <p>Bu hafta için randevu yok.</p>
      ) : (
        <ul className="appointments-list">
          {sorted.map((appointment) => {
            const isToday = appointment.date === today;
            const name = `${appointment.customer.firstName} ${appointment.customer.lastName}`;
            const itemClass = [
              'appointments-item',
              `appointments-item-${appointment.status}`,
              isToday ? 'appointments-item-today' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <li key={appointment.id} className={itemClass}>
                <div className="appointments-info">
                  <div className="appointments-meta">
                    <span className="appointments-date">{formatDayLong(appointment.date)}</span>
                    <span className="appointments-time">{`${appointment.startTime}–${appointment.endTime}`}</span>
                    {isToday && <span className="appointments-today-badge">Bugün</span>}
                  </div>
                  <span className="appointments-name">{name}</span>
                  <span className="appointments-status">{statusLabel(appointment.status)}</span>
                  {appointment.note && <span className="appointments-note">{appointment.note}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
