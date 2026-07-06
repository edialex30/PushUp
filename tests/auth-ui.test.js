import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/css/style.css', import.meta.url), 'utf8');
const config = readFileSync(new URL('../public/js/supabase-config.js', import.meta.url), 'utf8');
const appJs = readFileSync(new URL('../public/js/app.js', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

test('index loads Supabase before app module', () => {
  const supabaseIndex = indexHtml.indexOf('supabase-js');
  const appIndex = indexHtml.indexOf('./js/app.js');
  assert.ok(supabaseIndex > -1, 'Supabase script must be present');
  assert.ok(supabaseIndex < appIndex, 'Supabase script must load before app.js');
});

test('index exposes auth and sync UI hooks', () => {
  assert.match(indexHtml, /id="auth-screen"/);
  assert.match(indexHtml, /id="auth-form"/);
  assert.match(indexHtml, /id="auth-email"/);
  assert.match(indexHtml, /id="auth-password"/);
  assert.match(indexHtml, /id="btn-sign-out"/);
  assert.match(indexHtml, /id="sync-status"/);
});

test('auth styles exist', () => {
  assert.match(css, /\.auth-screen/);
  assert.match(css, /\.account-bar/);
  assert.match(css, /\.sync-status/);
});

test('Supabase config uses the approved project URL', () => {
  assert.match(config, /https:\/\/pkpqafyfwpoykniusghx\.supabase\.co/);
  assert.match(config, /SUPABASE_ANON_KEY/);
});

test('app initializes Supabase auth before rendering store state', () => {
  assert.match(appJs, /createClient\(SUPABASE_URL,\s*SUPABASE_ANON_KEY/);
  assert.match(appJs, /createCloudStore/);
  assert.match(appJs, /initApp/);
});

test('app awaits cloud store mutations', () => {
  assert.match(appJs, /state\s*=\s*await\s+store\.setGoal/);
  assert.match(appJs, /state\s*=\s*await\s+store\.setTodayReps/);
  assert.match(appJs, /state\s*=\s*await\s+store\.addReps/);
  assert.match(appJs, /state\s*=\s*await\s+store\.finishSession/);
});

test('README documents Supabase cloud history setup', () => {
  assert.match(readme, /Supabase/);
  assert.match(readme, /pushup_states/);
  assert.match(readme, /GitHub Pages/);
});
