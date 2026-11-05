import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SessionStore } from '../types.js';
import type { RepoContext } from './customer-repository.contract.js';

export type SessionSetup = () => Promise<{ store: SessionStore } & RepoContext>;

/** Bellek ve Postgres gerçeklemelerinin ikisinin de sağlaması gereken davranışlar. */
export function sessionStoreContract(label: string, setup: SessionSetup, options: { skip?: boolean } = {}): void {
  const t = (name: string, fn: () => Promise<void>) => test(`[${label}] ${name}`, { skip: options.skip }, fn);

  async function ready() {
    const ctx = await setup();
    await ctx.seedUser('u1');
    return ctx.store;
  }

  t('a created session can be found until it is deleted', async () => {
    const store = await ready();
    const session = await store.create('u1');
    assert.equal((await store.find(session.token))?.userId, 'u1');
    await store.delete(session.token);
    assert.equal(await store.find(session.token), undefined);
  });

  t('sessions get distinct unguessable tokens', async () => {
    const store = await ready();
    const [a, b] = [await store.create('u1'), await store.create('u1')];
    assert.notEqual(a.token, b.token);
    assert.match(a.token, /^[0-9a-f]{64}$/);
  });

  t('unknown or empty tokens are not found and do not throw', async () => {
    const store = await ready();
    assert.equal(await store.find('yok'), undefined);
    assert.equal(await store.find(''), undefined);
  });

  t('createdAt is an ISO timestamp', async () => {
    const store = await ready();
    const session = await store.create('u1');
    assert.equal(new Date(session.createdAt).toISOString(), session.createdAt);
    assert.equal((await store.find(session.token))?.createdAt, session.createdAt);
  });

  t('deleting an unknown token does not throw', async () => {
    const store = await ready();
    await store.delete('yok');
  });
}
