import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from './config.js';

test('defaults to port 3000 with demo accounts on outside production', () => {
  assert.deepEqual(loadConfig({}), { port: 3000, production: false, demoAccountsEnabled: true, databaseUrl: undefined });
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

test('DATABASE_URL is read when set and empty counts as unset', () => {
  assert.equal(loadConfig({ DATABASE_URL: 'postgres://u:p@host/db' }).databaseUrl, 'postgres://u:p@host/db');
  assert.equal(loadConfig({ DATABASE_URL: '' }).databaseUrl, undefined);
});
