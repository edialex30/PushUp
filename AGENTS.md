<!-- CZY_AGENT_INSTRUCTIONS_START -->
## CZY Agent Behavior

- When the user sends only one or more folder/file references such as `@Claude_Projects`, `@youtube`, or `@desktop`, do not ask what they want to do.
- For folder references, list the immediate contents of each referenced folder and stop.
- For file references, summarize the file briefly and stop.
- After listing or summarizing a reference-only message, wait for the user's next instruction.
- Do not offer numbered follow-up questions for reference-only messages.

## CZY Canvas Control

You are running inside CZY, an infinite-canvas agent environment. The `czy`
CLI (already on PATH) controls the canvas you are part of:

- `czy agents` — list all agents and their status; `czy whoami` — your own node.
- `czy prompt <name> "text"` — send a prompt to another agent.
- `czy spawn --cli codex --prompt "..."` — create a new agent and hand it work.
- `czy task list` / `czy task create <title> --assign <name>` / `czy task done <id>` — shared task board.
- `czy note "text"` — leave a note on the canvas for the user.

Use these only when a task requires coordinating with other agents. Do not
spawn agents unless the task genuinely needs them.

## CZY Shared Memory

All agents on this canvas share a memory. Your task prompt may end with a
"Shared memory index" — one line per entry.

- `czy memory get <name>` — read a full entry when the index looks relevant.
- `czy memory add "<content>" --description "<one line>" --type lesson` —
  save a discovered project rule or convention.
- Use `--type handoff` to describe the state of unfinished work before you
  stop, so the next agent can continue without rediscovering everything.
- Do not re-add facts already in the index; adding with the same --name
  overwrites (use it to correct an entry).
<!-- CZY_AGENT_INSTRUCTIONS_END -->

## Deployment — ALWAYS auto-update the phone

This app is hosted on **GitHub Pages** (workflow `.github/workflows/pages.yml`,
which publishes `public/` on every push to `main`). Supabase is only for
login + history, NOT hosting. The user runs the app on their phone and wants
it to update itself automatically, like an app that self-updates.

So **every time you change anything under `public/` (JS/CSS/HTML), you MUST,
without being asked:**

1. Bump the cache-bust query string `?v=...` in `public/index.html` for the
   changed assets (`app.js`, `style.css`) AND the matching import inside
   `app.js` (e.g. `./stats.js?v=<same-version>`). The browser caches by URL,
   so an unchanged `?v=` means the phone keeps serving the OLD file even after
   deploy. Also update the test in `tests/calibration-ui.test.js` that pins
   the version string.
2. `npm test` and make sure it passes.
3. Commit, then **`git push origin main`** — this is what triggers the Pages
   deploy. A local commit alone does nothing for the phone.
4. Optionally confirm the deploy with `gh run list --workflow=pages.yml`.

Do not stop at "committed" — the change is not live on the phone until it is
pushed to `main` and the Pages workflow finishes (~1 min). After that the user
just reloads the page (the new `?v=` makes it fetch fresh files).

The app is a PWA: `public/sw.js` is a **network-first** service worker so the
installed home-screen app always loads the latest deploy when online (offline
fallback to cache) and auto-reloads when a new worker takes control. So a
plain push-to-main is enough for the phone to self-update — no manual steps.
If you ever need to force-purge old caches, bump `CACHE_VERSION` in `sw.js`.
