import { useEffect, useState } from 'react';
import {
  checkRemindersNow,
  getReminderSettings,
  listSentReminders,
  updateReminderSettings,
} from '../../api/reminders';
import type { ReminderMinutes, ReminderNotification } from '../../api/types';
import './ReminderFooter.css';

const OPTIONS: Array<{ value: string; label: string; minutes: ReminderMinutes | null }> = [
  { value: 'off', label: 'Kapalı', minutes: null },
  { value: '15', label: '15 dakika önce', minutes: 15 },
  { value: '30', label: '30 dakika önce', minutes: 30 },
  { value: '60', label: '60 dakika önce', minutes: 60 },
];

export function ReminderFooter() {
  const [minutes, setMinutes] = useState<ReminderMinutes | null>(30);
  const [notifications, setNotifications] = useState<ReminderNotification[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let active = true;
    getReminderSettings()
      .then((res) => {
        if (active) setMinutes(res.reminderMinutesBefore);
      })
      .catch(() => {});
    listSentReminders()
      .then((items) => {
        if (active && Array.isArray(items)) setNotifications(items);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function handleSelectChange(value: string) {
    const found = OPTIONS.find((o) => o.value === value);
    const next = found ? found.minutes : null;
    setMinutes(next);
    setStatusMessage('');
    try {
      const saved = await updateReminderSettings(next);
      setMinutes(saved.reminderMinutesBefore);
      setStatusMessage('Hatırlatma ayarı kaydedildi.');
    } catch {
      setStatusMessage('Ayar kaydedilemedi.');
    }
  }

  async function handleCheckNow() {
    if (checking) return;
    setChecking(true);
    setStatusMessage('');
    try {
      const result = await checkRemindersNow();
      setNotifications(result.notifications);
      setStatusMessage(
        result.sentCount > 0
          ? `${result.sentCount} yeni hatırlatma e-postası oluşturuldu.`
          : 'Yaklaşan bildirim penceresinde yeni randevu yok.',
      );
    } catch {
      setStatusMessage('Kontrol sırasında bir sorun oluştu.');
    } finally {
      setChecking(false);
    }
  }

  const selectValue = minutes === null ? 'off' : String(minutes);

  return (
    <footer className="panel-footer" aria-label="Randevu hatırlatma ayarları">
      <div className="panel-footer-controls">
        <div className="panel-footer-field">
          <label htmlFor="reminder-minutes-select" className="panel-footer-label">
            E-posta hatırlatması
          </label>
          <select
            id="reminder-minutes-select"
            aria-label="Hatırlatma süresi"
            className="panel-footer-select"
            value={selectValue}
            onChange={(e) => void handleSelectChange(e.target.value)}
          >
            {OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="panel-footer-button"
          disabled={checking}
          onClick={() => void handleCheckNow()}
        >
          {checking ? 'Kontrol ediliyor…' : 'Şimdi kontrol et'}
        </button>
        {statusMessage && <span className="panel-footer-status">{statusMessage}</span>}
      </div>

      <div className="panel-footer-sent">
        <h2 className="panel-footer-heading">Gönderilen Bildirimler (E-posta Önizleme)</h2>
        {notifications.length === 0 ? (
          <p className="panel-footer-empty">Henüz gönderilmiş hatırlatma bildirimi yok.</p>
        ) : (
          <ul className="panel-footer-list">
            {notifications.map((n) => (
              <li key={n.id} className="panel-footer-item">
                <div className="panel-footer-item-head">
                  <span className="panel-footer-subject">{n.subject}</span>
                  <span className="panel-footer-meta">{`Kime: ${n.recipientEmail}`}</span>
                </div>
                <pre className="panel-footer-body">{n.body}</pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </footer>
  );
}
