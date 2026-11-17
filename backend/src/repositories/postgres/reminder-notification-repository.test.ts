import { after, before } from 'node:test';
import { reminderNotificationRepositoryContract } from '../contract/reminder-notification-repository.contract.js';
import { openTestDb, testDbEnabled, type TestDb } from '../../test-db.js';
import { PostgresReminderNotificationRepository } from './reminder-notification-repository.js';

let db: TestDb;
before(async () => {
  if (testDbEnabled) db = await openTestDb();
});
after(async () => {
  if (testDbEnabled) await db.close();
});

reminderNotificationRepositoryContract(
  'postgres',
  async () => {
    await db.reset();
    return {
      repo: new PostgresReminderNotificationRepository(db.pool),
      seedAppointment: async (userId, customerId, appointmentId) => {
        await db.pool.query(
          'INSERT INTO users (id, email, display_name) VALUES ($1, $2, $1) ON CONFLICT (id) DO NOTHING',
          [userId, `${userId}@test.local`],
        );
        await db.pool.query(
          "INSERT INTO customers (id, user_id, first_name, last_name, birth_date, gender) VALUES ($1, $2, 'Ad', 'Soyad', '2000-01-01', 'other') ON CONFLICT (id) DO NOTHING",
          [customerId, userId],
        );
        await db.pool.query(
          "INSERT INTO appointments (id, user_id, customer_id, date, start_time, end_time, status, note) VALUES ($1, $2, $3, '2026-11-05', '10:00', '11:00', 'scheduled', '')",
          [appointmentId, userId, customerId],
        );
      },
    };
  },
  { skip: !testDbEnabled },
);
