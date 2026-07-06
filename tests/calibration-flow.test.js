import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAutoCalibration } from '../public/js/calibration-flow.js';

function createHarness({ features = [], active = () => true } = {}) {
  const statuses = [];
  const spoken = [];
  const counts = [];
  const waits = [];
  let saved = null;

  return {
    calls: { statuses, spoken, counts, waits, get saved() { return saved; } },
    options: {
      getFeatures() {
        return features.shift() ?? null;
      },
      isActive: active,
      saveCalibration(calibration) {
        saved = calibration;
      },
      setStatus(message) {
        statuses.push(message);
      },
      say(message) {
        spoken.push(message);
      },
      count(value) {
        counts.push(value);
      },
      async wait(ms) {
        waits.push(ms);
      },
    },
  };
}

test('auto calibration captures up and down positions after countdowns', async () => {
  const up = { leftAngle: 160, rightAngle: 162, shoulderY: 0.35, wristY: 0.7 };
  const down = { leftAngle: 95, rightAngle: 98, shoulderY: 0.48, wristY: 0.72 };
  const harness = createHarness({ features: [up, down] });

  const result = await runAutoCalibration(harness.options);

  assert.deepEqual(result, { ok: true, calibration: { up, down } });
  assert.deepEqual(harness.calls.saved, { up, down });
  assert.deepEqual(harness.calls.spoken, [
    'Get ready',
    'Hold up position',
    'Up saved',
    'Hold down position',
    'Down saved',
    'Calibration done',
  ]);
  assert.deepEqual(harness.calls.counts, [5, 4, 3, 2, 1, 3, 2, 1, 3, 2, 1]);
  assert.equal(harness.calls.waits.length, 13);
  assert.equal(harness.calls.statuses.at(-1), 'Calibrare terminata. Poti incepe.');
});

test('auto calibration stops without saving when up position is missing', async () => {
  const harness = createHarness({ features: [null] });

  const result = await runAutoCalibration(harness.options);

  assert.deepEqual(result, { ok: false, reason: 'missing-up' });
  assert.equal(harness.calls.saved, null);
  assert.equal(harness.calls.statuses.at(-1), 'Nu vad clar pozitia Sus. Reincearca.');
  assert.equal(harness.calls.spoken.at(-1), 'Try again');
});

test('auto calibration can be cancelled before saving', async () => {
  let activeChecks = 0;
  const harness = createHarness({
    features: [{ leftAngle: 160, rightAngle: 160, shoulderY: 0.35, wristY: 0.7 }],
    active: () => {
      activeChecks += 1;
      return activeChecks < 3;
    },
  });

  const result = await runAutoCalibration(harness.options);

  assert.deepEqual(result, { ok: false, reason: 'cancelled' });
  assert.equal(harness.calls.saved, null);
});
