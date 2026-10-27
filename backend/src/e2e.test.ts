import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildDeps } from './deps.js';
import { AYSE, MEHMET, startTestServer } from './test-support.js';

const webDir = path.resolve(import.meta.dirname, '../../web');

test('full flow: login, customer, appointments, conflict, cancel, soft delete, isolation, logout', async () => {
  const server = startTestServer(buildDeps({}));
  try {
    const ayse = await server.login(AYSE);
    const mehmet = await server.login(MEHMET);

    const created = await ayse.api('/customers', {
      method: 'POST',
      body: { firstName: 'Ilgaz', lastName: 'Demir', birthDate: '1990-05-17', gender: 'male' },
    });
    const { customer } = (await created.json()) as { customer: { id: string } };

    const found = (await (await ayse.api('/customers?search=ilgaz')).json()) as { customers: unknown[] };
    assert.equal(found.customers.length, 1);

    const slot = { customerId: customer.id, date: '2026-11-02', startTime: '10:00', endTime: '11:00' };
    const first = await ayse.api('/appointments', { method: 'POST', body: slot });
    assert.equal(first.status, 201);
    const { appointment } = (await first.json()) as { appointment: { id: string } };

    const clash = await ayse.api('/appointments', { method: 'POST', body: { ...slot, startTime: '10:30', endTime: '11:30' } });
    assert.equal(clash.status, 409);

    await ayse.api(`/appointments/${appointment.id}`, { method: 'PATCH', body: { status: 'cancelled' } });
    const second = await ayse.api('/appointments', { method: 'POST', body: { ...slot, startTime: '10:30', endTime: '11:30' } });
    assert.equal(second.status, 201);

    const day = (await (await ayse.api('/appointments?from=2026-11-02&to=2026-11-02')).json()) as {
      appointments: Array<{ status: string }>;
    };
    assert.deepEqual(day.appointments.map((a) => a.status), ['cancelled', 'scheduled']);

    assert.equal((await ayse.api(`/customers/${customer.id}`, { method: 'DELETE' })).status, 204);
    const afterDelete = (await (await ayse.api('/appointments?from=2026-11-02&to=2026-11-02')).json()) as {
      appointments: Array<{ customer: { firstName: string } }>;
    };
    assert.equal(afterDelete.appointments[0]?.customer.firstName, 'Ilgaz');

    const theirs = (await (await mehmet.api('/appointments?from=2026-11-01&to=2026-11-30')).json()) as {
      appointments: unknown[];
    };
    assert.deepEqual(theirs.appointments, []);

    await fetch(`${server.baseUrl}/api/v1/auth/logout`, { method: 'POST', headers: { authorization: `Bearer ${ayse.token}` } });
    const afterLogout = await fetch(`${server.baseUrl}/api/v1/auth/me`, { headers: { authorization: `Bearer ${ayse.token}` } });
    assert.equal(afterLogout.status, 401);
  } finally {
    server.close();
  }
});

test('demo accounts are switched off in production', async () => {
  const server = startTestServer(buildDeps({ NODE_ENV: 'production' }));
  try {
    const res = await fetch(`${server.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(AYSE),
    });
    assert.equal(res.status, 401);
  } finally {
    server.close();
  }
});

test('the server serves web/index.html at the root when a static directory is set', async () => {
  const server = startTestServer({ ...buildDeps({}), staticDir: webDir });
  try {
    const res = await fetch(`${server.baseUrl}/`);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), readFileSync(path.join(webDir, 'index.html'), 'utf8'));
  } finally {
    server.close();
  }
});
