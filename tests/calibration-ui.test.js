import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const appJs = readFileSync(new URL('../public/js/app.js', import.meta.url), 'utf8');

test('workout screen exposes one automatic calibration button', () => {
  assert.match(indexHtml, /id="btn-auto-calibrate"/);
  assert.match(indexHtml, />Calibreaza automat</);
  assert.doesNotMatch(indexHtml, /id="btn-calibrate-up"/);
  assert.doesNotMatch(indexHtml, /id="btn-calibrate-down"/);
});

test('app wires the automatic calibration flow', () => {
  assert.match(appJs, /runAutoCalibration/);
  assert.match(appJs, /autoCalibrating/);
});
