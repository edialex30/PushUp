import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDateString } from '../src/day.js';

test('formats a date as YYYY-MM-DD in local time', () => {
  const d = new Date(2026, 6, 6, 23, 30); // 6 July 2026 local
  assert.equal(localDateString(d), '2026-07-06');
});

test('pads single-digit month and day', () => {
  const d = new Date(2026, 0, 5, 1, 0); // 5 Jan 2026
  assert.equal(localDateString(d), '2026-01-05');
});

test('uses current date when no argument given', () => {
  const s = localDateString();
  assert.match(s, /^\d{4}-\d{2}-\d{2}$/);
});
