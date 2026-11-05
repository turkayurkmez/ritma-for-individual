import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Customer } from '../../domain/types.js';
import type { CustomerRepository } from '../types.js';

/** Gerçeklemeye özgü hazırlık: Postgres'te yabancı anahtarlar için satır ekler, bellekte hiçbir şey yapmaz. */
export interface RepoContext {
  seedUser(id: string): Promise<void>;
}

export type CustomerSetup = () => Promise<{ repo: CustomerRepository } & RepoContext>;

function customer(over: Partial<Customer> = {}): Customer {
  return {
    id: 'c1',
    userId: 'u1',
    firstName: 'Ayşe',
    lastName: 'Yılmaz',
    birthDate: '2000-01-01',
    gender: 'female',
    deletedAt: null,
    ...over,
  };
}

/** Bellek ve Postgres gerçeklemelerinin ikisinin de sağlaması gereken davranışlar. */
export function customerRepositoryContract(label: string, setup: CustomerSetup, options: { skip?: boolean } = {}): void {
  const t = (name: string, fn: () => Promise<void>) => test(`[${label}] ${name}`, { skip: options.skip }, fn);

  t('a created customer is found with the birth date unchanged', async () => {
    const { repo, seedUser } = await setup();
    await seedUser('u1');
    await repo.create(customer());
    assert.deepEqual(await repo.findById('u1', 'c1'), customer());
  });

  t('another user cannot find the customer', async () => {
    const { repo, seedUser } = await setup();
    await seedUser('u1');
    await seedUser('u2');
    await repo.create(customer());
    assert.equal(await repo.findById('u2', 'c1'), undefined);
  });

  t('listActive returns only the user\'s non-deleted customers', async () => {
    const { repo, seedUser } = await setup();
    await seedUser('u1');
    await seedUser('u2');
    await repo.create(customer({ id: 'c1' }));
    await repo.create(customer({ id: 'c2', deletedAt: '2026-11-05T10:00:00.000Z' }));
    await repo.create(customer({ id: 'c3', userId: 'u2' }));
    assert.deepEqual((await repo.listActive('u1')).map((c) => c.id), ['c1']);
  });

  t('a soft-deleted customer leaves listActive but can still be found', async () => {
    const { repo, seedUser } = await setup();
    await seedUser('u1');
    await repo.create(customer());
    const deletedAt = '2026-11-05T10:00:00.000Z';
    await repo.update(customer({ deletedAt }));
    assert.deepEqual(await repo.listActive('u1'), []);
    assert.equal((await repo.findById('u1', 'c1'))?.deletedAt, deletedAt);
  });

  t('update writes the changed fields', async () => {
    const { repo, seedUser } = await setup();
    await seedUser('u1');
    await repo.create(customer());
    await repo.update(customer({ firstName: 'Zeynep', gender: 'other', birthDate: '1999-12-31' }));
    const found = await repo.findById('u1', 'c1');
    assert.equal(found?.firstName, 'Zeynep');
    assert.equal(found?.gender, 'other');
    assert.equal(found?.birthDate, '1999-12-31');
  });
}
