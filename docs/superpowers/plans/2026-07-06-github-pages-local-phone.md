# GitHub Pages Local Phone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the app to run from GitHub Pages using phone-local storage, with manual rep correction and selectable front/back camera.

**Architecture:** Replace API-backed frontend state with a browser-local store module over `localStorage`. Keep the server only as an optional local static/API dev server; the published app uses static files only. Wire the UI controls to the local store and pass the saved camera mode into `getUserMedia`.

**Tech Stack:** Vanilla JS ES modules, browser `localStorage`, MediaPipe Tasks Vision, Chart.js, node:test.

---

## File Structure

- `public/js/local-store.js` - browser-local persistence and state shape compatible with the existing app.
- `tests/local-store.test.js` - tests local storage behavior with an in-memory fake.
- `public/js/app.js` - switch from API client to local store, add manual reps and camera mode handling.
- `public/index.html` - add manual rep edit form and camera selector.
- `public/css/style.css` - style new controls.
- `README.md` - document GitHub Pages use and local-only data.

## Task 1: Local Store Module

- [ ] Write failing tests for default state, adding reps, editing today reps, goal update, camera mode persistence.
- [ ] Run `node --test tests/local-store.test.js` and verify missing module failure.
- [ ] Implement `createLocalStore({ storage, today })` in `public/js/local-store.js`.
- [ ] Run `node --test tests/local-store.test.js` and verify pass.
- [ ] Commit local store.

## Task 2: UI Markup And Styles

- [ ] Add `#manual-reps-form`, `#manual-reps-input`, `#camera-mode` to `public/index.html`.
- [ ] Add compact form styles in `public/css/style.css`.
- [ ] Run `node --check public/js/app.js` and `npm test`.
- [ ] Commit UI controls.

## Task 3: App Wiring

- [ ] Replace `createApiClient` usage in `public/js/app.js` with `createLocalStore`.
- [ ] On rep counted, call `store.addReps(1)` and render updated state.
- [ ] On manual rep submit, call `store.setTodayReps(count)`.
- [ ] On camera selector change, call `store.setCameraMode(mode)` and use that mode in `getUserMedia`.
- [ ] Run `npm test` and `node --check public/js/app.js public/js/local-store.js`.
- [ ] Commit app wiring.

## Task 4: README And Final Verification

- [ ] Update README for GitHub Pages/static use.
- [ ] Run `npm test`.
- [ ] Run `node --check public/js/app.js public/js/local-store.js public/js/pose.js public/js/voice.js`.
- [ ] Commit README.
