# Front Camera Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add phone-front calibration so push-ups are counted from user examples, with front camera default and English voice counting.

**Architecture:** Store calibration snapshots in `localStorage`, extract simple pose features from front-facing landmarks, and count reps by comparing live features to calibrated up/down states. Keep all logic in pure modules with node:test coverage.

**Tech Stack:** Vanilla JS ES modules, MediaPipe landmarks, localStorage, node:test.

---

## Tasks

- [ ] Add calibration persistence and front-camera default to `local-store.js`.
- [ ] Add English number text to `voice.js`.
- [ ] Add pure calibrated counter module and tests.
- [ ] Add UI buttons and wire calibration/counting in `app.js`.
- [ ] Run tests, publish to GitHub Pages root site.
