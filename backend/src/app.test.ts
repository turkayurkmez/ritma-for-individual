import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './test-support.js';

test('health endpoint returns ok', async () => {
  const server = startTestServer();
  try {
    const res = await fetch(`${server.baseUrl}/api/v1/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok' });
  } finally {
    server.close();
  }
});
