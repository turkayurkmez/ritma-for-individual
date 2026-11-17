import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { AYSE, MEHMET, buildTestDeps, startTestServer, type TestServer } from '../test-support.js';

let server: TestServer | undefined;
afterEach(() => server?.close());

test('GET and PATCH /settings/reminders read, update and validate reminder minutes', async () => {
  server = startTestServer();
  const ayse = await server.login(AYSE);

  const initial = await ayse.api('/settings/reminders');
  assert.equal(initial.status, 200);
  assert.deepEqual(await initial.json(), { reminderMinutesBefore: 30 });

  const updated = await ayse.api('/settings/reminders', {
    method: 'PATCH',
    body: { reminderMinutesBefore: 15 },
  });
  assert.equal(updated.status, 200);
  assert.deepEqual(await updated.json(), { reminderMinutesBefore: 15 });

  const disabled = await ayse.api('/settings/reminders', {
    method: 'PATCH',
    body: { reminderMinutesBefore: null },
  });
  assert.equal(disabled.status, 200);
  assert.deepEqual(await disabled.json(), { reminderMinutesBefore: null });

  const invalid = await ayse.api('/settings/reminders', {
    method: 'PATCH',
    body: { reminderMinutesBefore: 45 },
  });
  assert.equal(invalid.status, 400);
});

test('POST /reminders/check and GET /reminders/sent generate and list user-scoped notifications', async () => {
  server = startTestServer(buildTestDeps({ now: () => new Date(2026, 10, 17, 13, 40, 0) }));
  const ayse = await server.login(AYSE);
  const mehmet = await server.login(MEHMET);

  const custRes = await ayse.api('/customers', {
    method: 'POST',
    body: { firstName: 'Deniz', lastName: 'Arslan', birthDate: '1995-04-12', gender: 'female' },
  });
  const { customer } = (await custRes.json()) as { customer: { id: string } };

  await ayse.api('/appointments', {
    method: 'POST',
    body: {
      customerId: customer.id,
      date: '2026-11-17',
      startTime: '14:00',
      endTime: '15:00',
      status: 'scheduled',
      note: 'Kontrol görüşmesi',
    },
  });

  const checkRes = await ayse.api('/reminders/check', { method: 'POST' });
  assert.equal(checkRes.status, 200);
  const checkBody = (await checkRes.json()) as { sentCount: number; notifications: Array<{ subject: string }> };
  assert.equal(checkBody.sentCount, 1);
  assert.equal(checkBody.notifications.length, 1);
  assert.match(checkBody.notifications[0]!.subject, /Deniz Arslan/);

  const sentRes = await ayse.api('/reminders/sent');
  assert.equal(sentRes.status, 200);
  const sentList = (await sentRes.json()) as Array<{ subject: string }>;
  assert.equal(sentList.length, 1);

  const mehmetSent = await mehmet.api('/reminders/sent');
  assert.deepEqual(await mehmetSent.json(), []);
});
