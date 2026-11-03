import { Link, useSearchParams } from 'react-router';
import { listAppointments } from '../../../api/appointments';
import { formatMonth, monthGrid, monthRange, parseDateString, toDateString, todayString } from '../../../lib/date';
import { useApi } from '../../../lib/useApi';
import './MonthlyPage.css';

function isDateString(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const dayFull = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

export function MonthlyPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tarih');
  const anchor = parseDateString(isDateString(requested) ? requested : todayString());
  const year = anchor.getFullYear();
  const month = anchor.getMonth() + 1;
  const { from, to } = monthRange(year, month);
  const { data, loading, error, reload } = useApi(() => listAppointments(from, to), [from, to]);

  function goToMonth(targetYear: number, targetMonth: number) {
    setParams({ tarih: toDateString(new Date(targetYear, targetMonth - 1, 1)) });
  }

  // İptal edilen randevular sayıya girmez.
  const counts = new Map<string, number>();
  for (const appointment of data ?? []) {
    if (appointment.status === 'cancelled') continue;
    counts.set(appointment.date, (counts.get(appointment.date) ?? 0) + 1);
  }

  return (
    <section className="monthly">
      <div className="monthly-nav">
        <button type="button" className="monthly-nav-button" onClick={() => goToMonth(year, month - 1)}>Önceki ay</button>
        <button
          type="button"
          className="monthly-nav-button"
          onClick={() => {
            const now = parseDateString(todayString());
            goToMonth(now.getFullYear(), now.getMonth() + 1);
          }}
        >
          Bu ay
        </button>
        <button type="button" className="monthly-nav-button" onClick={() => goToMonth(year, month + 1)}>Sonraki ay</button>
      </div>
      <h1 className="monthly-title">{formatMonth(year, month)}</h1>

      {error ? (
        <div className="monthly-error" role="alert">
          <p>{error.message}</p>
          <button type="button" className="monthly-nav-button" onClick={reload}>Yeniden dene</button>
        </div>
      ) : !data && loading ? (
        <p>Yükleniyor…</p>
      ) : (
        <div className="monthly-grid">
          {WEEKDAYS.map((name) => (
            <div key={name} className="monthly-weekday" aria-hidden="true">{name}</div>
          ))}
          {monthGrid(year, month).flat().map((day, index) => {
            if (day === null) return <div key={`blank-${index}`} className="monthly-cell monthly-cell-blank" />;
            const count = counts.get(day) ?? 0;
            const label = `${dayFull.format(parseDateString(day))}, ${count > 0 ? `${count} randevu` : 'randevu yok'}`;
            return (
              <Link key={day} className="monthly-cell monthly-day" to={`/panel?tarih=${day}`} aria-label={label}>
                <span className="monthly-day-number">{Number(day.slice(8))}</span>
                {count > 0 && <span className="monthly-day-count">{count}</span>}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
