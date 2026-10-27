import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from './config.js';

test('defaults to port 3000 with demo accounts on outside production', () => {
  assert.deepEqual(loadConfig({}), { port: 3000, production: false, demoAccountsEnabled: true });
});

test('demo accounts are off in production unless explicitly enabled', () => {
  assert.equal(loadConfig({ NODE_ENV: 'production' }).demoAccountsEnabled, false);
  assert.equal(loadConfig({ NODE_ENV: 'production', DEMO_ACCOUNTS_ENABLED: 'true' }).demoAccountsEnabled, true);
});

test('demo accounts can be switched off outside production', () => {
  assert.equal(loadConfig({ DEMO_ACCOUNTS_ENABLED: 'false' }).demoAccountsEnabled, false);
});

test('PORT overrides the default', () => {
  assert.equal(loadConfig({ PORT: '8080' }).port, 8080);
});
