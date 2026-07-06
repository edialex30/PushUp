import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStorage } from '../src/storage.js';

function tmpFile() {
  const dir = mkdtempSync(join(tmpdir(), 'pushup-'));
  return join(dir, 'history.json');
}

test('read() returns default when file missing', () => {
  const store = createStorage(tmpFile());
  assert.deepEqual(store.read(), { goal: 100, days: [] });
});

test('addReps creates today entry and accumulates', () => {
  const store = createStorage(tmpFile());
  store.addReps('2026-07-06', 5);
  const state = store.addReps('2026-07-06', 3);
  assert.equal(state.today.reps, 8);
  assert.equal(state.today.remaining, 92);
  assert.equal(state.today.goal, 100);
});

test('addReps freezes goal per day', () => {
  const store = createStorage(tmpFile());
  store.addReps('2026-07-06', 10);
  store.setGoal(50);
  store.addReps('2026-07-07', 4);
  const data = store.read();
  const d6 = data.days.find(d => d.date === '2026-07-06');
  const d7 = data.days.find(d => d.date === '2026-07-07');
  assert.equal(d6.goal, 100);
  assert.equal(d7.goal, 50);
});

test('getState reports remaining not below zero when over goal', () => {
  const store = createStorage(tmpFile());
  store.setGoal(10);
  const state = store.addReps('2026-07-06', 12);
  assert.equal(state.today.reps, 12);
  assert.equal(state.today.remaining, 0);
});

test('persists to disk atomically (data survives new instance)', () => {
  const file = tmpFile();
  const a = createStorage(file);
  a.addReps('2026-07-06', 7);
  const b = createStorage(file);
  assert.equal(b.getState('2026-07-06').today.reps, 7);
});

test('recovers default on corrupt file', () => {
  const file = tmpFile();
  writeFileSync(file, '{ not valid json');
  const store = createStorage(file);
  assert.deepEqual(store.read(), { goal: 100, days: [] });
});
