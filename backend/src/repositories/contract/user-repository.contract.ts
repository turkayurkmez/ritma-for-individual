import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { UserRepository } from '../types.js';

export type UserSetup = () => Promise<{ repo: UserRepository }>;

/** Bellek ve Postgres gerçeklemelerinin ikisinin de sağlaması gereken davranışlar. */
export function userRepositoryContract(label: string, setup: UserSetup, options: { skip?: boolean } = {}): void {
  const t = (name: string, fn: () => Promise<void>) => test(`[${label}] ${name}`, { skip: options.skip }, fn);
  const google = { googleSub: 'sub-1', email: 'a@gmail.com', displayName: 'Ayşe' };

  t('creates a user for a new Google identity with a generated id', async () => {
    const { repo } = await setup();
    const user = await repo.findOrCreateByGoogle(google);
    assert.ok(user);
    assert.equal(user.email, 'a@gmail.com');
    assert.equal(user.displayName, 'Ayşe');
    assert.match(user.id, /^user-[0-9a-f-]{36}$/);
    assert.deepEqual(await repo.findById(user.id), user);
  });

  t('returns the same user for the same Google identity and does not update email or name', async () => {
    const { repo } = await setup();
    const first = await repo.findOrCreateByGoogle(google);
    const second = await repo.findOrCreateByGoogle({ googleSub: 'sub-1', email: 'b@gmail.com', displayName: 'Başka' });
    assert.ok(first && second);
    assert.equal(second.id, first.id);
    assert.equal(second.email, 'a@gmail.com');
    assert.equal(second.displayName, 'Ayşe');
  });

  t('concurrent first sign-ins create exactly one user', async () => {
    const { repo } = await setup();
    const users = await Promise.all(Array.from({ length: 5 }, () => repo.findOrCreateByGoogle(google)));
    const ids = users.map((u) => u?.id);
    assert.ok(ids.every((id) => id !== undefined));
    assert.equal(new Set(ids).size, 1);
  });

  t('returns undefined when the email belongs to another Google identity, ignoring case', async () => {
    const { repo } = await setup();
    await repo.findOrCreateByGoogle(google);
    const other = { googleSub: 'sub-2', email: 'A@Gmail.com', displayName: 'Ayşe' };
    assert.equal(await repo.findOrCreateByGoogle(other), undefined);
    assert.equal(await repo.findOrCreateByGoogle(other), undefined);
  });

  t('findById returns undefined for an unknown id', async () => {
    const { repo } = await setup();
    assert.equal(await repo.findById('user-yok'), undefined);
  });
}
