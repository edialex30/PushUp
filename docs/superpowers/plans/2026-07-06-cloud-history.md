# Cloud History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase login and cloud-backed persistent workout history so the GitHub Pages app can be used from a phone anywhere without the laptop running.

**Architecture:** Keep GitHub Pages as static hosting. Add Supabase Auth for user identity and a `pushup_states` table with one JSON state row per authenticated user. Refactor the existing local state code into pure helpers, then build a cloud store with local cache fallback that exposes the same methods `app.js` already uses.

**Tech Stack:** Vanilla JavaScript ES modules, Supabase JS CDN bundle, Supabase Auth, Supabase Postgres with Row Level Security, Node test runner.

---

## File Structure

- Modify `public/index.html`: add login/account UI containers and load the Supabase browser bundle before `app.js`.
- Modify `public/css/style.css`: style auth, loading, and sync status surfaces using the existing dark UI language.
- Create `public/js/state-core.js`: pure normalization and mutation helpers extracted from `local-store.js`.
- Modify `public/js/local-store.js`: wrap `state-core.js` while preserving the current public API.
- Create `public/js/supabase-config.js`: export the public Supabase URL and anon key.
- Create `public/js/cloud-store.js`: authenticated Supabase store with local cache fallback and sync status.
- Modify `public/js/app.js`: initialize auth/cloud store before rendering, wire login/sign-out UI, and use async store calls.
- Create `tests/state-core.test.js`: prove extracted state helpers preserve current behavior.
- Create `tests/cloud-store.test.js`: test cloud load, migration, upsert, and failed-write fallback with fake Supabase/storage.
- Create `tests/auth-ui.test.js`: static tests for required auth UI and Supabase script loading.
- Modify `README.md`: update user setup and Supabase SQL instructions.

## Supabase SQL

Run this SQL in the Supabase SQL editor before testing the deployed app:

```sql
create table if not exists public.pushup_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.pushup_states enable row level security;

drop policy if exists "Users can read their own pushup state" on public.pushup_states;
drop policy if exists "Users can insert their own pushup state" on public.pushup_states;
drop policy if exists "Users can update their own pushup state" on public.pushup_states;

create policy "Users can read their own pushup state"
on public.pushup_states
for select
using (auth.uid() = user_id);

create policy "Users can insert their own pushup state"
on public.pushup_states
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own pushup state"
on public.pushup_states
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## Task 1: Extract Pure State Core

**Files:**
- Create: `public/js/state-core.js`
- Create: `tests/state-core.test.js`
- Modify: `public/js/local-store.js`

- [ ] **Step 1: Write failing extraction tests**

Create `tests/state-core.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultData,
  normalizeData,
  stateFromData,
  startSessionInData,
  finishSessionInData,
  addRepsToData,
  setTodayRepsInData,
  setGoalInData,
  setCameraModeInData,
  setCalibrationInData,
} from '../public/js/state-core.js';

const today = '2026-07-06';
const now = () => new Date(2026, 6, 6, 12, 34);

test('defaultData returns versioned app state', () => {
  assert.deepEqual(defaultData(), {
    version: 3,
    goal: 100,
    cameraMode: 'user',
    calibrations: { user: null, environment: null },
    days: [],
  });
});

test('normalizeData migrates legacy calibration and sessions safely', () => {
  const normalized = normalizeData({
    goal: 80,
    cameraMode: 'environment',
    calibration: { up: { leftAngle: 170 }, down: { leftAngle: 90 } },
    days: [{ date: today, reps: 10, goal: 80 }],
  });

  assert.equal(normalized.goal, 80);
  assert.equal(normalized.cameraMode, 'user');
  assert.deepEqual(normalized.calibrations.user, {
    up: { leftAngle: 170 },
    down: { leftAngle: 90 },
  });
  assert.deepEqual(normalized.days[0], {
    date: today,
    reps: 10,
    goal: 80,
    sessions: [],
  });
});

test('stateFromData computes today remaining and hourly rows', () => {
  const data = normalizeData({
    version: 3,
    goal: 100,
    cameraMode: 'user',
    calibrations: { user: null, environment: null },
    days: [{
      date: today,
      reps: 7,
      goal: 100,
      sessions: [
        { id: 'a', startedAt: '2026-07-06T09:10:00.000Z', endedAt: null, hour: '09:00', reps: 3 },
        { id: 'b', startedAt: '2026-07-06T09:20:00.000Z', endedAt: null, hour: '09:00', reps: 4 },
      ],
    }],
  });

  const state = stateFromData(data, today);
  assert.equal(state.today.remaining, 93);
  assert.deepEqual(state.today.hourly, [{ hour: '09:00', reps: 7 }]);
});

test('mutations preserve current local-store behavior', () => {
  let data = defaultData();
  const started = startSessionInData(data, { today, now });
  data = started.data;
  data = addRepsToData(data, 5, { today, now, sessionId: started.sessionId });
  data = finishSessionInData(data, started.sessionId, { today, now });
  data = setGoalInData(data, 50, { today });
  data = setTodayRepsInData(data, 12, { today });
  data = setCameraModeInData(data, 'environment');
  data = setCalibrationInData(data, { up: { leftAngle: 160 }, down: { leftAngle: 80 } });

  const state = stateFromData(data, today);
  assert.equal(state.goal, 50);
  assert.equal(state.cameraMode, 'environment');
  assert.equal(state.today.reps, 12);
  assert.equal(state.today.goal, 50);
  assert.equal(state.today.remaining, 38);
  assert.deepEqual(state.calibration, { up: { leftAngle: 160 }, down: { leftAngle: 80 } });
  assert.equal(state.today.sessions[0].reps, 5);
  assert.equal(typeof state.today.sessions[0].endedAt, 'string');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/state-core.test.js`

Expected: FAIL with module not found for `../public/js/state-core.js`.

- [ ] **Step 3: Create `state-core.js`**

Create `public/js/state-core.js` with the pure logic currently embedded in `local-store.js`:

```js
export const STORAGE_KEY = 'pushup-counter-state-v1';

export function defaultData() {
  return {
    version: 3,
    goal: 100,
    cameraMode: 'user',
    calibrations: { user: null, environment: null },
    days: [],
  };
}

export function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function localTimeString(date = new Date()) {
  const dt = toDate(date);
  const h = String(dt.getHours()).padStart(2, '0');
  const m = String(dt.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function localHourString(date = new Date()) {
  const dt = toDate(date);
  const h = String(dt.getHours()).padStart(2, '0');
  return `${h}:00`;
}

function sessionIdFrom(date, index) {
  const dt = toDate(date);
  return `${localDateString(dt)}-${localTimeString(dt).replace(':', '')}-${index + 1}`;
}

function normalizeSession(session) {
  if (!session || typeof session !== 'object') return null;
  if (typeof session.id !== 'string') return null;
  if (typeof session.startedAt !== 'string') return null;
  const reps = Number.isInteger(session.reps) && session.reps >= 0 ? session.reps : 0;
  const hour = typeof session.hour === 'string' ? session.hour : localHourString(session.startedAt);
  const endedAt = typeof session.endedAt === 'string' ? session.endedAt : null;
  return { id: session.id, startedAt: session.startedAt, endedAt, hour, reps };
}

function normalizeCalibration(data) {
  const legacy = data.calibration
    && typeof data.calibration === 'object'
    && data.calibration.up
    && data.calibration.down
    ? data.calibration
    : null;
  const byCamera = data.calibrations && typeof data.calibrations === 'object'
    ? data.calibrations
    : {};

  return {
    user: byCamera.user || legacy || null,
    environment: byCamera.environment || null,
  };
}

export function normalizeData(data) {
  if (!data || typeof data !== 'object') return defaultData();
  const goal = Number.isInteger(data.goal) && data.goal >= 1 ? data.goal : 100;
  const cameraMode = data.version >= 2 && data.cameraMode === 'environment' ? 'environment' : 'user';
  const calibrations = normalizeCalibration(data);
  const days = Array.isArray(data.days)
    ? data.days
        .filter(day =>
          typeof day.date === 'string'
          && Number.isInteger(day.reps)
          && day.reps >= 0
          && Number.isInteger(day.goal)
          && day.goal >= 1
        )
        .map(day => ({
          date: day.date,
          reps: day.reps,
          goal: day.goal,
          sessions: Array.isArray(day.sessions)
            ? day.sessions.map(normalizeSession).filter(Boolean)
            : [],
        }))
    : [];
  return { version: 3, goal, cameraMode, calibrations, days };
}

function hourlyFrom(sessions) {
  const byHour = new Map();
  for (const session of sessions) {
    byHour.set(session.hour, (byHour.get(session.hour) || 0) + session.reps);
  }
  return [...byHour.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, reps]) => ({ hour, reps }));
}

export function stateFromData(data, date = localDateString()) {
  const normalized = normalizeData(data);
  const entry = normalized.days.find(day => day.date === date)
    || { date, reps: 0, goal: normalized.goal, sessions: [] };
  return {
    goal: normalized.goal,
    cameraMode: normalized.cameraMode,
    calibration: normalized.calibrations[normalized.cameraMode] || null,
    today: {
      ...entry,
      sessions: [...entry.sessions],
      hourly: hourlyFrom(entry.sessions),
      remaining: Math.max(0, entry.goal - entry.reps),
    },
    days: normalized.days,
  };
}

function entryFor(data, date) {
  let entry = data.days.find(day => day.date === date);
  if (!entry) {
    entry = { date, reps: 0, goal: data.goal, sessions: [] };
    data.days.push(entry);
  }
  if (!Array.isArray(entry.sessions)) entry.sessions = [];
  return entry;
}

function findSession(data, date, sessionId) {
  const entry = entryFor(data, date);
  return entry.sessions.find(session => session.id === sessionId) || null;
}

function createSession(entry, startedAt) {
  const dt = toDate(startedAt);
  const session = {
    id: sessionIdFrom(dt, entry.sessions.length),
    startedAt: dt.toISOString(),
    endedAt: null,
    hour: localHourString(dt),
    reps: 0,
  };
  entry.sessions.push(session);
  return session;
}

export function startSessionInData(data, { today = localDateString(), now = () => new Date() } = {}) {
  const next = normalizeData(data);
  const entry = entryFor(next, today);
  const session = createSession(entry, now());
  return { data: normalizeData(next), sessionId: session.id };
}

export function finishSessionInData(data, sessionId, { today = localDateString(), now = () => new Date() } = {}) {
  const next = normalizeData(data);
  const session = findSession(next, today, sessionId);
  if (session) session.endedAt = toDate(now()).toISOString();
  return normalizeData(next);
}

export function addRepsToData(data, count, { today = localDateString(), now = () => new Date(), sessionId } = {}) {
  const next = normalizeData(data);
  const entry = entryFor(next, today);
  entry.reps += count;
  let session = sessionId ? findSession(next, today, sessionId) : null;
  if (!session) session = createSession(entry, now());
  session.reps += count;
  return normalizeData(next);
}

export function setTodayRepsInData(data, reps, { today = localDateString() } = {}) {
  const next = normalizeData(data);
  const entry = entryFor(next, today);
  entry.reps = Math.max(0, reps);
  return normalizeData(next);
}

export function setGoalInData(data, goal, { today = localDateString() } = {}) {
  const next = normalizeData(data);
  next.goal = goal;
  const entry = next.days.find(day => day.date === today);
  if (entry) entry.goal = goal;
  return normalizeData(next);
}

export function setCameraModeInData(data, cameraMode) {
  const next = normalizeData(data);
  next.cameraMode = cameraMode === 'user' ? 'user' : 'environment';
  return normalizeData(next);
}

export function setCalibrationInData(data, calibration) {
  const next = normalizeData(data);
  next.calibrations[next.cameraMode] = calibration;
  return normalizeData(next);
}
```

- [ ] **Step 4: Refactor `local-store.js` to use `state-core.js`**

Replace `public/js/local-store.js` with:

```js
import {
  STORAGE_KEY,
  defaultData,
  localDateString,
  normalizeData,
  stateFromData,
  startSessionInData,
  finishSessionInData,
  addRepsToData,
  setTodayRepsInData,
  setGoalInData,
  setCameraModeInData,
  setCalibrationInData,
} from './state-core.js';

export function createLocalStore({
  storage = window.localStorage,
  today = () => localDateString(),
  now = () => new Date(),
} = {}) {
  function read() {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      return raw ? normalizeData(JSON.parse(raw)) : defaultData();
    } catch {
      return defaultData();
    }
  }

  function write(data) {
    storage.setItem(STORAGE_KEY, JSON.stringify(normalizeData(data)));
  }

  return {
    getState() {
      return stateFromData(read(), today());
    },

    startSession() {
      const result = startSessionInData(read(), { today: today(), now });
      write(result.data);
      return { ...stateFromData(result.data, today()), sessionId: result.sessionId };
    },

    finishSession(sessionId) {
      const data = finishSessionInData(read(), sessionId, { today: today(), now });
      write(data);
      return stateFromData(data, today());
    },

    addReps(count, { sessionId } = {}) {
      const data = addRepsToData(read(), count, { today: today(), now, sessionId });
      write(data);
      return stateFromData(data, today());
    },

    setTodayReps(reps) {
      const data = setTodayRepsInData(read(), reps, { today: today() });
      write(data);
      return stateFromData(data, today());
    },

    setGoal(goal) {
      const data = setGoalInData(read(), goal, { today: today() });
      write(data);
      return stateFromData(data, today());
    },

    setCameraMode(cameraMode) {
      const data = setCameraModeInData(read(), cameraMode);
      write(data);
      return stateFromData(data, today());
    },

    setCalibration(calibration) {
      const data = setCalibrationInData(read(), calibration);
      write(data);
      return stateFromData(data, today());
    },
  };
}
```

- [ ] **Step 5: Run focused tests**

Run: `npm test -- tests/state-core.test.js tests/local-store.test.js`

Expected: PASS for all state-core and local-store tests.

- [ ] **Step 6: Run full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add public/js/state-core.js public/js/local-store.js tests/state-core.test.js
git commit -m "refactor: extract pushup state core"
```

## Task 2: Add Supabase Config And Static Auth UI

**Files:**
- Create: `public/js/supabase-config.js`
- Create: `tests/auth-ui.test.js`
- Modify: `public/index.html`
- Modify: `public/css/style.css`

- [ ] **Step 1: Write failing static UI tests**

Create `tests/auth-ui.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/auth-ui.test.js`

Expected: FAIL because `public/js/supabase-config.js` does not exist.

- [ ] **Step 3: Add Supabase config**

Create `public/js/supabase-config.js`:

```js
export const SUPABASE_URL = 'https://pkpqafyfwpoykniusghx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcHFhZnlmd3BveWtuaXVzZ2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTYyNDIsImV4cCI6MjA5ODkzMjI0Mn0.qFeA2lvqu3R-0uAOHPixunb5qSmiiDycDJhEBPCnXlY';
```

- [ ] **Step 4: Add auth UI to `index.html`**

Insert this block immediately after `<body>`:

```html
  <section id="auth-screen" class="auth-screen" aria-labelledby="auth-title" hidden>
    <form id="auth-form" class="auth-card">
      <p class="eyebrow">Cloud sync</p>
      <h1 id="auth-title">PushUp Counter</h1>
      <label for="auth-email">Email</label>
      <input id="auth-email" type="email" autocomplete="email" required />
      <label for="auth-password">Parola</label>
      <input id="auth-password" type="password" autocomplete="current-password" required />
      <button id="btn-sign-in" class="primary" type="submit">Intra in cont</button>
      <p id="auth-message" class="auth-message" aria-live="polite"></p>
    </form>
  </section>
```

Add this account bar as the first child inside `<main class="app-shell">`:

```html
    <div id="account-bar" class="account-bar" hidden>
      <span id="account-email"></span>
      <span id="sync-status" class="sync-status">Se incarca...</span>
      <button id="btn-sign-out" class="secondary compact-button" type="button">Iesi</button>
    </div>
```

Change the app script version and add the Supabase script before it:

```html
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script type="module" src="./js/app.js?v=cloud-history-1"></script>
```

- [ ] **Step 5: Add CSS**

Append to `public/css/style.css`:

```css
.auth-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  background: linear-gradient(180deg, #151b25 0%, var(--bg) 44%, #090b10 100%);
}

.auth-screen[hidden] {
  display: none;
}

.auth-card {
  display: grid;
  gap: 12px;
  width: min(420px, 100%);
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(25, 31, 41, 0.94);
  box-shadow: var(--shadow);
}

.auth-card label {
  color: var(--muted);
  font-weight: 750;
}

.auth-card input {
  width: 100%;
  min-height: 48px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-3);
  color: var(--fg);
  font-weight: 750;
}

.auth-message {
  min-height: 22px;
  margin: 0;
  color: var(--muted);
  font-weight: 650;
}

.account-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

.account-bar[hidden] {
  display: none;
}

.sync-status {
  color: var(--accent);
  white-space: nowrap;
}

.sync-status.failed {
  color: var(--danger);
}

.sync-status.pending {
  color: var(--warn);
}

.compact-button {
  min-height: 36px;
  padding: 0 12px;
  font-size: 13px;
}
```

- [ ] **Step 6: Run focused tests**

Run: `npm test -- tests/auth-ui.test.js tests/calibration-ui.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add public/index.html public/css/style.css public/js/supabase-config.js tests/auth-ui.test.js tests/calibration-ui.test.js
git commit -m "feat: add cloud auth UI shell"
```

## Task 3: Implement Cloud Store

**Files:**
- Create: `public/js/cloud-store.js`
- Create: `tests/cloud-store.test.js`

- [ ] **Step 1: Write failing cloud-store tests**

Create `tests/cloud-store.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudStore } from '../public/js/cloud-store.js';
import { STORAGE_KEY } from '../public/js/state-core.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

function fakeSupabase({ row = null, failUpsert = false } = {}) {
  const calls = [];
  const api = {
    calls,
    from(table) {
      assert.equal(table, 'pushup_states');
      return {
        select(columns) {
          calls.push({ type: 'select', columns });
          return {
            eq(column, value) {
              calls.push({ type: 'eq', column, value });
              return {
                async maybeSingle() {
                  calls.push({ type: 'maybeSingle' });
                  return { data: row, error: null };
                },
              };
            },
          };
        },
        upsert(payload) {
          calls.push({ type: 'upsert', payload });
          return {
            async select() {
              if (failUpsert) return { data: null, error: new Error('offline') };
              row = { user_id: payload.user_id, state: payload.state };
              return { data: [row], error: null };
            },
          };
        },
      };
    },
  };
  return api;
}

const user = { id: 'user-1', email: 'me@example.com' };
const today = () => '2026-07-06';
const now = () => new Date(2026, 6, 6, 8, 0);

test('init creates cloud row from local state when cloud is missing', async () => {
  const localState = {
    version: 3,
    goal: 75,
    cameraMode: 'user',
    calibrations: { user: null, environment: null },
    days: [],
  };
  const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(localState) });
  const supabase = fakeSupabase({ row: null });

  const store = await createCloudStore({ supabase, user, storage, today, now });

  assert.equal(store.getState().goal, 75);
  assert.equal(store.getSyncStatus().state, 'saved');
  assert.equal(supabase.calls.some(call => call.type === 'upsert'), true);
});

test('init prefers existing cloud state over local state', async () => {
  const storage = memoryStorage({
    [STORAGE_KEY]: JSON.stringify({
      version: 3,
      goal: 75,
      cameraMode: 'user',
      calibrations: { user: null, environment: null },
      days: [],
    }),
  });
  const supabase = fakeSupabase({
    row: {
      user_id: user.id,
      state: {
        version: 3,
        goal: 120,
        cameraMode: 'user',
        calibrations: { user: null, environment: null },
        days: [],
      },
    },
  });

  const store = await createCloudStore({ supabase, user, storage, today, now });

  assert.equal(store.getState().goal, 120);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).goal, 120);
});

test('mutations upsert normalized full state', async () => {
  const storage = memoryStorage();
  const supabase = fakeSupabase({ row: null });
  const store = await createCloudStore({ supabase, user, storage, today, now });

  const state = await store.setGoal(60);

  assert.equal(state.goal, 60);
  const upserts = supabase.calls.filter(call => call.type === 'upsert');
  assert.equal(upserts.at(-1).payload.user_id, user.id);
  assert.equal(upserts.at(-1).payload.state.goal, 60);
});

test('failed cloud write keeps local state and marks sync failed', async () => {
  const storage = memoryStorage();
  const supabase = fakeSupabase({ row: null, failUpsert: true });
  const store = await createCloudStore({ supabase, user, storage, today, now });

  const state = await store.setTodayReps(9);

  assert.equal(state.today.reps, 9);
  assert.equal(store.getSyncStatus().state, 'failed');
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).days[0].reps, 9);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/cloud-store.test.js`

Expected: FAIL with module not found for `../public/js/cloud-store.js`.

- [ ] **Step 3: Implement `cloud-store.js`**

Create `public/js/cloud-store.js`:

```js
import {
  STORAGE_KEY,
  defaultData,
  normalizeData,
  stateFromData,
  startSessionInData,
  finishSessionInData,
  addRepsToData,
  setTodayRepsInData,
  setGoalInData,
  setCameraModeInData,
  setCalibrationInData,
} from './state-core.js';

function readLocal(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? normalizeData(JSON.parse(raw)) : defaultData();
  } catch {
    return defaultData();
  }
}

function writeLocal(storage, data) {
  storage.setItem(STORAGE_KEY, JSON.stringify(normalizeData(data)));
}

export async function createCloudStore({
  supabase,
  user,
  storage = window.localStorage,
  today,
  now = () => new Date(),
}) {
  let data = readLocal(storage);
  let syncStatus = { state: 'pending', message: 'Se sincronizeaza...' };

  function date() {
    return typeof today === 'function' ? today() : undefined;
  }

  function currentState(extra = {}) {
    return { ...stateFromData(data, date()), ...extra };
  }

  async function save(nextData) {
    data = normalizeData(nextData);
    writeLocal(storage, data);
    syncStatus = { state: 'pending', message: 'Se salveaza...' };

    const { error } = await supabase
      .from('pushup_states')
      .upsert({
        user_id: user.id,
        state: data,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      syncStatus = { state: 'failed', message: 'Nesalvat in cloud' };
      return currentState();
    }

    syncStatus = { state: 'saved', message: 'Salvat' };
    return currentState();
  }

  async function load() {
    const { data: row, error } = await supabase
      .from('pushup_states')
      .select('state')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      syncStatus = { state: 'failed', message: 'Cloud indisponibil' };
      return;
    }

    if (row?.state) {
      data = normalizeData(row.state);
      writeLocal(storage, data);
      syncStatus = { state: 'saved', message: 'Salvat' };
      return;
    }

    await save(data);
  }

  await load();

  return {
    getState() {
      return currentState();
    },

    getSyncStatus() {
      return syncStatus;
    },

    async retrySync() {
      return save(data);
    },

    async startSession() {
      const result = startSessionInData(data, { today: date(), now });
      await save(result.data);
      return { ...currentState(), sessionId: result.sessionId };
    },

    async finishSession(sessionId) {
      return save(finishSessionInData(data, sessionId, { today: date(), now }));
    },

    async addReps(count, { sessionId } = {}) {
      return save(addRepsToData(data, count, { today: date(), now, sessionId }));
    },

    async setTodayReps(reps) {
      return save(setTodayRepsInData(data, reps, { today: date() }));
    },

    async setGoal(goal) {
      return save(setGoalInData(data, goal, { today: date() }));
    },

    async setCameraMode(cameraMode) {
      return save(setCameraModeInData(data, cameraMode));
    },

    async setCalibration(calibration) {
      return save(setCalibrationInData(data, calibration));
    },
  };
}
```

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/cloud-store.test.js tests/state-core.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/cloud-store.js tests/cloud-store.test.js
git commit -m "feat: add Supabase cloud store"
```

## Task 4: Wire Auth And Async Store Into App

**Files:**
- Modify: `public/js/app.js`
- Modify: `tests/auth-ui.test.js`

- [ ] **Step 1: Add failing app wiring tests**

Append to `tests/auth-ui.test.js`:

```js
const appJs = readFileSync(new URL('../public/js/app.js', import.meta.url), 'utf8');

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/auth-ui.test.js`

Expected: FAIL because `app.js` still constructs `createLocalStore()` directly.

- [ ] **Step 3: Update imports and top-level store setup**

In `public/js/app.js`, replace:

```js
import { createLocalStore } from './local-store.js';
```

with:

```js
import { createCloudStore } from './cloud-store.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';
```

Replace:

```js
const store = createLocalStore();
const voice = createVoice();
```

with:

```js
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
const voice = createVoice();
let store = null;
```

- [ ] **Step 4: Add auth UI helpers**

Add after `renderClock()`:

```js
function setAuthVisible(visible) {
  $('auth-screen').hidden = !visible;
  document.querySelector('.app-shell').hidden = visible;
  document.querySelector('.tabs').hidden = visible;
}

function renderSyncStatus() {
  const status = store?.getSyncStatus?.() || { state: 'pending', message: 'Se incarca...' };
  const target = $('sync-status');
  if (!target) return;
  target.textContent = status.message;
  target.classList.toggle('failed', status.state === 'failed');
  target.classList.toggle('pending', status.state === 'pending');
}

function renderAccount(user) {
  $('account-bar').hidden = !user;
  $('account-email').textContent = user?.email || '';
  renderSyncStatus();
}
```

- [ ] **Step 5: Convert store event handlers to async**

Change each store mutation handler in `app.js` to await the cloud store. For example:

```js
$('goal-form').addEventListener('submit', async event => {
  event.preventDefault();
  const goal = parseInt($('goal-input').value, 10);
  if (!Number.isInteger(goal) || goal < 1) return;
  state = await store.setGoal(goal);
  goalAnnounced = state.today.remaining === 0;
  renderToday();
  renderSyncStatus();
});
```

Apply the same pattern to:

- manual reps submit
- camera mode change
- `saveCalibration` inside `startAutoCalibration`
- counted reps in `onLandmarks`
- `startWorkout()`
- `stopWorkout()`

For `saveCalibration`, make the callback async and update `runAutoCalibration` if needed to await it:

```js
saveCalibration: async calibration => {
  state = await store.setCalibration(calibration);
  counter = createCalibratedCounter({ calibration: state.calibration });
  renderSyncStatus();
},
```

- [ ] **Step 6: Add auth init and login/logout**

Replace the final startup lines:

```js
refresh();
renderClock();
clockTimer = setInterval(renderClock, 60000);
```

with:

```js
async function initApp() {
  renderClock();
  clockTimer = setInterval(renderClock, 60000);

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user || null;
  if (!user) {
    setAuthVisible(true);
    return;
  }

  setAuthVisible(false);
  renderAccount(user);
  store = await createCloudStore({ supabase, user });
  refresh();
  renderSyncStatus();
}

$('auth-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('auth-message').textContent = 'Se autentifica...';
  const email = $('auth-email').value.trim();
  const password = $('auth-password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    $('auth-message').textContent = error.message;
    return;
  }
  $('auth-message').textContent = '';
  setAuthVisible(false);
  renderAccount(data.user);
  store = await createCloudStore({ supabase, user: data.user });
  refresh();
  renderSyncStatus();
});

$('btn-sign-out').addEventListener('click', async () => {
  await stopWorkout();
  await supabase.auth.signOut();
  store = null;
  state = null;
  setAuthVisible(true);
  renderAccount(null);
});

initApp();
```

Update `refresh()` so it does not run without a store:

```js
function refresh() {
  if (!store) return;
  state = store.getState();
  goalAnnounced = state.today.remaining === 0;
  renderToday();
  renderSyncStatus();
}
```

- [ ] **Step 7: Run focused tests**

Run: `npm test -- tests/auth-ui.test.js tests/cloud-store.test.js tests/calibration-flow.test.js`

Expected: PASS. If `calibration-flow.test.js` fails because `saveCalibration` is not awaited, update `public/js/calibration-flow.js` to use `await saveCalibration(calibration);`, then re-run.

- [ ] **Step 8: Run full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add public/js/app.js public/js/calibration-flow.js tests/auth-ui.test.js
git commit -m "feat: wire app to Supabase auth"
```

## Task 5: Update Documentation And Manual Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README cloud sections**

Replace the `Date locale` section in `README.md` with:

```md
## Date in cloud

Aplicatia foloseste GitHub Pages pentru hosting si Supabase pentru login + istoric persistent.

Datele principale se salveaza in Supabase:

- tinta zilnica
- istoricul pe zile
- sesiunile pe ore
- camera preferata
- calibrarile pentru camera fata/spate

Browserul pastreaza si o copie locala pentru pornire rapida si fallback temporar daca internetul pica. Sursa principala ramane Supabase dupa login.

Prima data te loghezi cu email si parola. Telefonul pastreaza sesiunea, deci nu trebuie sa te loghezi zilnic.
```

Add a new setup section before `## Publicare pe GitHub Pages`:

```md
## Setup Supabase

1. Creeaza un user in Supabase Auth pentru emailul tau.
2. Ruleaza SQL-ul din `docs/superpowers/specs/2026-07-06-cloud-history-design.md`.
3. Verifica in Supabase ca tabela `pushup_states` are Row Level Security activ.
4. Publica aplicatia pe GitHub Pages.
5. Deschide aplicatia pe telefon si logheaza-te.
6. Daca exista istoric local si cloud-ul este gol, aplicatia il urca automat.
```

- [ ] **Step 2: Add README static test**

Append to `tests/auth-ui.test.js`:

```js
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

test('README documents Supabase cloud history setup', () => {
  assert.match(readme, /Supabase/);
  assert.match(readme, /pushup_states/);
  assert.match(readme, /GitHub Pages/);
});
```

- [ ] **Step 3: Run docs test**

Run: `npm test -- tests/auth-ui.test.js`

Expected: PASS.

- [ ] **Step 4: Run full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Manual local browser verification**

Run: `npm start`

Open `https://localhost:3443` manually in a browser and accept the self-signed certificate. Verify:

- signed-out users see the login screen
- a valid Supabase user can sign in
- the app shows the account email
- changing the daily goal shows sync status `Salvat`
- reloading keeps the changed goal
- sign out returns to the login screen

- [ ] **Step 6: Commit**

```bash
git add README.md tests/auth-ui.test.js
git commit -m "docs: document cloud history setup"
```

## Task 6: Final Verification And Deploy Readiness

**Files:**
- Verify only unless a previous step exposed a defect.

- [ ] **Step 1: Run full automated tests**

Run: `npm test`

Expected: PASS with zero failures.

- [ ] **Step 2: Inspect git diff**

Run: `git status --short`

Expected: only intentional files changed or clean after commits.

- [ ] **Step 3: Confirm Supabase database**

In Supabase SQL editor, run:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
and tablename = 'pushup_states';
```

Expected: one row with `rowsecurity = true`.

- [ ] **Step 4: Confirm RLS policies**

In Supabase SQL editor, run:

```sql
select policyname, cmd
from pg_policies
where schemaname = 'public'
and tablename = 'pushup_states'
order by policyname;
```

Expected: three policies for select, insert, and update.

- [ ] **Step 5: Deploy**

Push the branch to GitHub and wait for the GitHub Pages workflow to pass.

- [ ] **Step 6: Phone verification on deployed URL**

Open:

```text
https://edialex30.github.io/?v=cloud-history-1
```

Verify on phone:

- login works
- no laptop is required
- existing local data uploads if cloud is empty
- daily goal persists after page reload
- manual reps persist after page reload
- statistics persist after page reload
- sign out and sign in restores the same history

