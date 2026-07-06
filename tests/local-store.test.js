import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalStore } from '../public/js/local-store.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

test('returns default state when storage is empty', () => {
  const store = createLocalStore({
    storage: memoryStorage(),
    today: () => '2026-07-06',
  });

  assert.deepEqual(store.getState(), {
    goal: 100,
    cameraMode: 'user',
    calibration: null,
    today: { date: '2026-07-06', reps: 0, goal: 100, remaining: 100 },
    days: [],
  });
});

test('addReps creates today entry and accumulates', () => {
  const store = createLocalStore({
    storage: memoryStorage(),
    today: () => '2026-07-06',
  });

  store.addReps(4);
  const state = store.addReps(3);

  assert.equal(state.today.reps, 7);
  assert.equal(state.today.remaining, 93);
  assert.equal(state.days.length, 1);
});

test('setTodayReps corrects detected reps and clamps remaining at zero', () => {
  const store = createLocalStore({
    storage: memoryStorage(),
    today: () => '2026-07-06',
  });

  const state = store.setTodayReps(125);

  assert.equal(state.today.reps, 125);
  assert.equal(state.today.remaining, 0);
});

test('setGoal updates root goal and new day uses updated goal', () => {
  let date = '2026-07-06';
  const store = createLocalStore({
    storage: memoryStorage(),
    today: () => date,
  });

  store.addReps(5);
  store.setGoal(60);
  date = '2026-07-07';
  const state = store.addReps(1);

  assert.equal(state.goal, 60);
  assert.equal(state.today.goal, 60);
  assert.equal(state.days.find(day => day.date === '2026-07-06').goal, 100);
});

test('setCameraMode persists front or back camera preference', () => {
  const storage = memoryStorage();
  const store = createLocalStore({
    storage,
    today: () => '2026-07-06',
  });

  store.setCameraMode('user');
  const next = createLocalStore({
    storage,
    today: () => '2026-07-06',
  });

  assert.equal(next.getState().cameraMode, 'user');
});

test('old storage without schema version migrates to front camera by default', () => {
  const storage = memoryStorage({
    'pushup-counter-state-v1': JSON.stringify({
      goal: 100,
      cameraMode: 'environment',
      days: [],
    }),
  });
  const store = createLocalStore({
    storage,
    today: () => '2026-07-06',
  });

  assert.equal(store.getState().cameraMode, 'user');
});

test('setCalibration persists up and down snapshots', () => {
  const storage = memoryStorage();
  const store = createLocalStore({
    storage,
    today: () => '2026-07-06',
  });
  const calibration = {
    up: { leftAngle: 160, rightAngle: 158, wristY: 0.7, shoulderY: 0.35 },
    down: { leftAngle: 90, rightAngle: 92, wristY: 0.72, shoulderY: 0.48 },
  };

  store.setCalibration(calibration);
  const next = createLocalStore({
    storage,
    today: () => '2026-07-06',
  });

  assert.deepEqual(next.getState().calibration, calibration);
});
