import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { createStorage } from '../src/storage.js';
import { createApiRouter } from '../src/api.js';

function makeApp() {
  const file = join(mkdtempSync(join(tmpdir(), 'pushup-')), 'history.json');
  const store = createStorage(file);
  const now = () => new Date(2026, 6, 6, 12, 0);
  const app = express();
  app.use(express.json());
  app.use('/api', createApiRouter({ store, now }));
  return app;
}

async function call(app, method, path, body) {
  const server = app.listen(0);
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  server.close();
  return { status: res.status, json };
}

test('GET /api/state returns default state', async () => {
  const app = makeApp();
  const { status, json } = await call(app, 'GET', '/api/state');
  assert.equal(status, 200);
  assert.equal(json.goal, 100);
  assert.equal(json.today.reps, 0);
  assert.equal(json.today.date, '2026-07-06');
});

test('POST /api/reps adds reps', async () => {
  const app = makeApp();
  const { status, json } = await call(app, 'POST', '/api/reps', { count: 3 });
  assert.equal(status, 200);
  assert.equal(json.today.reps, 3);
  assert.equal(json.today.remaining, 97);
});

test('POST /api/reps rejects invalid count', async () => {
  const app = makeApp();
  const { status, json } = await call(app, 'POST', '/api/reps', { count: 0 });
  assert.equal(status, 400);
  assert.ok(json.error);
});

test('PUT /api/goal changes goal', async () => {
  const app = makeApp();
  const { status, json } = await call(app, 'PUT', '/api/goal', { goal: 50 });
  assert.equal(status, 200);
  assert.equal(json.goal, 50);
});

test('PUT /api/goal rejects invalid goal', async () => {
  const app = makeApp();
  const { status } = await call(app, 'PUT', '/api/goal', { goal: -5 });
  assert.equal(status, 400);
});
