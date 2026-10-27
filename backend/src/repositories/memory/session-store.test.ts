import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemorySessionStore } from './session-store.js';

test('a created session can be found until it is deleted', async () => {
  const store = new MemorySessionStore();
  const session = await store.create('u1');
  assert.equal((await store.find(session.token))?.userId, 'u1');
  await store.delete(session.token);
  assert.equal(await store.find(session.token), undefined);
});

test('sessions get distinct unguessable tokens', async () => {
  const store = new MemorySessionStore();
  const [a, b] = [await store.create('u1'), await store.create('u1')];
  assert.notEqual(a.token, b.token);
  assert.match(a.token, /^[0-9a-f]{64}$/);
});
