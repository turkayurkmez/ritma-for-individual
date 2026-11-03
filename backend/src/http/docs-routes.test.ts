import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { buildTestDeps, startTestServer } from '../test-support.js';

const specPath = path.resolve(import.meta.dirname, '../../../api-contract/openapi.yaml');

function withDocs(production = false) {
  return startTestServer(buildTestDeps({ production, docs: { specPath } }));
}

test('GET /docs/openapi.yaml serves the OpenAPI contract', async () => {
  const server = withDocs();
  try {
    const res = await fetch(`${server.baseUrl}/docs/openapi.yaml`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /^openapi: 3\.0\.3/);
  } finally {
    server.close();
  }
});

test('GET /docs/ serves an HTML page that loads the contract', async () => {
  const server = withDocs();
  try {
    const res = await fetch(`${server.baseUrl}/docs/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/html/);
    const html = await res.text();
    assert.match(html, /openapi\.yaml/);
    assert.match(html, /swagger-ui-bundle\.js/);
  } finally {
    server.close();
  }
});

test('GET /docs/assets serves the Swagger UI bundle', async () => {
  const server = withDocs();
  try {
    const res = await fetch(`${server.baseUrl}/docs/assets/swagger-ui-bundle.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /javascript/);
  } finally {
    server.close();
  }
});

test('the docs are not exposed in production', async () => {
  const server = withDocs(true);
  try {
    for (const url of ['/docs/', '/docs/openapi.yaml', '/docs/assets/swagger-ui-bundle.js']) {
      const res = await fetch(`${server.baseUrl}${url}`);
      assert.equal(res.status, 404, url);
    }
  } finally {
    server.close();
  }
});

test('the docs are off when no docs option is given', async () => {
  const server = startTestServer();
  try {
    const res = await fetch(`${server.baseUrl}/docs/`);
    assert.equal(res.status, 404);
  } finally {
    server.close();
  }
});
