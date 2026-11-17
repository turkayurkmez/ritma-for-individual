import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { AYSE, MEHMET, startTestServer, type TestServer } from '../test-support.js';

let server: TestServer | undefined;
afterEach(() => server?.close());

test('POST /ai/parse-appointment requires auth and validates prompt', async () => {
  server = startTestServer();
  const unauth = await fetch(`${server.baseUrl}/api/v1/ai/parse-appointment`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: 'Yarın 14:00 Ali Veli' }),
  });
  assert.equal(unauth.status, 401);

  const ayse = await server.login(AYSE);
  const empty = await ayse.api('/ai/parse-appointment', {
    method: 'POST',
    body: { prompt: '   ' },
  });
  assert.equal(empty.status, 400);
});

test('POST /ai/parse-appointment matches only the logged-in user customers and writes nothing to DB', async () => {
  server = startTestServer();
  const ayse = await server.login(AYSE);
  const mehmet = await server.login(MEHMET);

  const createdRes = await ayse.api('/customers', {
    method: 'POST',
    body: { firstName: 'Ali', lastName: 'Veli', birthDate: '1990-01-01', gender: 'male' },
  });
  const { customer: ali } = (await createdRes.json()) as { customer: { id: string } };

  const ayseParse = await ayse.api('/ai/parse-appointment', {
    method: 'POST',
    body: { prompt: 'Yarın 14:00-15:00 Ali Veli kontrol randevusu', referenceDate: '2026-11-17' },
  });
  assert.equal(ayseParse.status, 200);
  const ayseDraft = await ayseParse.json();
  assert.deepEqual(ayseDraft, {
    customerId: ali.id,
    suggestedCustomer: null,
    date: '2026-11-18',
    startTime: '14:00',
    endTime: '15:00',
    note: 'kontrol randevusu',
  });

  // Mehmet aynı cümleyi yazdığında Ayşe'nin müşterisiyle eşleşmez.
  const mehmetParse = await mehmet.api('/ai/parse-appointment', {
    method: 'POST',
    body: { prompt: 'Yarın 14:00-15:00 Ali Veli kontrol randevusu', referenceDate: '2026-11-17' },
  });
  assert.equal(mehmetParse.status, 200);
  const mehmetDraft = (await mehmetParse.json()) as { customerId: string | null; suggestedCustomer: unknown };
  assert.equal(mehmetDraft.customerId, null);
  assert.deepEqual(mehmetDraft.suggestedCustomer, { firstName: 'Ali', lastName: 'Veli' });

  // Hiçbir randevu veritabanına otomatik yazılmamıştır.
  const apptsRes = await ayse.api('/appointments?from=2026-11-01&to=2026-11-30');
  const { appointments } = (await apptsRes.json()) as { appointments: unknown[] };
  assert.equal(appointments.length, 0);
});
