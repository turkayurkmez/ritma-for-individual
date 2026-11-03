import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildTestDeps, startTestServer } from '../test-support.js';

const INDEX = '<!doctype html><title>Ritma</title>';

function withStaticDir() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'ritma-spa-'));
  writeFileSync(path.join(dir, 'index.html'), INDEX);
  return startTestServer(buildTestDeps({ staticDir: dir }));
}

test('serves index.html for a client-side route', async () => {
  const server = withStaticDir();
  try {
    const res = await fetch(`${server.baseUrl}/panel/hafta`);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), INDEX);
  } finally {
    server.close();
  }
});

test('keeps the JSON 404 for unknown api paths', async () => {
  const server = withStaticDir();
  try {
    const res = await fetch(`${server.baseUrl}/api/v1/yok`);
    assert.equal(res.status, 404);
    const body = (await res.json()) as { error: { code: string } };
    assert.equal(body.error.code, 'not_found');
  } finally {
    server.close();
  }
});

test('does not fall back for missing files', async () => {
  const server = withStaticDir();
  try {
    const res = await fetch(`${server.baseUrl}/assets/yok.js`);
    assert.equal(res.status, 404);
  } finally {
    server.close();
  }
});

test('does not serve the app under /docs when docs are off', async () => {
  const server = withStaticDir();
  try {
    const res = await fetch(`${server.baseUrl}/docs/`);
    assert.equal(res.status, 404);
  } finally {
    server.close();
  }
});

test('does not fall back for non-GET requests', async () => {
  const server = withStaticDir();
  try {
    const res = await fetch(`${server.baseUrl}/panel`, { method: 'POST' });
    assert.equal(res.status, 404);
  } finally {
    server.close();
  }
});
