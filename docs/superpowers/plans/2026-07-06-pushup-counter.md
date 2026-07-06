# PushUp Counter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicație web locală care numără automat flotările prin camera telefonului și le scade dintr-o țintă zilnică, cu istoric și statistici.

**Architecture:** Server Node.js/Express pe laptop servește pagina prin HTTPS (certificat self-signed auto-generat) și expune un API JSON peste `data/history.json`. Detecția de postură rulează în browserul telefonului cu MediaPipe Pose; frontend-ul (vanilla JS) trimite evenimente „+N flotări" la server și afișează contorul, vocea și statisticile.

**Tech Stack:** Node.js 24, Express, `selfsigned` (certificat), vanilla JS ES modules, MediaPipe Tasks Vision (Pose Landmarker), Chart.js, node:test.

## Global Constraints

- Node.js runtime: v24.x (confirmat instalat). Fără build step / bundler.
- Dependențe de runtime permise: `express`, `selfsigned`. Restul (MediaPipe, Chart.js) livrate ca fișiere statice locale în `public/vendor/`.
- HTTPS obligatoriu (getUserMedia cere secure context). Certificatul se generează o dată în `certs/` și se refolosește.
- Toate datele rămân local; nimic nu iese din rețeaua LAN.
- Ziua curentă = data locală a serverului, format `YYYY-MM-DD`.
- Scriere atomică pentru `data/history.json` (temp file + rename).
- Interfața mobil-first; textul UI în română.
- Praguri detecție implicite: cot întins > 150°, cot îndoit < 90°, vizibilitate landmark minimă 0.5.
- Modulele de logică (`rep-counter.js`, `stats.js`) sunt funcții pure, testabile fără cameră/DOM.

---

## File Structure

- `package.json` — metadate, scripts (`start`, `test`), dependențe.
- `server.js` — bootstrap Express + HTTPS, montează rutele.
- `src/storage.js` — citire/scriere atomică a `data/history.json`, model de date.
- `src/day.js` — helper pentru data locală `YYYY-MM-DD` (injectabil pentru teste).
- `src/api.js` — router Express: `/api/state`, `/api/reps`, `/api/goal`.
- `src/cert.js` — generează/încarcă certificatul self-signed.
- `public/index.html` — shell-ul aplicației (3 ecrane/tab-uri).
- `public/css/style.css` — stiluri mobil-first.
- `public/js/app.js` — navigare între ecrane, fetch state, glue.
- `public/js/rep-counter.js` — mașina de stări a flotării (funcție pură).
- `public/js/stats.js` — agregări statistice (funcții pure).
- `public/js/pose.js` — inițializează MediaPipe, trece landmark-uri la rep-counter.
- `public/js/voice.js` — text-to-speech numărare.
- `public/js/api-client.js` — wrapper fetch + retry pentru evenimente reps.
- `public/vendor/` — MediaPipe + Chart.js + modelul `.task` (fișiere statice).
- `tests/rep-counter.test.js`, `tests/stats.test.js`, `tests/storage.test.js`, `tests/api.test.js` — teste node:test.
- `README.md` — cum se pornește, acceptarea certificatului pe telefon.

---

## Task 1: Project scaffold + package.json

**Files:**
- Create: `package.json`
- Create: `.gitignore`

**Interfaces:**
- Produces: scripts `npm start` (→ `node server.js`) și `npm test` (→ `node --test`). Dependențe `express`, `selfsigned` instalate.

- [ ] **Step 1: Create package.json**

```json
{
  "name": "pushup-counter",
  "version": "1.0.0",
  "description": "Local web app that auto-counts push-ups via phone camera",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "test": "node --test"
  },
  "dependencies": {
    "express": "^4.21.2",
    "selfsigned": "^2.4.1"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
certs/
data/history.json
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `express` and `selfsigned` present, exit code 0.

- [ ] **Step 4: Verify test runner works**

Run: `npm test`
Expected: exit code 0 with "tests 0" (no tests yet) — confirms `node --test` runs.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: scaffold project with express and selfsigned"
```

---

## Task 2: Day helper

**Files:**
- Create: `src/day.js`
- Test: `tests/day.test.js`

**Interfaces:**
- Produces: `export function localDateString(date = new Date())` → returnează `YYYY-MM-DD` pentru data locală a mașinii.

- [ ] **Step 1: Write the failing test**

```js
// tests/day.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/day.test.js`
Expected: FAIL — cannot find module `../src/day.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/day.js
export function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/day.test.js`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/day.js tests/day.test.js
git commit -m "feat: add local date helper"
```

---

## Task 3: Storage module

**Files:**
- Create: `src/storage.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Consumes: `localDateString` from `src/day.js`.
- Produces:
  - `export function createStorage(filePath)` → returnează un obiect cu metodele de mai jos.
  - `store.read()` → `{ goal: number, days: Array<{date, reps, goal}> }` (creează default dacă fișierul lipsește).
  - `store.getState(today)` → `{ goal, today: {date, reps, goal, remaining}, days }`.
  - `store.addReps(today, count)` → adaugă la ziua `today` (creează intrarea cu goal curent dacă lipsește), returnează același shape ca `getState`.
  - `store.setGoal(goal)` → schimbă goal-ul rădăcină, returnează `read()`.
  - Default la fișier inexistent: `{ goal: 100, days: [] }`.
  - Scriere atomică: scrie în `filePath + '.tmp'`, apoi `renameSync`.

- [ ] **Step 1: Write the failing test**

```js
// tests/storage.test.js
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStorage } from '../src/storage.js';

function tmpFile() {
  const dir = mkdtempSync(join(tmpdir(), 'pushup-'));
  return join(dir, 'history.json');
}

test('read() returns default when file missing', () => {
  const store = createStorage(tmpFile());
  assert.deepEqual(store.read(), { goal: 100, days: [] });
});

test('addReps creates today entry and accumulates', () => {
  const store = createStorage(tmpFile());
  store.addReps('2026-07-06', 5);
  const state = store.addReps('2026-07-06', 3);
  assert.equal(state.today.reps, 8);
  assert.equal(state.today.remaining, 92);
  assert.equal(state.today.goal, 100);
});

test('addReps freezes goal per day', () => {
  const store = createStorage(tmpFile());
  store.addReps('2026-07-06', 10);
  store.setGoal(50);
  store.addReps('2026-07-07', 4);
  const data = store.read();
  const d6 = data.days.find(d => d.date === '2026-07-06');
  const d7 = data.days.find(d => d.date === '2026-07-07');
  assert.equal(d6.goal, 100);
  assert.equal(d7.goal, 50);
});

test('getState reports remaining not below zero when over goal', () => {
  const store = createStorage(tmpFile());
  store.setGoal(10);
  const state = store.addReps('2026-07-06', 12);
  assert.equal(state.today.reps, 12);
  assert.equal(state.today.remaining, 0);
});

test('persists to disk atomically (data survives new instance)', () => {
  const file = tmpFile();
  const a = createStorage(file);
  a.addReps('2026-07-06', 7);
  const b = createStorage(file);
  assert.equal(b.getState('2026-07-06').today.reps, 7);
});

test('recovers default on corrupt file', () => {
  const file = tmpFile();
  writeFileSync(file, '{ not valid json');
  const store = createStorage(file);
  assert.deepEqual(store.read(), { goal: 100, days: [] });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/storage.test.js`
Expected: FAIL — cannot find module `../src/storage.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/storage.js
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DEFAULT = () => ({ goal: 100, days: [] });

export function createStorage(filePath) {
  function read() {
    if (!existsSync(filePath)) return DEFAULT();
    try {
      const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
      if (typeof parsed.goal !== 'number' || !Array.isArray(parsed.days)) {
        return DEFAULT();
      }
      return parsed;
    } catch {
      return DEFAULT();
    }
  }

  function write(data) {
    mkdirSync(dirname(filePath), { recursive: true });
    const tmp = filePath + '.tmp';
    writeFileSync(tmp, JSON.stringify(data, null, 2));
    renameSync(tmp, filePath);
  }

  function toState(data, today) {
    const entry = data.days.find(d => d.date === today)
      || { date: today, reps: 0, goal: data.goal };
    const remaining = Math.max(0, entry.goal - entry.reps);
    return { goal: data.goal, today: { ...entry, remaining }, days: data.days };
  }

  function getState(today) {
    return toState(read(), today);
  }

  function addReps(today, count) {
    const data = read();
    let entry = data.days.find(d => d.date === today);
    if (!entry) {
      entry = { date: today, reps: 0, goal: data.goal };
      data.days.push(entry);
    }
    entry.reps += count;
    write(data);
    return toState(data, today);
  }

  function setGoal(goal) {
    const data = read();
    data.goal = goal;
    write(data);
    return data;
  }

  return { read, getState, addReps, setGoal };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/storage.test.js`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/storage.js tests/storage.test.js
git commit -m "feat: add atomic JSON storage with per-day goal freezing"
```

---

## Task 4: API router

**Files:**
- Create: `src/api.js`
- Test: `tests/api.test.js`

**Interfaces:**
- Consumes: `createStorage` from `src/storage.js`, `localDateString` from `src/day.js`.
- Produces: `export function createApiRouter({ store, now })` → returnează un `express.Router()`.
  - `now` este o funcție opțională `() => Date` (default `() => new Date()`) pentru teste deterministe.
  - `GET /state` → `200` cu `store.getState(today)`.
  - `POST /reps` body `{ count }` → validează `count` întreg ≥ 1, altfel `400 { error }`; la succes `200` cu state actualizat.
  - `PUT /goal` body `{ goal }` → validează `goal` întreg ≥ 1, altfel `400 { error }`; la succes `200` cu `{ goal }`.

- [ ] **Step 1: Write the failing test**

```js
// tests/api.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { createStorage } from '../src/storage.js';
import { createApiRouter } from '../src/api.js';

function makeApp() {
  const file = join(mkdtempSync(join(tmpdir(), 'pushup-')), 'history.json');
  const store = createStorage(file);
  const now = () => new Date(2026, 6, 6, 12, 0);
  const app = express();
  app.use(express.json());
  app.use('/api', createApiRouter({ store, now }));
  return app;
}

async function call(app, method, path, body) {
  const server = app.listen(0);
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  server.close();
  return { status: res.status, json };
}

test('GET /api/state returns default state', async () => {
  const app = makeApp();
  const { status, json } = await call(app, 'GET', '/api/state');
  assert.equal(status, 200);
  assert.equal(json.goal, 100);
  assert.equal(json.today.reps, 0);
  assert.equal(json.today.date, '2026-07-06');
});

test('POST /api/reps adds reps', async () => {
  const app = makeApp();
  const { status, json } = await call(app, 'POST', '/api/reps', { count: 3 });
  assert.equal(status, 200);
  assert.equal(json.today.reps, 3);
  assert.equal(json.today.remaining, 97);
});

test('POST /api/reps rejects invalid count', async () => {
  const app = makeApp();
  const { status, json } = await call(app, 'POST', '/api/reps', { count: 0 });
  assert.equal(status, 400);
  assert.ok(json.error);
});

test('PUT /api/goal changes goal', async () => {
  const app = makeApp();
  const { status, json } = await call(app, 'PUT', '/api/goal', { goal: 50 });
  assert.equal(status, 200);
  assert.equal(json.goal, 50);
});

test('PUT /api/goal rejects invalid goal', async () => {
  const app = makeApp();
  const { status } = await call(app, 'PUT', '/api/goal', { goal: -5 });
  assert.equal(status, 400);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/api.test.js`
Expected: FAIL — cannot find module `../src/api.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/api.js
import express from 'express';
import { localDateString } from './day.js';

function isPositiveInt(n) {
  return Number.isInteger(n) && n >= 1;
}

export function createApiRouter({ store, now = () => new Date() }) {
  const router = express.Router();

  router.get('/state', (req, res) => {
    res.json(store.getState(localDateString(now())));
  });

  router.post('/reps', (req, res) => {
    const { count } = req.body || {};
    if (!isPositiveInt(count)) {
      return res.status(400).json({ error: 'count must be an integer >= 1' });
    }
    res.json(store.addReps(localDateString(now()), count));
  });

  router.put('/goal', (req, res) => {
    const { goal } = req.body || {};
    if (!isPositiveInt(goal)) {
      return res.status(400).json({ error: 'goal must be an integer >= 1' });
    }
    res.json(store.setGoal(goal));
  });

  return router;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api.test.js`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/api.js tests/api.test.js
git commit -m "feat: add REST API router for state, reps, goal"
```

---

## Task 5: Certificate generation

**Files:**
- Create: `src/cert.js`

**Interfaces:**
- Consumes: `selfsigned` package.
- Produces: `export function loadOrCreateCert(dir)` → returnează `{ key, cert }` (strings PEM). Dacă `dir/key.pem` și `dir/cert.pem` există, le citește; altfel le generează (valabile 10 ani, cu SAN pentru localhost + IP-uri LAN) și le salvează.

- [ ] **Step 1: Write implementation**

```js
// src/cert.js
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { networkInterfaces } from 'node:os';
import selfsigned from 'selfsigned';

function localIps() {
  const ips = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

export function loadOrCreateCert(dir) {
  const keyPath = join(dir, 'key.pem');
  const certPath = join(dir, 'cert.pem');
  if (existsSync(keyPath) && existsSync(certPath)) {
    return { key: readFileSync(keyPath, 'utf8'), cert: readFileSync(certPath, 'utf8') };
  }
  mkdirSync(dir, { recursive: true });
  const altNames = [
    { type: 2, value: 'localhost' },
    { type: 7, ip: '127.0.0.1' },
    ...localIps().map(ip => ({ type: 7, ip })),
  ];
  const pems = selfsigned.generate(
    [{ name: 'commonName', value: 'pushup-counter' }],
    { days: 3650, keySize: 2048, altNames }
  );
  writeFileSync(keyPath, pems.private);
  writeFileSync(certPath, pems.cert);
  return { key: pems.private, cert: pems.cert };
}
```

- [ ] **Step 2: Manual smoke check**

Run: `node -e "import('./src/cert.js').then(m => { const c = m.loadOrCreateCert('./certs'); console.log('key?', c.key.startsWith('-----BEGIN'), 'cert?', c.cert.startsWith('-----BEGIN')); })"`
Expected: `key? true cert? true`, and `certs/key.pem` + `certs/cert.pem` created.

- [ ] **Step 3: Commit**

```bash
git add src/cert.js
git commit -m "feat: add self-signed cert generation with LAN SANs"
```

---

## Task 6: HTTPS server bootstrap

**Files:**
- Create: `server.js`

**Interfaces:**
- Consumes: `createStorage`, `createApiRouter`, `loadOrCreateCert`, `localIps` (via cert module reuse — dar aici recalculăm pentru afișare).
- Produces: executabil `node server.js` care pornește HTTPS pe port 3443, servește `public/`, montează `/api`, și printează URL-urile LAN.

- [ ] **Step 1: Write implementation**

```js
// server.js
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { networkInterfaces } from 'node:os';
import express from 'express';
import { createStorage } from './src/storage.js';
import { createApiRouter } from './src/api.js';
import { loadOrCreateCert } from './src/cert.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3443;

const store = createStorage(join(__dirname, 'data', 'history.json'));
const { key, cert } = loadOrCreateCert(join(__dirname, 'certs'));

const app = express();
app.use(express.json());
app.use('/api', createApiRouter({ store }));
app.use(express.static(join(__dirname, 'public')));

https.createServer({ key, cert }, app).listen(PORT, '0.0.0.0', () => {
  console.log('\n  PushUp Counter pornit!\n');
  console.log('  Deschide pe telefon (aceeași rețea Wi-Fi):');
  for (const list of Object.values(networkInterfaces())) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`    https://${iface.address}:${PORT}`);
      }
    }
  }
  console.log(`    https://localhost:${PORT}  (pe laptop)\n`);
  console.log('  Prima accesare: acceptă avertismentul de certificat.\n');
});
```

- [ ] **Step 2: Manual smoke check**

Run (background): `npm start`
Then: `node -e "const https=require('https');https.get({host:'127.0.0.1',port:3443,path:'/api/state',rejectUnauthorized:false},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{console.log(r.statusCode,d)})})"`
Expected: `200 {"goal":100,...}`. Stop the server after.

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: add HTTPS server serving static app and API"
```

---

## Task 7: Rep counter state machine

**Files:**
- Create: `public/js/rep-counter.js`
- Test: `tests/rep-counter.test.js`

**Interfaces:**
- Produces:
  - `export function elbowAngle(shoulder, elbow, wrist)` → grade (0–180), unde fiecare punct e `{x, y, visibility}`.
  - `export function createRepCounter(opts)` cu `opts = { downAngle=90, upAngle=150, minVisibility=0.5 }`.
  - `counter.update(points)` unde `points = { shoulder, elbow, wrist }` → returnează `{ counted: boolean, state: 'up'|'down'|'unknown', total: number }`. `counted:true` exact în cadrul în care se închide o repetare (down → up).
  - `counter.total` (getter) și `counter.reset()`.

- [ ] **Step 1: Write the failing test**

```js
// tests/rep-counter.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elbowAngle, createRepCounter } from '../public/js/rep-counter.js';

const V = 1; // full visibility
const pt = (x, y) => ({ x, y, visibility: V });

test('elbowAngle is ~180 for a straight arm', () => {
  const a = elbowAngle(pt(0, 0), pt(1, 0), pt(2, 0));
  assert.ok(Math.abs(a - 180) < 1, `got ${a}`);
});

test('elbowAngle is ~90 for a right angle', () => {
  const a = elbowAngle(pt(0, 1), pt(0, 0), pt(1, 0));
  assert.ok(Math.abs(a - 90) < 1, `got ${a}`);
});

function feed(counter, angle) {
  // build shoulder/elbow/wrist producing the given elbow angle
  const rad = (angle * Math.PI) / 180;
  const shoulder = pt(0, 1);
  const elbow = pt(0, 0);
  const wrist = pt(Math.sin(rad), -Math.cos(rad));
  return counter.update({ shoulder, elbow, wrist });
}

test('counts one rep on down then up', () => {
  const c = createRepCounter();
  feed(c, 170); // up
  feed(c, 80);  // down
  const r = feed(c, 165); // back up -> count
  assert.equal(r.counted, true);
  assert.equal(r.total, 1);
});

test('does not count a partial (never reaching down)', () => {
  const c = createRepCounter();
  feed(c, 170);
  feed(c, 120); // not below downAngle
  const r = feed(c, 165);
  assert.equal(r.counted, false);
  assert.equal(r.total, 0);
});

test('counts multiple reps', () => {
  const c = createRepCounter();
  feed(c, 170);
  for (let i = 0; i < 3; i++) { feed(c, 80); feed(c, 165); }
  assert.equal(c.total, 3);
});

test('ignores low-visibility frames', () => {
  const c = createRepCounter();
  feed(c, 170);
  const lowVis = { shoulder: { x: 0, y: 1, visibility: 0.1 }, elbow: pt(0, 0), wrist: pt(1, 0) };
  const r = c.update(lowVis);
  assert.equal(r.state, 'unknown');
  assert.equal(r.counted, false);
});

test('reset clears total', () => {
  const c = createRepCounter();
  feed(c, 170); feed(c, 80); feed(c, 165);
  c.reset();
  assert.equal(c.total, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/rep-counter.test.js`
Expected: FAIL — cannot find module `../public/js/rep-counter.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// public/js/rep-counter.js
export function elbowAngle(shoulder, elbow, wrist) {
  const a = { x: shoulder.x - elbow.x, y: shoulder.y - elbow.y };
  const b = { x: wrist.x - elbow.x, y: wrist.y - elbow.y };
  const dot = a.x * b.x + a.y * b.y;
  const magA = Math.hypot(a.x, a.y);
  const magB = Math.hypot(b.x, b.y);
  if (magA === 0 || magB === 0) return 0;
  let cos = dot / (magA * magB);
  cos = Math.max(-1, Math.min(1, cos));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function createRepCounter(opts = {}) {
  const downAngle = opts.downAngle ?? 90;
  const upAngle = opts.upAngle ?? 150;
  const minVisibility = opts.minVisibility ?? 0.5;

  let state = 'unknown';
  let total = 0;
  let reachedDown = false;

  function update(points) {
    const { shoulder, elbow, wrist } = points;
    const visOk = [shoulder, elbow, wrist].every(
      p => (p.visibility ?? 1) >= minVisibility
    );
    if (!visOk) {
      return { counted: false, state: 'unknown', total };
    }
    const angle = elbowAngle(shoulder, elbow, wrist);
    let counted = false;
    if (angle <= downAngle) {
      state = 'down';
      reachedDown = true;
    } else if (angle >= upAngle) {
      if (state === 'down' && reachedDown) {
        total += 1;
        counted = true;
        reachedDown = false;
      }
      state = 'up';
    }
    return { counted, state, total };
  }

  return {
    update,
    reset() { state = 'unknown'; total = 0; reachedDown = false; },
    get total() { return total; },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/rep-counter.test.js`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add public/js/rep-counter.js tests/rep-counter.test.js
git commit -m "feat: add pure rep-counter state machine"
```

---

## Task 8: Stats module

**Files:**
- Create: `public/js/stats.js`
- Test: `tests/stats.test.js`

**Interfaces:**
- Produces: `export function computeStats(days, today)` unde `days = Array<{date, reps, goal}>`, `today` = string `YYYY-MM-DD`.
  Returnează `{ total, bestDay, average, currentStreak, bestStreak, metGoalToday }`.
  - `total` = suma tuturor reps.
  - `bestDay` = maximul de reps într-o zi (0 dacă gol).
  - `average` = media reps pe zilele existente, rotunjită la întreg (0 dacă gol).
  - `currentStreak` = numărul de zile consecutive până la `today` (inclusiv) în care `reps >= goal`.
  - `bestStreak` = cea mai lungă serie de zile consecutive (calendaristic) cu `reps >= goal`.
  - `metGoalToday` = boolean.

- [ ] **Step 1: Write the failing test**

```js
// tests/stats.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats } from '../public/js/stats.js';

test('empty history yields zeros', () => {
  const s = computeStats([], '2026-07-06');
  assert.deepEqual(s, {
    total: 0, bestDay: 0, average: 0,
    currentStreak: 0, bestStreak: 0, metGoalToday: false,
  });
});

test('totals, best and average', () => {
  const days = [
    { date: '2026-07-04', reps: 100, goal: 100 },
    { date: '2026-07-05', reps: 50, goal: 100 },
    { date: '2026-07-06', reps: 120, goal: 100 },
  ];
  const s = computeStats(days, '2026-07-06');
  assert.equal(s.total, 270);
  assert.equal(s.bestDay, 120);
  assert.equal(s.average, 90);
});

test('current streak counts consecutive met-goal days ending today', () => {
  const days = [
    { date: '2026-07-04', reps: 100, goal: 100 },
    { date: '2026-07-05', reps: 100, goal: 100 },
    { date: '2026-07-06', reps: 100, goal: 100 },
  ];
  assert.equal(computeStats(days, '2026-07-06').currentStreak, 3);
});

test('current streak breaks on a missed day', () => {
  const days = [
    { date: '2026-07-04', reps: 100, goal: 100 },
    { date: '2026-07-05', reps: 40, goal: 100 },
    { date: '2026-07-06', reps: 100, goal: 100 },
  ];
  assert.equal(computeStats(days, '2026-07-06').currentStreak, 1);
});

test('current streak breaks on a calendar gap', () => {
  const days = [
    { date: '2026-07-04', reps: 100, goal: 100 },
    { date: '2026-07-06', reps: 100, goal: 100 }, // missing 07-05
  ];
  assert.equal(computeStats(days, '2026-07-06').currentStreak, 1);
});

test('current streak is zero when today missed', () => {
  const days = [
    { date: '2026-07-05', reps: 100, goal: 100 },
    { date: '2026-07-06', reps: 30, goal: 100 },
  ];
  const s = computeStats(days, '2026-07-06');
  assert.equal(s.currentStreak, 0);
  assert.equal(s.metGoalToday, false);
});

test('best streak finds longest consecutive run', () => {
  const days = [
    { date: '2026-07-01', reps: 100, goal: 100 },
    { date: '2026-07-02', reps: 100, goal: 100 },
    { date: '2026-07-03', reps: 10, goal: 100 },
    { date: '2026-07-04', reps: 100, goal: 100 },
    { date: '2026-07-05', reps: 100, goal: 100 },
    { date: '2026-07-06', reps: 100, goal: 100 },
  ];
  assert.equal(computeStats(days, '2026-07-06').bestStreak, 3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/stats.test.js`
Expected: FAIL — cannot find module `../public/js/stats.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// public/js/stats.js
function prevDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function computeStats(days, today) {
  const total = days.reduce((s, d) => s + d.reps, 0);
  const bestDay = days.reduce((m, d) => Math.max(m, d.reps), 0);
  const average = days.length ? Math.round(total / days.length) : 0;

  const byDate = new Map(days.map(d => [d.date, d]));
  const met = date => {
    const e = byDate.get(date);
    return !!e && e.reps >= e.goal;
  };

  let currentStreak = 0;
  let cursor = today;
  while (met(cursor)) {
    currentStreak += 1;
    cursor = prevDate(cursor);
  }

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let bestStreak = 0;
  let run = 0;
  let prev = null;
  for (const d of sorted) {
    const ok = d.reps >= d.goal;
    if (ok && prev && prevDate(d.date) === prev && metPrevOk(sorted, prev)) {
      run += 1;
    } else if (ok) {
      run = 1;
    } else {
      run = 0;
    }
    bestStreak = Math.max(bestStreak, run);
    prev = d.date;
  }

  return {
    total, bestDay, average,
    currentStreak, bestStreak,
    metGoalToday: met(today),
  };
}

function metPrevOk(sorted, date) {
  const e = sorted.find(d => d.date === date);
  return !!e && e.reps >= e.goal;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/stats.test.js`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add public/js/stats.js tests/stats.test.js
git commit -m "feat: add pure stats aggregation with streaks"
```

---

## Task 9: Vendor assets (MediaPipe + Chart.js + model)

**Files:**
- Create: `public/vendor/` (fișiere descărcate)
- Create: `scripts/fetch-vendor.mjs`

**Interfaces:**
- Produces: fișierele statice necesare frontend-ului, servite local:
  - `public/vendor/chart.umd.min.js` (Chart.js v4).
  - `public/vendor/vision_bundle.mjs` + WASM din `@mediapipe/tasks-vision`.
  - `public/vendor/pose_landmarker_lite.task` (modelul).
- Un script Node care le aduce (rulat o singură dată), ca instalarea să fie reproductibilă.

- [ ] **Step 1: Write the fetch script**

```js
// scripts/fetch-vendor.mjs
import { mkdirSync, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { join, dirname } from 'node:path';

const files = [
  ['https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js',
   'public/vendor/chart.umd.min.js'],
  ['https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/vision_bundle.mjs',
   'public/vendor/vision_bundle.mjs'],
  ['https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm/vision_wasm_internal.js',
   'public/vendor/wasm/vision_wasm_internal.js'],
  ['https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm/vision_wasm_internal.wasm',
   'public/vendor/wasm/vision_wasm_internal.wasm'],
  ['https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
   'public/vendor/pose_landmarker_lite.task'],
];

for (const [url, dest] of files) {
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  console.log('saved', dest);
}
console.log('vendor assets ready');
```

- [ ] **Step 2: Run the fetch script**

Run: `node scripts/fetch-vendor.mjs`
Expected: prints `saved ...` for each file and `vendor assets ready`; files exist under `public/vendor/`.

- [ ] **Step 3: Verify the model file downloaded (non-trivial size)**

Run: `node -e "const {statSync}=require('fs');console.log(statSync('public/vendor/pose_landmarker_lite.task').size > 1000000)"`
Expected: `true` (model is several MB).

- [ ] **Step 4: Add vendor to git (commit the assets so app works offline)**

Note: vendor assets are intentionally committed (offline-first). Ensure `.gitignore` does NOT exclude `public/vendor/`.

```bash
git add scripts/fetch-vendor.mjs public/vendor
git commit -m "chore: vendor MediaPipe, Chart.js and pose model locally"
```

---

## Task 10: Pose detection module

**Files:**
- Create: `public/js/pose.js`

**Interfaces:**
- Consumes: `vision_bundle.mjs`, `pose_landmarker_lite.task` din `public/vendor/`.
- Produces: `export async function createPoseTracker({ video, onLandmarks })`.
  - Inițializează `PoseLandmarker` (running mode VIDEO, GPU delegate cu fallback CPU).
  - `tracker.start()` pornește bucla `requestAnimationFrame` care detectează pe `video` și cheamă `onLandmarks(landmarks)` cu array-ul de 33 puncte `{x,y,z,visibility}` (sau `null` dacă niciun corp).
  - `tracker.stop()` oprește bucla.
  - Constante index: `LEFT_SHOULDER=11, LEFT_ELBOW=13, LEFT_WRIST=15, RIGHT_SHOULDER=12, RIGHT_ELBOW=14, RIGHT_WRIST=16` (exportate).

- [ ] **Step 1: Write implementation**

```js
// public/js/pose.js
import { PoseLandmarker, FilesetResolver }
  from '../vendor/vision_bundle.mjs';

export const LM = {
  LEFT_SHOULDER: 11, LEFT_ELBOW: 13, LEFT_WRIST: 15,
  RIGHT_SHOULDER: 12, RIGHT_ELBOW: 14, RIGHT_WRIST: 16,
};

export async function createPoseTracker({ video, onLandmarks }) {
  const fileset = await FilesetResolver.forVisionTasks('./vendor/wasm');
  let landmarker;
  try {
    landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: './vendor/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  } catch {
    landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: './vendor/pose_landmarker_lite.task',
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  }

  let running = false;
  let lastTs = -1;

  function loop() {
    if (!running) return;
    const ts = performance.now();
    if (video.readyState >= 2 && ts !== lastTs) {
      lastTs = ts;
      const result = landmarker.detectForVideo(video, ts);
      const marks = result.landmarks && result.landmarks[0]
        ? result.landmarks[0] : null;
      onLandmarks(marks);
    }
    requestAnimationFrame(loop);
  }

  return {
    start() { if (!running) { running = true; requestAnimationFrame(loop); } },
    stop() { running = false; },
  };
}
```

- [ ] **Step 2: Commit** (browser-only module; no node test)

```bash
git add public/js/pose.js
git commit -m "feat: add MediaPipe pose tracker module"
```

---

## Task 11: Voice module

**Files:**
- Create: `public/js/voice.js`

**Interfaces:**
- Produces: `export function createVoice()` → `{ say(text), count(n), enabled }`.
  - Folosește `speechSynthesis`. Preferă o voce `ro-RO`; dacă lipsește, folosește default.
  - `count(n)` rostește numărul (în română via voce ro, altfel numărul citit de default).
  - `say(text)` rostește un text arbitrar (ex. „Gata!").

- [ ] **Step 1: Write implementation**

```js
// public/js/voice.js
export function createVoice() {
  const synth = window.speechSynthesis;
  let roVoice = null;

  function pickVoice() {
    const voices = synth ? synth.getVoices() : [];
    roVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('ro')) || null;
  }
  if (synth) {
    pickVoice();
    synth.onvoiceschanged = pickVoice;
  }

  function speak(text) {
    if (!synth) return;
    const u = new SpeechSynthesisUtterance(text);
    if (roVoice) { u.voice = roVoice; u.lang = 'ro-RO'; }
    u.rate = 1.1;
    synth.cancel();
    synth.speak(u);
  }

  return {
    enabled: !!synth,
    say(text) { speak(text); },
    count(n) { speak(String(n)); },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/voice.js
git commit -m "feat: add text-to-speech voice module"
```

---

## Task 12: API client with retry

**Files:**
- Create: `public/js/api-client.js`

**Interfaces:**
- Produces: `export function createApiClient()` → `{ getState(), sendReps(count), setGoal(goal) }`.
  - `sendReps(count)` face `POST /api/reps`; la eșec rețea, acumulează într-o coadă și retrimite la următorul apel reușit; returnează Promise cu state-ul (sau `null` dacă e doar pus în coadă).
  - `getState()` → `GET /api/state`.
  - `setGoal(goal)` → `PUT /api/goal`.

- [ ] **Step 1: Write implementation**

```js
// public/js/api-client.js
export function createApiClient() {
  let pending = 0; // reps buffered while offline

  async function post(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function flush() {
    if (pending > 0) {
      const state = await post('/api/reps', { count: pending });
      pending = 0;
      return state;
    }
    return null;
  }

  return {
    async getState() {
      const res = await fetch('/api/state');
      return res.json();
    },
    async sendReps(count) {
      pending += count;
      try {
        return await flush();
      } catch {
        return null; // stays buffered, retried next time
      }
    },
    async setGoal(goal) {
      const res = await fetch('/api/goal', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ goal }),
      });
      return res.json();
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/api-client.js
git commit -m "feat: add API client with offline rep buffering"
```

---

## Task 13: HTML shell + CSS

**Files:**
- Create: `public/index.html`
- Create: `public/css/style.css`

**Interfaces:**
- Produces: markup cu 3 secțiuni (`#screen-today`, `#screen-workout`, `#screen-stats`), o bară de tab-uri, și elementele pe care `app.js` le controlează prin ID-uri:
  - Today: `#today-remaining`, `#today-goal`, `#today-done`, `#btn-start`, `#goal-input`, `#btn-save-goal`.
  - Workout: `#video`, `#overlay` (canvas), `#rep-count`, `#detect-status`, `#btn-stop`.
  - Stats: `#stat-total`, `#stat-average`, `#stat-best`, `#stat-streak`, `#stat-best-streak`, `#chart` (canvas).

- [ ] **Step 1: Write index.html**

```html
<!doctype html>
<html lang="ro">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>PushUp Counter</title>
  <link rel="stylesheet" href="./css/style.css" />
</head>
<body>
  <nav class="tabs">
    <button data-screen="today" class="tab active">Azi</button>
    <button data-screen="workout" class="tab">Antrenament</button>
    <button data-screen="stats" class="tab">Statistici</button>
  </nav>

  <main>
    <section id="screen-today" class="screen active">
      <div class="big-number"><span id="today-remaining">--</span></div>
      <p class="subtle">mai ai din <span id="today-goal">--</span> (făcute: <span id="today-done">0</span>)</p>
      <button id="btn-start" class="primary">Start antrenament</button>
      <div class="goal-editor">
        <label>Țintă zilnică:
          <input id="goal-input" type="number" min="1" value="100" />
        </label>
        <button id="btn-save-goal">Salvează</button>
      </div>
    </section>

    <section id="screen-workout" class="screen">
      <div class="video-wrap">
        <video id="video" playsinline muted></video>
        <canvas id="overlay"></canvas>
        <div id="rep-count" class="rep-count">0</div>
      </div>
      <p id="detect-status" class="subtle">Pornește pentru a începe.</p>
      <button id="btn-stop" class="primary">Stop</button>
    </section>

    <section id="screen-stats" class="screen">
      <div class="stat-grid">
        <div class="stat"><span id="stat-total">0</span><label>Total</label></div>
        <div class="stat"><span id="stat-average">0</span><label>Medie/zi</label></div>
        <div class="stat"><span id="stat-best">0</span><label>Record/zi</label></div>
        <div class="stat"><span id="stat-streak">0</span><label>Serie</label></div>
        <div class="stat"><span id="stat-best-streak">0</span><label>Record serie</label></div>
      </div>
      <canvas id="chart"></canvas>
    </section>
  </main>

  <script src="./vendor/chart.umd.min.js"></script>
  <script type="module" src="./js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write style.css**

```css
:root {
  --bg: #0f1115; --card: #1a1d24; --fg: #f2f4f8;
  --accent: #35c46a; --muted: #8a90a0; --danger: #e5484d;
}
* { box-sizing: border-box; }
body {
  margin: 0; font-family: system-ui, sans-serif;
  background: var(--bg); color: var(--fg);
  min-height: 100vh;
}
.tabs { display: flex; position: sticky; top: 0; background: var(--card); }
.tab {
  flex: 1; padding: 14px; border: 0; background: transparent;
  color: var(--muted); font-size: 15px; font-weight: 600;
}
.tab.active { color: var(--fg); border-bottom: 3px solid var(--accent); }
main { padding: 20px; }
.screen { display: none; }
.screen.active { display: block; }
.big-number { font-size: 28vw; font-weight: 800; text-align: center; line-height: 1; }
.big-number.done { color: var(--accent); }
.subtle { color: var(--muted); text-align: center; }
button.primary {
  display: block; width: 100%; padding: 18px; margin: 20px 0;
  font-size: 20px; font-weight: 700; border: 0; border-radius: 14px;
  background: var(--accent); color: #04120a;
}
.goal-editor { display: flex; gap: 10px; align-items: center; justify-content: center; margin-top: 20px; }
.goal-editor input { width: 90px; padding: 10px; font-size: 16px; border-radius: 8px; border: 1px solid #333; background: var(--card); color: var(--fg); }
.goal-editor button { padding: 10px 14px; border-radius: 8px; border: 0; background: var(--card); color: var(--fg); }
.video-wrap { position: relative; width: 100%; aspect-ratio: 3/4; background: #000; border-radius: 14px; overflow: hidden; }
#video, #overlay { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.rep-count {
  position: absolute; top: 10px; left: 0; right: 0; text-align: center;
  font-size: 22vw; font-weight: 800; color: #fff;
  text-shadow: 0 2px 12px rgba(0,0,0,0.8);
}
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
.stat { background: var(--card); border-radius: 12px; padding: 16px; text-align: center; }
.stat span { display: block; font-size: 28px; font-weight: 800; }
.stat label { color: var(--muted); font-size: 12px; }
```

- [ ] **Step 3: Manual visual check**

Run: `npm start`, open `https://localhost:3443` on the laptop, confirm three tabs render and switch when the JS is added (navigation works after Task 14). For now confirm no console errors loading assets.

- [ ] **Step 4: Commit**

```bash
git add public/index.html public/css/style.css
git commit -m "feat: add HTML shell and mobile-first styles"
```

---

## Task 14: App wiring (navigation, today, workout loop, stats)

**Files:**
- Create: `public/js/app.js`

**Interfaces:**
- Consumes: `createApiClient`, `createRepCounter`, `elbowAngle`(indirect), `createPoseTracker` + `LM`, `createVoice`, `computeStats`, global `Chart`.
- Produces: aplicația funcțională — nav între tab-uri, încărcare state, editare țintă, buclă de antrenament care numără + vorbește + trimite reps, și randare statistici + grafic.

- [ ] **Step 1: Write implementation**

```js
// public/js/app.js
import { createApiClient } from './api-client.js';
import { createRepCounter } from './rep-counter.js';
import { createPoseTracker, LM } from './pose.js';
import { createVoice } from './voice.js';
import { computeStats } from './stats.js';

const api = createApiClient();
const voice = createVoice();
const $ = id => document.getElementById(id);

let state = null;
let tracker = null;
let counter = null;
let wakeLock = null;
let chart = null;

function showScreen(name) {
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.screen === name));
  document.querySelectorAll('.screen').forEach(s =>
    s.classList.toggle('active', s.id === `screen-${name}`));
  if (name === 'stats') renderStats();
}

document.querySelectorAll('.tab').forEach(t =>
  t.addEventListener('click', () => showScreen(t.dataset.screen)));

function renderToday() {
  if (!state) return;
  $('today-remaining').textContent = state.today.remaining;
  $('today-goal').textContent = state.today.goal;
  $('today-done').textContent = state.today.reps;
  $('goal-input').value = state.goal;
  $('today-remaining').parentElement.classList.toggle('done', state.today.remaining === 0);
}

async function refresh() {
  state = await api.getState();
  renderToday();
}

$('btn-save-goal').addEventListener('click', async () => {
  const goal = parseInt($('goal-input').value, 10);
  if (goal >= 1) { await api.setGoal(goal); await refresh(); }
});

// ---- Workout ----
function currentArm(marks) {
  const vis = i => (marks[i].visibility ?? 1);
  const left = vis(LM.LEFT_SHOULDER) + vis(LM.LEFT_ELBOW) + vis(LM.LEFT_WRIST);
  const right = vis(LM.RIGHT_SHOULDER) + vis(LM.RIGHT_ELBOW) + vis(LM.RIGHT_WRIST);
  return left >= right
    ? { shoulder: marks[LM.LEFT_SHOULDER], elbow: marks[LM.LEFT_ELBOW], wrist: marks[LM.LEFT_WRIST] }
    : { shoulder: marks[LM.RIGHT_SHOULDER], elbow: marks[LM.RIGHT_ELBOW], wrist: marks[LM.RIGHT_WRIST] };
}

let noBodyAnnounced = false;

async function onLandmarks(marks) {
  if (!marks) {
    $('detect-status').textContent = 'Nu te văd — intră în cadru.';
    if (!noBodyAnnounced) { voice.say('Nu te văd'); noBodyAnnounced = true; }
    return;
  }
  noBodyAnnounced = false;
  $('detect-status').textContent = 'Te văd. Continuă!';
  const arm = currentArm(marks);
  const r = counter.update(arm);
  if (r.counted) {
    $('rep-count').textContent = r.total;
    const st = await api.sendReps(1);
    if (st) {
      state = st;
      renderToday();
      voice.count(state.today.reps);
      if (state.today.remaining === 0) voice.say('Gata! Țintă atinsă!');
    } else {
      voice.count(r.total);
    }
  }
}

async function startWorkout() {
  showScreen('workout');
  const video = $('video');
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: 720, height: 960 }, audio: false,
  });
  video.srcObject = stream;
  await video.play();
  counter = createRepCounter();
  $('rep-count').textContent = '0';
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch {}
  tracker = await createPoseTracker({ video, onLandmarks });
  tracker.start();
}

async function stopWorkout() {
  if (tracker) { tracker.stop(); tracker = null; }
  const video = $('video');
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }
  if (wakeLock) { try { await wakeLock.release(); } catch {} wakeLock = null; }
  await refresh();
  showScreen('today');
}

$('btn-start').addEventListener('click', startWorkout);
$('btn-stop').addEventListener('click', stopWorkout);

// ---- Stats ----
function renderStats() {
  if (!state) return;
  const s = computeStats(state.days, state.today.date);
  $('stat-total').textContent = s.total;
  $('stat-average').textContent = s.average;
  $('stat-best').textContent = s.bestDay;
  $('stat-streak').textContent = s.currentStreak;
  $('stat-best-streak').textContent = s.bestStreak;

  const last = [...state.days].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  const labels = last.map(d => d.date.slice(5));
  const data = last.map(d => d.reps);
  if (chart) chart.destroy();
  chart = new Chart($('chart'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Flotări', data, backgroundColor: '#35c46a' }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
  });
}

refresh();
```

- [ ] **Step 2: Manual end-to-end check**

Run: `npm start`, open on phone `https://<lan-ip>:3443`, accept cert, grant camera. Tap Start, do a few push-ups (or arm-bend the phone in front of you). Verify: count increments, voice speaks the number, Today tab shows remaining decreasing, Stats tab shows a bar. Tap Stop.

- [ ] **Step 3: Commit**

```bash
git add public/js/app.js
git commit -m "feat: wire up navigation, workout loop, stats and chart"
```

---

## Task 15: README + full test run

**Files:**
- Create: `README.md`

**Interfaces:**
- Produces: instrucțiuni complete de pornire și acceptare certificat pe telefon.

- [ ] **Step 1: Write README.md**

````markdown
# PushUp Counter

Aplicație web locală care numără automat flotările prin camera telefonului și le scade dintr-o țintă zilnică. Rulează 100% local, fără internet.

## Instalare (o singură dată)

```bash
npm install
node scripts/fetch-vendor.mjs   # descarcă MediaPipe + Chart.js + modelul (local)
```

## Pornire

```bash
npm start
```

Serverul afișează adresa, de ex. `https://192.168.1.15:3443`.

## Pe telefon

1. Conectează telefonul la **aceeași rețea Wi-Fi** ca laptopul.
2. Deschide adresa `https://<ip>:3443` în browser.
3. La avertismentul de certificat: **Avansat → Continuă oricum** (certificat local, sigur).
4. Acceptă accesul la **cameră**.
5. Sprijină telefonul lateral (1–2 m), să te vadă din profil.
6. Apasă **Start antrenament** și începe.

## Cum funcționează

- Detecția rulează în telefon (MediaPipe Pose). O flotare = cotul întins → îndoit → întins.
- Numărătoarea se salvează pe laptop în `data/history.json`.
- Vocea numără cu voce tare; tab-ul Statistici arată serii, medii și grafic.

## Reglaje

- Ținta zilnică se schimbă din tab-ul **Azi**.
- Pragurile de unghi (implicit 150°/90°) sunt în `public/js/rep-counter.js`.

## Teste

```bash
npm test
```
````

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all suites pass (day, storage, api, rep-counter, stats) — 0 failures.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and usage"
```

---

## Self-Review Notes

- **Spec coverage:** Server/HTTPS+cert (T5,T6), storage+atomic+per-day goal (T3), API state/reps/goal (T4), rep state machine (T7), stats+streaks (T8), pose detection on phone (T9,T10), voice count (T11), offline buffering/reconnect (T12), 3 screens + chart (T13,T14), wake lock + no-body handling (T14), README cert instructions (T15). All spec sections mapped.
- **Edge cases:** over-goal remaining clamped (T3 test), corrupt file recovery (T3 test), low-visibility frames ignored (T7 test), calendar-gap streak break (T8 test), offline buffering (T12).
- **Type consistency:** `getState`/`addReps`/`setGoal` shapes consistent across T3/T4/T14; `LM` indices defined in T10 used in T14; `computeStats(days, today)` signature consistent T8/T14; `createRepCounter().update({shoulder,elbow,wrist})` consistent T7/T14.
- **Out of scope respected:** no accounts, no other exercises, LAN-only.
