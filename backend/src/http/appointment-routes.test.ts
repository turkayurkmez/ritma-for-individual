import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AYSE, MEHMET, startTestServer } from '../test-support.js';

type Client = Awaited<ReturnType<ReturnType<typeof startTestServer>['login']>>;

const customer = { firstName: 'Ilgaz', lastName: 'Demir', birthDate: '1990-05-17', gender: 'male' };

async function withServer(fn: (s: ReturnType<typeof startTestServer>) => Promise<void>) {
  const server = startTestServer();
  try {
    await fn(server);
  } finally {
    server.close();
  }
}

async function newCustomer(client: Client): Promise<string> {
  const res = await client.api('/customers', { method: 'POST', body: customer });
  return ((await res.json()) as { customer: { id: string } }).customer.id;
}

const slot = (customerId: string, over: object = {}) => ({
  customerId,
  date: '2026-11-02',
  startTime: '10:00',
  endTime: '11:00',
  ...over,
});

const list = async (client: Client, query: string) =>
  ((await (await client.api(`/appointments?${query}`)).json()) as { appointments: Array<{ id: string; status: string }> })
    .appointments;

test('every appointment endpoint requires a login', () =>
  withServer(async ({ baseUrl }) => {
    for (const [method, path] of [
      ['GET', '/appointments?from=2026-11-01&to=2026-11-01'],
      ['POST', '/appointments'],
      ['GET', '/appointments/x'],
      ['PATCH', '/appointments/x'],
      ['DELETE', '/appointments/x'],
    ]) {
      const res = await fetch(`${baseUrl}/api/v1${path}`, { method });
      assert.equal(res.status, 401, `${method} ${path}`);
    }
  }));

test('create returns 201 with the customer name and defaults', () =>
  withServer(async (server) => {
    const ayse = await server.login(AYSE);
    const res = await ayse.api('/appointments', { method: 'POST', body: slot(await newCustomer(ayse)) });
    assert.equal(res.status, 201);
    const { appointment } = (await res.json()) as {
      appointment: { status: string; note: string; customer: { firstName: string } };
    };
    assert.deepEqual([appointment.status, appointment.note, appointment.customer.firstName], ['scheduled', '', 'Ilgaz']);
  }));

test('an overlapping appointment is 409 conflict', () =>
  withServer(async (server) => {
    const ayse = await server.login(AYSE);
    const id = await newCustomer(ayse);
    await ayse.api('/appointments', { method: 'POST', body: slot(id) });
    const res = await ayse.api('/appointments', { method: 'POST', body: slot(id, { startTime: '10:30', endTime: '11:30' }) });
    assert.equal(res.status, 409);
    assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'conflict');
    const touching = await ayse.api('/appointments', { method: 'POST', body: slot(id, { startTime: '11:00', endTime: '12:00' }) });
    assert.equal(touching.status, 201);
  }));

test('a day list is the same endpoint with from equal to to', () =>
  withServer(async (server) => {
    const ayse = await server.login(AYSE);
    const id = await newCustomer(ayse);
    await ayse.api('/appointments', { method: 'POST', body: slot(id) });
    await ayse.api('/appointments', { method: 'POST', body: slot(id, { date: '2026-11-03' }) });
    assert.equal((await list(ayse, 'from=2026-11-02&to=2026-11-02')).length, 1);
    assert.equal((await list(ayse, 'from=2026-11-01&to=2026-11-30')).length, 2);
  }));

test('bad date ranges are 400', () =>
  withServer(async (server) => {
    const ayse = await server.login(AYSE);
    for (const query of ['to=2026-11-02', 'from=2026-11-02', 'from=2026-01-01&to=2027-01-02', 'from=2026-02-30&to=2026-03-01']) {
      assert.equal((await ayse.api(`/appointments?${query}`)).status, 400, query);
    }
  }));

test('impossible times and dates are 400', () =>
  withServer(async (server) => {
    const ayse = await server.login(AYSE);
    const id = await newCustomer(ayse);
    for (const over of [{ startTime: '25:00' }, { date: '2026-02-30' }, { endTime: '10:00' }, { status: 'x' }]) {
      const res = await ayse.api('/appointments', { method: 'POST', body: slot(id, over) });
      assert.equal(res.status, 400, JSON.stringify(over));
    }
  }));

test("using another user's customer id is 404", () =>
  withServer(async (server) => {
    const ayse = await server.login(AYSE);
    const mehmet = await server.login(MEHMET);
    const res = await mehmet.api('/appointments', { method: 'POST', body: slot(await newCustomer(ayse)) });
    assert.equal(res.status, 404);
    assert.equal(((await res.json()) as { error: { message: string } }).error.message, 'Müşteri bulunamadı.');
    assert.deepEqual(await list(mehmet, 'from=2026-11-01&to=2026-11-30'), []);
  }));

test("another user cannot read or change the appointment", () =>
  withServer(async (server) => {
    const ayse = await server.login(AYSE);
    const mehmet = await server.login(MEHMET);
    const created = await ayse.api('/appointments', { method: 'POST', body: slot(await newCustomer(ayse)) });
    const { appointment } = (await created.json()) as { appointment: { id: string } };
    assert.equal((await mehmet.api(`/appointments/${appointment.id}`)).status, 404);
    assert.equal((await mehmet.api(`/appointments/${appointment.id}`, { method: 'PATCH', body: { note: 'x' } })).status, 404);
    assert.equal((await mehmet.api(`/appointments/${appointment.id}`, { method: 'DELETE' })).status, 404);
    assert.deepEqual(await list(mehmet, 'from=2026-11-01&to=2026-11-30'), []);
  }));

test('cancelling frees the slot for a new appointment', () =>
  withServer(async (server) => {
    const ayse = await server.login(AYSE);
    const id = await newCustomer(ayse);
    const first = (await (await ayse.api('/appointments', { method: 'POST', body: slot(id) })).json()) as {
      appointment: { id: string };
    };
    const cancelled = await ayse.api(`/appointments/${first.appointment.id}`, { method: 'PATCH', body: { status: 'cancelled' } });
    assert.equal(cancelled.status, 200);
    const second = await ayse.api('/appointments', { method: 'POST', body: slot(id) });
    assert.equal(second.status, 201);
    const restore = await ayse.api(`/appointments/${first.appointment.id}`, { method: 'PATCH', body: { status: 'scheduled' } });
    assert.equal(restore.status, 409);
  }));

test('delete removes the appointment', () =>
  withServer(async (server) => {
    const ayse = await server.login(AYSE);
    const created = await ayse.api('/appointments', { method: 'POST', body: slot(await newCustomer(ayse)) });
    const { appointment } = (await created.json()) as { appointment: { id: string } };
    assert.equal((await ayse.api(`/appointments/${appointment.id}`, { method: 'DELETE' })).status, 204);
    assert.equal((await ayse.api(`/appointments/${appointment.id}`)).status, 404);
  }));
