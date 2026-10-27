import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const contract = readFileSync(path.resolve(import.meta.dirname, '../../api-contract/openapi.yaml'), 'utf8');

function documentedOperations(): string[] {
  const operations: string[] = [];
  let current = '';
  for (const line of contract.split(/\r?\n/)) {
    const route = /^ {2}(\/[^\s:]+):\s*$/.exec(line);
    if (route) current = route[1]!;
    const method = /^ {4}(get|post|patch|delete):\s*$/.exec(line);
    if (method && current) operations.push(`${method[1]!.toUpperCase()} ${current}`);
  }
  return operations.sort();
}

test('the OpenAPI contract documents exactly the routes the server exposes', () => {
  assert.deepEqual(documentedOperations(), [
    'DELETE /api/v1/appointments/{id}',
    'DELETE /api/v1/customers/{id}',
    'GET /api/v1/appointments',
    'GET /api/v1/appointments/{id}',
    'GET /api/v1/auth/me',
    'GET /api/v1/customers',
    'GET /api/v1/customers/{id}',
    'GET /api/v1/health',
    'PATCH /api/v1/appointments/{id}',
    'PATCH /api/v1/customers/{id}',
    'POST /api/v1/appointments',
    'POST /api/v1/auth/login',
    'POST /api/v1/auth/logout',
    'POST /api/v1/customers',
  ]);
});

test('the contract uses the internal ASCII codes for status and gender', () => {
  for (const code of ['scheduled', 'completed', 'cancelled', 'female', 'male', 'other', 'undisclosed']) {
    assert.match(contract, new RegExp(`- ${code}\\b`), code);
  }
  assert.match(contract, /bearerAuth/);
});
