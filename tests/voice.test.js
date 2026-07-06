import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countText } from '../public/js/voice.js';

test('countText returns English words for common rep counts', () => {
  assert.equal(countText(1), 'one');
  assert.equal(countText(5), 'five');
  assert.equal(countText(12), 'twelve');
  assert.equal(countText(21), 'twenty one');
  assert.equal(countText(100), 'one hundred');
});
