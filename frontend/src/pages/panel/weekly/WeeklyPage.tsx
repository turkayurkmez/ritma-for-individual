import { Link, useSearchParams } from 'react-router';
import { listAppointments } from '../../../api/appointments';
import type { Appointment } from '../../../api/types';
import { addDays, parseDateString, startOfWeek, todayString, weekDays } from '../../../lib/date';
import { useApi } from '../../../lib/useApi';
import './WeeklyPage.css';

function isDateString(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const dayHeading = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
const dayMonth = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });
const dayMonthYear = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

export function WeeklyPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tarih');
  const anchor = isDateString(requested) ? requested : todayString();
  const days = weekDays(anchor);
  const from = days[0];
  const to = days[6];
  const { data, loading, error, reload } = useApi(() => listAppointments(from, to), [from, to]);

  function goTo(next: string) {
    setParams({ tarih: next });
  }

  const byDay = new Map<string, Appointment[]>();
  for (const appointment of data ?? []) {
    byDay.set(appointment.date, [...(byDay.get(appointment.date) ?? []), appointment]);
  }

  return (
    <section className="weekly">
      <div className="weekly-nav">
        <button type="button" className="weekly-nav-button" onClick={() => goTo(addDays(from, -7))}>Önceki hafta</button>
        <button type="button" className="weekly-nav-button" onClick={() => goTo(startOfWeek(todayString()))}>Bu hafta</button>
        <button type="button" className="weekly-nav-button" onClick={() => goTo(addDays(from, 7))}>Sonraki hafta</button>
      </div>
      <h1 className="weekly-title">
        {`${dayMonth.format(parseDateString(from))} – ${dayMonthYear.format(parseDateString(to))}`}
      </h1>

      {error ? (
        <div className="weekly-error" role="alert">
          <p>{error.message}</p>
          <button type="button" className="weekly-nav-button" onClick={reload}>Yeniden dene</button>
        </div>
      ) : !data && loading ? (
        <p>Yükleniyor…</p>
      ) : (
        <>
          {data && data.length === 0 && <p>Bu hafta için randevu yok.</p>}
          <div className="weekly-grid">
            {days.map((day) => (
              <div key={day} className="weekly-day">
                <Link className="weekly-day-link" to={`/panel?tarih=${day}`}>
                  {dayHeading.format(parseDateString(day))}
                </Link>
                <ul className="weekly-list">
                  {(byDay.get(day) ?? []).map((appointment) => (
                    <li
                      key={appointment.id}
                      className={`weekly-item weekly-item-${appointment.status}`}
                    >
                      {`${appointment.startTime} ${appointment.customer.firstName} ${appointment.customer.lastName}`}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
