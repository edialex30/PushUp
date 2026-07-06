import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pagesWorkflow = readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');

test('GitHub Pages workflow runs tests before deployment', () => {
  assert.match(pagesWorkflow, /npm ci/);
  assert.match(pagesWorkflow, /npm test/);
  assert.ok(
    pagesWorkflow.indexOf('npm test') < pagesWorkflow.indexOf('actions/upload-pages-artifact'),
    'tests must run before the Pages artifact is uploaded'
  );
});
