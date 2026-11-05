import type pg from 'pg';
import type { Appointment, AppointmentStatus } from '../../domain/types.js';
import type { AppointmentRepository } from '../types.js';

interface AppointmentRow {
  id: string;
  user_id: string;
  customer_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  note: string;
}

const COLUMNS = 'id, user_id, customer_id, date, start_time, end_time, status, note';
const EXCLUSION_VIOLATION = '23P01';

function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    userId: row.user_id,
    customerId: row.customer_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    note: row.note,
  };
}

export class PostgresAppointmentRepository implements AppointmentRepository {
  constructor(private readonly pool: pg.Pool) {}

  async findById(userId: string, id: string): Promise<Appointment | undefined> {
    const { rows } = await this.pool.query<AppointmentRow>(
      `SELECT ${COLUMNS} FROM appointments WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return rows[0] ? toAppointment(rows[0]) : undefined;
  }

  async listByDateRange(userId: string, from: string, to: string): Promise<Appointment[]> {
    const { rows } = await this.pool.query<AppointmentRow>(
      `SELECT ${COLUMNS} FROM appointments WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date, start_time, id`,
      [userId, from, to],
    );
    return rows.map(toAppointment);
  }

  /** Çakışmayı veritabanındaki EXCLUDE kısıtı denetler; kontrol ve yazma tek ifadedir. */
  async saveIfNoConflict(appointment: Appointment): Promise<Appointment | undefined> {
    try {
      await this.pool.query(
        `INSERT INTO appointments (${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           customer_id = EXCLUDED.customer_id, date = EXCLUDED.date, start_time = EXCLUDED.start_time,
           end_time = EXCLUDED.end_time, status = EXCLUDED.status, note = EXCLUDED.note
         WHERE appointments.user_id = EXCLUDED.user_id`,
        [
          appointment.id,
          appointment.userId,
          appointment.customerId,
          appointment.date,
          appointment.startTime,
          appointment.endTime,
          appointment.status,
          appointment.note,
        ],
      );
      return appointment;
    } catch (error) {
      if ((error as { code?: string }).code === EXCLUSION_VIOLATION) return undefined;
      throw error;
    }
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM appointments WHERE id = $1 AND user_id = $2', [id, userId]);
    return (result.rowCount ?? 0) > 0;
  }
}
