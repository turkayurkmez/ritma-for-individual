import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DemoIdentityProvider } from './demo-identity-provider.js';

test('authenticate returns the user for the right email and password', async () => {
  const provider = new DemoIdentityProvider();
  const user = await provider.authenticate({ email: 'ayse@ritma.demo', password: 'demo-ayse-123' });
  assert.equal(user?.displayName, 'Ayşe Demir');
  assert.equal(user?.id, 'demo-user-ayse');
  const other = await provider.authenticate({ email: 'mehmet@ritma.demo', password: 'demo-mehmet-123' });
  assert.equal(other?.id, 'demo-user-mehmet');
});

test('authenticate rejects a wrong password and an unknown email the same way', async () => {
  const provider = new DemoIdentityProvider();
  assert.equal(await provider.authenticate({ email: 'ayse@ritma.demo', password: 'yanlis' }), undefined);
  assert.equal(await provider.authenticate({ email: 'yok@ritma.demo', password: 'demo-ayse-123' }), undefined);
});

test('authenticate does not mix up one user\'s password with another', async () => {
  const provider = new DemoIdentityProvider();
  assert.equal(await provider.authenticate({ email: 'ayse@ritma.demo', password: 'demo-mehmet-123' }), undefined);
});

test('findUser returns the user by id', async () => {
  const provider = new DemoIdentityProvider();
  assert.equal((await provider.findUser('demo-user-mehmet'))?.email, 'mehmet@ritma.demo');
  assert.equal(await provider.findUser('nope'), undefined);
});

test('plain passwords are not kept in the provider', () => {
  const dump = JSON.stringify(new DemoIdentityProvider());
  assert.ok(!dump.includes('demo-ayse-123'));
  assert.ok(!dump.includes('demo-mehmet-123'));
});
