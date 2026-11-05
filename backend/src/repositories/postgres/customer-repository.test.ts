import { after, before } from 'node:test';
import { customerRepositoryContract } from '../contract/customer-repository.contract.js';
import { openTestDb, testDbEnabled, type TestDb } from '../../test-db.js';
import { PostgresCustomerRepository } from './customer-repository.js';

let db: TestDb;
before(async () => {
  if (testDbEnabled) db = await openTestDb();
});
after(async () => {
  if (testDbEnabled) await db.close();
});

customerRepositoryContract(
  'postgres',
  async () => {
    await db.reset();
    return {
      repo: new PostgresCustomerRepository(db.pool),
      seedUser: async (id) => {
        await db.pool.query('INSERT INTO users (id, email, display_name) VALUES ($1, $2, $1)', [id, `${id}@test.local`]);
      },
    };
  },
  { skip: !testDbEnabled },
);
