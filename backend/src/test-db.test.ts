import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directDatabaseUrl } from './test-db.js';

test('a Neon pooled address is turned into the direct one', () => {
  assert.equal(
    directDatabaseUrl('postgresql://u:p@ep-cool-123-pooler.eu-central-1.aws.neon.tech/db?sslmode=verify-full'),
    'postgresql://u:p@ep-cool-123.eu-central-1.aws.neon.tech/db?sslmode=verify-full',
  );
});

test('an address that is already direct is left alone', () => {
  const url = 'postgresql://u:p@ep-cool-123.eu-central-1.aws.neon.tech/db';
  assert.equal(directDatabaseUrl(url), url);
});
