import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultData,
  normalizeData,
  stateFromData,
  startSessionInData,
  finishSessionInData,
  addRepsToData,
  setTodayRepsInData,
  setGoalInData,
  setCameraModeInData,
  setCalibrationInData,
} from '../public/js/state-core.js';

const today = '2026-07-06';
const now = () => new Date(2026, 6, 6, 12, 34);

test('defaultData returns versioned app state', () => {
  assert.deepEqual(defaultData(), {
    version: 3,
    goal: 100,
    cameraMode: 'user',
    calibrations: { user: null, environment: null },
    days: [],
  });
});

test('normalizeData migrates legacy calibration and sessions safely', () => {
  const normalized = normalizeData({
    goal: 80,
    cameraMode: 'environment',
    calibration: { up: { leftAngle: 170 }, down: { leftAngle: 90 } },
    days: [{ date: today, reps: 10, goal: 80 }],
  });

  assert.equal(normalized.goal, 80);
  assert.equal(normalized.cameraMode, 'user');
  assert.deepEqual(normalized.calibrations.user, {
    up: { leftAngle: 170 },
    down: { leftAngle: 90 },
  });
  assert.deepEqual(normalized.days[0], {
    date: today,
    reps: 10,
    goal: 80,
    sessions: [],
  });
});

test('stateFromData computes today remaining and hourly rows', () => {
  const data = normalizeData({
    version: 3,
    goal: 100,
    cameraMode: 'user',
    calibrations: { user: null, environment: null },
    days: [{
      date: today,
      reps: 7,
      goal: 100,
      sessions: [
        { id: 'a', startedAt: '2026-07-06T09:10:00.000Z', endedAt: null, hour: '09:00', reps: 3 },
        { id: 'b', startedAt: '2026-07-06T09:20:00.000Z', endedAt: null, hour: '09:00', reps: 4 },
      ],
    }],
  });

  const state = stateFromData(data, today);
  assert.equal(state.today.remaining, 93);
  assert.deepEqual(state.today.hourly, [{ hour: '09:00', reps: 7 }]);
});

test('mutations preserve current local-store behavior', () => {
  let data = defaultData();
  const started = startSessionInData(data, { today, now });
  data = started.data;
  data = addRepsToData(data, 5, { today, now, sessionId: started.sessionId });
  data = finishSessionInData(data, started.sessionId, { today, now });
  data = setGoalInData(data, 50, { today });
  data = setTodayRepsInData(data, 12, { today });
  data = setCameraModeInData(data, 'environment');
  data = setCalibrationInData(data, { up: { leftAngle: 160 }, down: { leftAngle: 80 } });

  const state = stateFromData(data, today);
  assert.equal(state.goal, 50);
  assert.equal(state.cameraMode, 'environment');
  assert.equal(state.today.reps, 12);
  assert.equal(state.today.goal, 50);
  assert.equal(state.today.remaining, 38);
  assert.deepEqual(state.calibration, { up: { leftAngle: 160 }, down: { leftAngle: 80 } });
  assert.equal(state.today.sessions[0].reps, 5);
  assert.equal(typeof state.today.sessions[0].endedAt, 'string');
});
