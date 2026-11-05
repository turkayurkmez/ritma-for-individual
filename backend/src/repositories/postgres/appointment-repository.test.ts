import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { appointmentRepositoryContract } from '../contract/appointment-repository.contract.js';
import { openTestDb, testDbEnabled, type TestDb } from '../../test-db.js';
import { PostgresAppointmentRepository } from './appointment-repository.js';

let db: TestDb;
before(async () => {
  if (testDbEnabled) db = await openTestDb();
});
after(async () => {
  if (testDbEnabled) await db.close();
});

appointmentRepositoryContract(
  'postgres',
  async () => {
    await db.reset();
    return {
      repo: new PostgresAppointmentRepository(db.pool),
      seedUser: async (id) => {
        await db.pool.query('INSERT INTO users (id, email, display_name) VALUES ($1, $2, $1)', [id, `${id}@test.local`]);
      },
      seedCustomer: async (userId, customerId) => {
        await db.pool.query(
          "INSERT INTO customers (id, user_id, first_name, last_name, birth_date, gender) VALUES ($1, $2, 'Ad', 'Soyad', '2000-01-01', 'other')",
          [customerId, userId],
        );
      },
    };
  },
  { skip: !testDbEnabled },
);

test('[postgres] racing saves on separate connections: exactly one wins every time', { skip: !testDbEnabled }, async () => {
  await db.reset();
  await db.pool.query("INSERT INTO users (id, email, display_name) VALUES ('u1', 'u1@test.local', 'u1')");
  await db.pool.query(
    "INSERT INTO customers (id, user_id, first_name, last_name, birth_date, gender) VALUES ('c1', 'u1', 'Ad', 'Soyad', '2000-01-01', 'other')",
  );
  const a = new PostgresAppointmentRepository(db.pool);
  const b = new PostgresAppointmentRepository(db.extraPool());
  for (let hour = 8; hour < 16; hour++) {
    const start = `${String(hour).padStart(2, '0')}:00`;
    const end = `${String(hour + 1).padStart(2, '0')}:00`;
    const make = (id: string) => ({ id, userId: 'u1', customerId: 'c1', date: '2026-11-05', startTime: start, endTime: end, status: 'scheduled' as const, note: '' });
    const results = await Promise.all([a.saveIfNoConflict(make(`a${hour}`)), b.saveIfNoConflict(make(`b${hour}`))]);
    assert.equal(results.filter((r) => r !== undefined).length, 1, `saat ${start}`);
  }
});
