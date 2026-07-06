import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appJs = readFileSync(new URL('../public/js/app.js', import.meta.url), 'utf8');

test('startup does not statically import camera pose tracker', () => {
  assert.doesNotMatch(
    appJs,
    /import\s+\{\s*createPoseTracker\s*\}\s+from\s+['"]\.\/pose\.js['"]/,
    'MediaPipe pose tracker must be loaded lazily so base navigation survives tracker load failures'
  );
});
