import { mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { createPool } from './pool.js';

test('an error on an idle connection is logged without crashing and without the address', async () => {
  const log = mock.method(console, 'error', () => {});
  const pool = createPool('postgres://user:secretpw@127.0.0.1:1/db');
  try {
    assert.doesNotThrow(() => pool.emit('error', new Error('Connection terminated unexpectedly')));
    const logged = JSON.stringify(log.mock.calls.map((c) => c.arguments));
    assert.match(logged, /Connection terminated unexpectedly/);
    assert.ok(!logged.includes('secretpw'));
  } finally {
    log.mock.restore();
    await pool.end();
  }
});

test('connecting has a timeout so an unreachable host cannot hang startup', async () => {
  const pool = createPool('postgres://user:pw@127.0.0.1:1/db');
  try {
    const timeout = (pool.options as { connectionTimeoutMillis?: number }).connectionTimeoutMillis;
    assert.ok(timeout !== undefined && timeout > 0 && timeout <= 30_000);
  } finally {
    await pool.end();
  }
});
