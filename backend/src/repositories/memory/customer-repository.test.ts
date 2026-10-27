import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Customer } from '../../domain/types.js';
import { MemoryCustomerRepository } from './customer-repository.js';

const customer = (over: Partial<Customer> = {}): Customer => ({
  id: 'c1',
  userId: 'u1',
  firstName: 'Ilgaz',
  lastName: 'Demir',
  birthDate: '1990-05-17',
  gender: 'male',
  deletedAt: null,
  ...over,
});

test('findById does not return another user\'s customer', async () => {
  const repo = new MemoryCustomerRepository();
  await repo.create(customer());
  assert.equal(await repo.findById('u2', 'c1'), undefined);
  assert.equal((await repo.findById('u1', 'c1'))?.firstName, 'Ilgaz');
});

test('listActive returns only the user\'s non-deleted customers', async () => {
  const repo = new MemoryCustomerRepository();
  await repo.create(customer());
  await repo.create(customer({ id: 'c2', deletedAt: '2026-10-27T10:00:00.000Z' }));
  await repo.create(customer({ id: 'c3', userId: 'u2' }));
  const list = await repo.listActive('u1');
  assert.deepEqual(list.map((c) => c.id), ['c1']);
});

test('findById still returns a soft-deleted customer after update', async () => {
  const repo = new MemoryCustomerRepository();
  const created = await repo.create(customer());
  await repo.update({ ...created, deletedAt: '2026-10-27T10:00:00.000Z' });
  assert.equal((await repo.findById('u1', 'c1'))?.deletedAt, '2026-10-27T10:00:00.000Z');
});
