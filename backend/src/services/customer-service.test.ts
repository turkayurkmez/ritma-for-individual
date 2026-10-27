import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../domain/errors.js';
import type { CustomerInput } from '../domain/types.js';
import { MemoryCustomerRepository } from '../repositories/memory/customer-repository.js';
import { CustomerService } from './customer-service.js';

const input = (over: Partial<CustomerInput> = {}): CustomerInput => ({
  firstName: 'Ilgaz',
  lastName: 'Demir',
  birthDate: '1990-05-17',
  gender: 'male',
  ...over,
});

const isNotFound = (e: unknown) => e instanceof AppError && e.status === 404;

function setup() {
  return new CustomerService(new MemoryCustomerRepository(), () => new Date('2026-10-27T10:00:00Z'));
}

test('create returns an active customer owned by the user', async () => {
  const service = setup();
  const created = await service.create('u1', input());
  assert.equal(created.userId, 'u1');
  assert.equal(created.deletedAt, null);
  assert.ok(created.id);
});

test('another user cannot get, update or delete the customer', async () => {
  const service = setup();
  const { id } = await service.create('u1', input());
  await assert.rejects(service.get('u2', id), isNotFound);
  await assert.rejects(service.update('u2', id, { firstName: 'X' }), isNotFound);
  await assert.rejects(service.softDelete('u2', id), isNotFound);
  assert.deepEqual(await service.search('u2'), []);
});

test('update changes only the given fields', async () => {
  const service = setup();
  const { id } = await service.create('u1', input());
  const updated = await service.update('u1', id, { lastName: 'Kaya' });
  assert.equal(updated.lastName, 'Kaya');
  assert.equal(updated.firstName, 'Ilgaz');
});

test('softDelete hides the customer from search and get', async () => {
  const service = setup();
  const { id } = await service.create('u1', input());
  await service.softDelete('u1', id);
  assert.deepEqual(await service.search('u1'), []);
  await assert.rejects(service.get('u1', id), isNotFound);
  await assert.rejects(service.update('u1', id, { firstName: 'X' }), isNotFound);
  await assert.rejects(service.softDelete('u1', id), isNotFound);
});

test('search ignores case and Turkish characters', async () => {
  const service = setup();
  await service.create('u1', input());
  await service.create('u1', input({ firstName: 'Şener', lastName: 'Çelik' }));
  for (const q of ['ılgaz', 'ILGAZ', 'ilgaz']) {
    assert.deepEqual((await service.search('u1', q)).map((c) => c.firstName), ['Ilgaz'], q);
  }
  assert.deepEqual((await service.search('u1', 'sener')).map((c) => c.firstName), ['Şener']);
});

test('search matches across first and last name and empty query lists all', async () => {
  const service = setup();
  await service.create('u1', input());
  await service.create('u1', input({ firstName: 'Ayşe', lastName: 'Aksoy' }));
  assert.equal((await service.search('u1', 'gaz d')).length, 1);
  assert.deepEqual((await service.search('u1', '')).map((c) => c.lastName), ['Aksoy', 'Demir']);
});

test('softDelete records the deletion time from the clock', async () => {
  const repo = new MemoryCustomerRepository();
  const service = new CustomerService(repo, () => new Date('2026-10-27T10:00:00Z'));
  const { id } = await service.create('u1', input());
  await service.softDelete('u1', id);
  assert.equal((await repo.findById('u1', id))?.deletedAt, '2026-10-27T10:00:00.000Z');
});
