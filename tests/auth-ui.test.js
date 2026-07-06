import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/css/style.css', import.meta.url), 'utf8');
const config = readFileSync(new URL('../public/js/supabase-config.js', import.meta.url), 'utf8');

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
