import { test } from 'node:test';
import assert from 'node:assert/strict';
import { userRepositoryContract } from '../contract/user-repository.contract.js';
import { MemoryUserRepository } from './user-repository.js';

userRepositoryContract('memory', async () => ({ repo: new MemoryUserRepository() }));

test('seed users can be found by id and block their email', async () => {
  const repo = new MemoryUserRepository([{ id: 'demo-user-ayse', email: 'ayse@ritma.demo', displayName: 'Ayşe Demir' }]);
  assert.equal((await repo.findById('demo-user-ayse'))?.email, 'ayse@ritma.demo');
  assert.equal(
    await repo.findOrCreateByGoogle({ googleSub: 'x', email: 'AYSE@ritma.demo', displayName: 'Başkası' }),
    undefined,
  );
});
