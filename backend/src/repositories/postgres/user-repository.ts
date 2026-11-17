import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { ReminderMinutes, User } from '../../domain/types.js';
import type { UserRepository, UserWithSettings } from '../types.js';

interface UserRow {
  id: string;
  email: string;
  display_name: string;
}

interface UserWithSettingsRow extends UserRow {
  reminder_minutes_before: ReminderMinutes | null;
}

function toUser(row: UserRow): User {
  return { id: row.id, email: row.email, displayName: row.display_name };
}

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: pg.Pool) {}

  async findById(id: string): Promise<User | undefined> {
    const { rows } = await this.pool.query<UserRow>('SELECT id, email, display_name FROM users WHERE id = $1', [id]);
    return rows[0] ? toUser(rows[0]) : undefined;
  }

  async findOrCreateByGoogle(input: { googleSub: string; email: string; displayName: string }): Promise<User | undefined> {
    // Hedefsiz ON CONFLICT hem google_sub hem lower(email) çakışmasını sessizce yutar.
    const inserted = await this.pool.query<UserRow>(
      `INSERT INTO users (id, email, display_name, google_sub) VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING RETURNING id, email, display_name`,
      [`user-${randomUUID()}`, input.email, input.displayName, input.googleSub],
    );
    if (inserted.rows[0]) return toUser(inserted.rows[0]);
    // Satır eklenmedi: ya bu Google kimliği zaten kayıtlı ya da e-posta başka kullanıcıda.
    const existing = await this.pool.query<UserRow>(
      'SELECT id, email, display_name FROM users WHERE google_sub = $1',
      [input.googleSub],
    );
    return existing.rows[0] ? toUser(existing.rows[0]) : undefined;
  }

  async getReminderSettings(userId: string): Promise<ReminderMinutes | null> {
    const { rows } = await this.pool.query<{ reminder_minutes_before: ReminderMinutes | null }>(
      'SELECT reminder_minutes_before FROM users WHERE id = $1',
      [userId],
    );
    return rows[0] ? rows[0].reminder_minutes_before : null;
  }

  async updateReminderSettings(userId: string, minutes: ReminderMinutes | null): Promise<ReminderMinutes | null> {
    await this.pool.query('UPDATE users SET reminder_minutes_before = $2 WHERE id = $1', [userId, minutes]);
    return minutes;
  }

  async listUsersWithRemindersEnabled(): Promise<UserWithSettings[]> {
    const { rows } = await this.pool.query<UserWithSettingsRow>(
      'SELECT id, email, display_name, reminder_minutes_before FROM users WHERE reminder_minutes_before IS NOT NULL ORDER BY id',
    );
    return rows
      .filter((r): r is UserWithSettingsRow & { reminder_minutes_before: ReminderMinutes } => r.reminder_minutes_before !== null)
      .map((r) => ({
        id: r.id,
        email: r.email,
        displayName: r.display_name,
        reminderMinutesBefore: r.reminder_minutes_before,
      }));
  }
}
