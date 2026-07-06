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

test('workout counting writes reps into an active session and displays the daily total', () => {
  assert.match(appJs, /activeSessionId/);
  assert.match(appJs, /store\.startSession\(\)/);
  assert.match(appJs, /store\.addReps\(1,\s*\{\s*sessionId:\s*activeSessionId\s*\}\)/);
  assert.match(appJs, /\$\('rep-count'\)\.textContent\s*=\s*state\.today\.reps/);
});

test('stats screen exposes hourly workout breakdown', () => {
  assert.match(indexHtml, /id="hourly-list"/);
  assert.match(appJs, /hourlyStatsForDay/);
});

test('app uses pose readiness to reject bodies that are too small in frame', () => {
  assert.match(appJs, /evaluatePushupPose/);
  assert.match(appJs, /body-too-small/);
});

test('today screen shows current date and time instead of static Azi eyebrow', () => {
  assert.match(indexHtml, /id="today-datetime"/);
  assert.doesNotMatch(indexHtml, /<p class="eyebrow">Azi<\/p>/);
  assert.match(appJs, /formatCurrentDateTime/);
  assert.match(appJs, /setInterval\(renderClock,\s*60000\)/);
});

test('index uses a fresh app script version for hourly stats release', () => {
  assert.match(indexHtml, /app\.js\?v=hourly-stats-1/);
});
