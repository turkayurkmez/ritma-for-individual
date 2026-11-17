import type pg from 'pg';
import type { ReminderNotification } from '../../domain/types.js';
import type { ReminderNotificationRepository } from '../types.js';

interface NotificationRow {
  id: string;
  user_id: string;
  appointment_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  sent_at: Date | string;
}

function toNotification(row: NotificationRow): ReminderNotification {
  return {
    id: row.id,
    userId: row.user_id,
    appointmentId: row.appointment_id,
    recipientEmail: row.recipient_email,
    subject: row.subject,
    body: row.body,
    sentAt: new Date(row.sent_at).toISOString(),
  };
}

export class PostgresReminderNotificationRepository implements ReminderNotificationRepository {
  constructor(private readonly pool: pg.Pool) {}

  async create(notification: ReminderNotification): Promise<ReminderNotification> {
    const { rows } = await this.pool.query<NotificationRow>(
      `INSERT INTO reminder_notifications (id, user_id, appointment_id, recipient_email, subject, body, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, appointment_id, recipient_email, subject, body, sent_at`,
      [
        notification.id,
        notification.userId,
        notification.appointmentId,
        notification.recipientEmail,
        notification.subject,
        notification.body,
        notification.sentAt,
      ],
    );
    return toNotification(rows[0]!);
  }

  async listByUser(userId: string, limit = 20): Promise<ReminderNotification[]> {
    const { rows } = await this.pool.query<NotificationRow>(
      `SELECT id, user_id, appointment_id, recipient_email, subject, body, sent_at
       FROM reminder_notifications
       WHERE user_id = $1
       ORDER BY sent_at DESC, id DESC
       LIMIT $2`,
      [userId, limit],
    );
    return rows.map(toNotification);
  }
}
