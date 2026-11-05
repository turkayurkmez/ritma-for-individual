import { after, before } from 'node:test';
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
