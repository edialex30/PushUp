# Front Camera Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add phone-front calibration so push-ups are counted from user examples, with front camera default, English voice counting, and hands-free auto calibration.

**Architecture:** Store calibration snapshots in `localStorage`, extract simple pose features from front-facing landmarks, and count reps by comparing live features to calibrated up/down states. Add a pure auto-calibration sequence module that owns countdown/capture order, then wire it into the UI.

**Tech Stack:** Vanilla JS ES modules, MediaPipe landmarks, localStorage, node:test.

---

## Tasks

- [x] Add calibration persistence and front-camera default to `local-store.js`.
- [x] Add English number text to `voice.js`.
- [x] Add pure calibrated counter module and tests.
- [x] Add pure auto-calibration flow and tests.
- [x] Replace manual calibration buttons with one auto-calibration button in `index.html`.
- [x] Wire auto calibration in `app.js` and pause rep counting during calibration.
- [ ] Run tests, publish to GitHub Pages root site.
