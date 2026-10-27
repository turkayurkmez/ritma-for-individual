import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AYSE, MEHMET, startTestServer } from '../test-support.js';

const customer = { firstName: 'Ilgaz', lastName: 'Demir', birthDate: '1990-05-17', gender: 'male' };

async function withServer(fn: (s: ReturnType<typeof startTestServer>) => Promise<void>) {
  const server = startTestServer();
  try {
    await fn(server);
  } finally {
    server.close();
  }
}

test('every customer endpoint requires a login', () =>
  withServer(async ({ baseUrl }) => {
    for (const [method, path] of [
      ['GET', '/customers'],
      ['POST', '/customers'],
      ['GET', '/customers/x'],
      ['PATCH', '/customers/x'],
      ['DELETE', '/customers/x'],
    ]) {
      const res = await fetch(`${baseUrl}/api/v1${path}`, { method });
      assert.equal(res.status, 401, `${method} ${path}`);
    }
  }));

test('create then search finds the customer regardless of case and Turkish letters', () =>
  withServer(async (server) => {
    const ayse = await server.login(AYSE);
    const created = await ayse.api('/customers', { method: 'POST', body: customer });
    assert.equal(created.status, 201);
    const found = await ayse.api('/customers?search=ılGAZ');
    assert.equal(found.status, 200);
    const { customers } = (await found.json()) as { customers: Array<{ firstName: string }> };
    assert.deepEqual(customers.map((c) => c.firstName), ['Ilgaz']);
    assert.deepEqual(((await (await ayse.api('/customers?search=zzz')).json()) as { customers: unknown[] }).customers, []);
  }));

test('get and patch return the customer; patch changes only given fields', () =>
  withServer(async (server) => {
    const ayse = await server.login(AYSE);
    const { customer: created } = (await (await ayse.api('/customers', { method: 'POST', body: customer })).json()) as {
      customer: { id: string };
    };
    const patched = await ayse.api(`/customers/${created.id}`, { method: 'PATCH', body: { lastName: 'Kaya' } });
    assert.equal(patched.status, 200);
    const got = (await (await ayse.api(`/customers/${created.id}`)).json()) as {
      customer: { firstName: string; lastName: string };
    };
    assert.deepEqual([got.customer.firstName, got.customer.lastName], ['Ilgaz', 'Kaya']);
  }));

test("another user cannot see or touch the customer", () =>
  withServer(async (server) => {
    const ayse = await server.login(AYSE);
    const mehmet = await server.login(MEHMET);
    const { customer: created } = (await (await ayse.api('/customers', { method: 'POST', body: customer })).json()) as {
      customer: { id: string };
    };
    const list = (await (await mehmet.api('/customers')).json()) as { customers: unknown[] };
    assert.deepEqual(list.customers, []);
    assert.equal((await mehmet.api(`/customers/${created.id}`)).status, 404);
    assert.equal((await mehmet.api(`/customers/${created.id}`, { method: 'PATCH', body: { firstName: 'X' } })).status, 404);
    assert.equal((await mehmet.api(`/customers/${created.id}`, { method: 'DELETE' })).status, 404);
  }));

test('invalid customers are rejected with 400', () =>
  withServer(async (server) => {
    const ayse = await server.login(AYSE);
    const future = await ayse.api('/customers', { method: 'POST', body: { ...customer, birthDate: '2999-01-01' } });
    assert.equal(future.status, 400);
    const gender = await ayse.api('/customers', { method: 'POST', body: { ...customer, gender: 'x' } });
    assert.equal(gender.status, 400);
    const noBirth = await ayse.api('/customers', { method: 'POST', body: { ...customer, birthDate: undefined } });
    assert.equal(noBirth.status, 400);
  }));

test('a deleted customer disappears from the list and get', () =>
  withServer(async (server) => {
    const ayse = await server.login(AYSE);
    const { customer: created } = (await (await ayse.api('/customers', { method: 'POST', body: customer })).json()) as {
      customer: { id: string };
    };
    assert.equal((await ayse.api(`/customers/${created.id}`, { method: 'DELETE' })).status, 204);
    assert.deepEqual(((await (await ayse.api('/customers')).json()) as { customers: unknown[] }).customers, []);
    assert.equal((await ayse.api(`/customers/${created.id}`)).status, 404);
  }));
