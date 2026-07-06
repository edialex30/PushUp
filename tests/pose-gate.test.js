import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePushupPose, LM } from '../public/js/pose-gate.js';

const point = (x, y, visibility = 1) => ({ x, y, visibility });

function emptyMarks() {
  return Array.from({ length: 33 }, () => point(0, 0, 0));
}

function setSide(marks, side, points) {
  const prefix = side.toUpperCase();
  for (const [name, value] of Object.entries(points)) {
    marks[LM[`${prefix}_${name}`]] = value;
  }
}

test('rejects arm-only landmarks so hands or fingers cannot count as pushups', () => {
  const marks = emptyMarks();
  setSide(marks, 'left', {
    SHOULDER: point(0.3, 0.4),
    ELBOW: point(0.4, 0.4),
    WRIST: point(0.5, 0.4),
  });

  const result = evaluatePushupPose(marks);

  assert.equal(result.ready, false);
  assert.equal(result.reason, 'body-not-visible');
});

test('rejects a compact false body that is too small to be a pushup setup', () => {
  const marks = emptyMarks();
  setSide(marks, 'left', {
    SHOULDER: point(0.4, 0.4),
    ELBOW: point(0.42, 0.4),
    WRIST: point(0.44, 0.4),
    HIP: point(0.43, 0.41),
    KNEE: point(0.45, 0.42),
    ANKLE: point(0.47, 0.43),
  });

  const result = evaluatePushupPose(marks);

  assert.equal(result.ready, false);
  assert.equal(result.reason, 'body-too-small');
});

test('accepts a visible side-on pushup body and returns the counting arm', () => {
  const marks = emptyMarks();
  setSide(marks, 'left', {
    SHOULDER: point(0.2, 0.45),
    ELBOW: point(0.27, 0.55),
    WRIST: point(0.35, 0.65),
    HIP: point(0.52, 0.47),
    KNEE: point(0.75, 0.5),
    ANKLE: point(0.9, 0.52),
  });

  const result = evaluatePushupPose(marks);

  assert.equal(result.ready, true);
  assert.deepEqual(Object.keys(result.arm), ['shoulder', 'elbow', 'wrist']);
});

test('chooses the more visible side', () => {
  const marks = emptyMarks();
  setSide(marks, 'left', {
    SHOULDER: point(0.2, 0.45, 0.4),
    ELBOW: point(0.27, 0.55, 0.4),
    WRIST: point(0.35, 0.65, 0.4),
    HIP: point(0.52, 0.47, 0.4),
    KNEE: point(0.75, 0.5, 0.4),
    ANKLE: point(0.9, 0.52, 0.4),
  });
  setSide(marks, 'right', {
    SHOULDER: point(0.22, 0.45),
    ELBOW: point(0.29, 0.55),
    WRIST: point(0.37, 0.65),
    HIP: point(0.54, 0.47),
    KNEE: point(0.77, 0.5),
    ANKLE: point(0.92, 0.52),
  });

  const result = evaluatePushupPose(marks);

  assert.equal(result.ready, true);
  assert.equal(result.side, 'right');
});
