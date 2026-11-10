import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AppDeps } from './app.js';
import { DemoIdentityProvider, DEMO_USERS } from './auth/demo-identity-provider.js';
import { SessionService } from './auth/session-service.js';
import { upsertUsers } from './db/users.js';
import { PostgresAppointmentRepository } from './repositories/postgres/appointment-repository.js';
import { PostgresCustomerRepository } from './repositories/postgres/customer-repository.js';
import { PostgresSessionStore } from './repositories/postgres/session-store.js';
import { PostgresUserRepository } from './repositories/postgres/user-repository.js';
import { AppointmentService } from './services/appointment-service.js';
import { CustomerService } from './services/customer-service.js';
import { AYSE, startTestServer } from './test-support.js';
import { openTestDb, testDbEnabled, type TestDb } from './test-db.js';

const skip = !testDbEnabled;
let db: TestDb;
before(async () => {
  if (!skip) db = await openTestDb();
});
after(async () => {
  if (!skip) await db.close();
});

function postgresDeps(): AppDeps {
  const customers = new PostgresCustomerRepository(db.pool);
  return {
    sessions: new SessionService(new DemoIdentityProvider(), new PostgresSessionStore(db.pool), new PostgresUserRepository(db.pool)),
    customers: new CustomerService(customers),
    appointments: new AppointmentService(new PostgresAppointmentRepository(db.pool), customers),
    production: false,
  };
}

test('data written through the API survives a fresh app instance and clashes return 409', { skip }, async () => {
  await db.reset();
  await upsertUsers(db.pool, DEMO_USERS);

  const first = startTestServer(postgresDeps());
  try {
    const ayse = await first.login(AYSE);
    const created = await ayse.api('/customers', {
      method: 'POST',
      body: { firstName: 'Deniz', lastName: 'Aydın', birthDate: '1990-05-17', gender: 'other' },
    });
    assert.equal(created.status, 201);
    const { customer } = (await created.json()) as { customer: { id: string } };
    const slot = { customerId: customer.id, date: '2026-11-05', startTime: '10:00', endTime: '11:00' };
    assert.equal((await ayse.api('/appointments', { method: 'POST', body: slot })).status, 201);
    assert.equal((await ayse.api('/appointments', { method: 'POST', body: { ...slot, startTime: '10:30', endTime: '11:30' } })).status, 409);
  } finally {
    first.close();
  }

  const second = startTestServer(postgresDeps());
  try {
    const again = await second.login(AYSE);
    const list = await again.api('/appointments?from=2026-11-05&to=2026-11-05');
    const body = (await list.json()) as unknown;
    assert.equal(list.status, 200);
    assert.match(JSON.stringify(body), /10:00/);
    assert.match(JSON.stringify(body), /Deniz/);
  } finally {
    second.close();
  }
});
