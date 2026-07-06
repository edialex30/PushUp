import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCalibratedCounter, extractFrontFeatures } from '../public/js/calibrated-counter.js';
import { LM } from '../public/js/pose-gate.js';

const p = (x, y, visibility = 1) => ({ x, y, visibility });

function marksFor({ leftAngle, rightAngle, shoulderY = 0.35, wristY = 0.7 }) {
  const marks = Array.from({ length: 33 }, () => p(0, 0, 0));
  marks[LM.LEFT_SHOULDER] = p(0.25, shoulderY);
  marks[LM.LEFT_ELBOW] = p(0.12, (shoulderY + wristY) / 2);
  marks[LM.LEFT_WRIST] = p(0.24 + leftAngle / 1000, wristY);
  marks[LM.RIGHT_SHOULDER] = p(0.75, shoulderY);
  marks[LM.RIGHT_ELBOW] = p(0.88, (shoulderY + wristY) / 2);
  marks[LM.RIGHT_WRIST] = p(0.76 - rightAngle / 1000, wristY);
  return marks;
}

test('extractFrontFeatures returns null when arms are not visible', () => {
  assert.equal(extractFrontFeatures([]), null);
});

test('does not count without complete calibration', () => {
  const counter = createCalibratedCounter({ calibration: null });
  const result = counter.update(extractFrontFeatures(marksFor({ leftAngle: 160, rightAngle: 160 })));
  assert.equal(result.counted, false);
  assert.equal(result.state, 'needs-calibration');
});

test('counts one calibrated up down up transition', () => {
  const calibration = {
    up: { leftAngle: 160, rightAngle: 160, shoulderY: 0.35, wristY: 0.7 },
    down: { leftAngle: 95, rightAngle: 95, shoulderY: 0.48, wristY: 0.72 },
  };
  const counter = createCalibratedCounter({ calibration });

  counter.update({ leftAngle: 158, rightAngle: 158, shoulderY: 0.35, wristY: 0.7 });
  counter.update({ leftAngle: 100, rightAngle: 100, shoulderY: 0.47, wristY: 0.72 });
  const result = counter.update({ leftAngle: 162, rightAngle: 162, shoulderY: 0.35, wristY: 0.7 });

  assert.equal(result.counted, true);
  assert.equal(result.total, 1);
});

test('ignores small motion that never reaches calibrated down state', () => {
  const calibration = {
    up: { leftAngle: 160, rightAngle: 160, shoulderY: 0.35, wristY: 0.7 },
    down: { leftAngle: 95, rightAngle: 95, shoulderY: 0.48, wristY: 0.72 },
  };
  const counter = createCalibratedCounter({ calibration });

  counter.update({ leftAngle: 158, rightAngle: 158, shoulderY: 0.35, wristY: 0.7 });
  counter.update({ leftAngle: 140, rightAngle: 140, shoulderY: 0.38, wristY: 0.71 });
  const result = counter.update({ leftAngle: 162, rightAngle: 162, shoulderY: 0.35, wristY: 0.7 });

  assert.equal(result.counted, false);
  assert.equal(result.total, 0);
});
