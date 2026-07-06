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
    today: { date: '2026-07-06', reps: 0, goal: 100, sessions: [], hourly: [], remaining: 100 },
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
  assert.equal(state.days.find(day => day.date === '2026-07-06').goal, 60);
});

test('setGoal updates existing today entry so the phone screen reflects the new target', () => {
  const store = createLocalStore({
    storage: memoryStorage(),
    today: () => '2026-07-06',
  });

  store.addReps(10);
  const state = store.setGoal(60);

  assert.equal(state.goal, 60);
  assert.equal(state.today.goal, 60);
  assert.equal(state.today.reps, 10);
  assert.equal(state.today.remaining, 50);
});

test('workout sessions accumulate reps by hour without resetting the daily total', () => {
  let now = new Date('2026-07-06T08:15:00');
  const store = createLocalStore({
    storage: memoryStorage(),
    today: () => '2026-07-06',
    now: () => now,
  });

  const first = store.startSession();
  store.addReps(10, { sessionId: first.sessionId });
  store.finishSession(first.sessionId);

  now = new Date('2026-07-06T18:20:00');
  const second = store.startSession();
  const state = store.addReps(5, { sessionId: second.sessionId });

  assert.equal(state.today.reps, 15);
  assert.deepEqual(state.today.hourly.map(hour => [hour.hour, hour.reps]), [
    ['08:00', 10],
    ['18:00', 5],
  ]);
  assert.deepEqual(state.today.sessions.map(session => session.reps), [10, 5]);
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

test('calibration is scoped to the selected camera', () => {
  const storage = memoryStorage();
  const store = createLocalStore({
    storage,
    today: () => '2026-07-06',
  });
  const frontCalibration = {
    up: { leftAngle: 160, rightAngle: 158, wristY: 0.7, shoulderY: 0.35 },
    down: { leftAngle: 90, rightAngle: 92, wristY: 0.72, shoulderY: 0.48 },
  };

  store.setCalibration(frontCalibration);
  const backState = store.setCameraMode('environment');

  assert.equal(backState.cameraMode, 'environment');
  assert.equal(backState.calibration, null);

  const frontState = store.setCameraMode('user');
  assert.deepEqual(frontState.calibration, frontCalibration);
});
