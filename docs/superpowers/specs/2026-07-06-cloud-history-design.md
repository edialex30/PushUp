# Cloud History Design

## Goal

The app should be usable from a phone anywhere, without the laptop running, while keeping all workout history and statistics in cloud storage. GitHub Pages continues to host the static app. Supabase provides authentication and persistent storage.

The first version is for one owner account, but it should still use normal Supabase Auth and Row Level Security so the data is private and protected.

## Current State

The app currently stores all durable data in `localStorage` under `pushup-counter-state-v1`. That data includes:

- daily goal
- selected camera mode
- per-camera calibration snapshots
- day history
- workout sessions per day

This works on one browser, but it is not durable across browser data deletion, device changes, or private browsing.

## Recommended Approach

Use Supabase Auth plus one cloud state row per authenticated user.

The app will store the same normalized state shape it already uses as one JSON document in Supabase. This keeps the change focused and avoids rewriting the existing statistics and workout logic. The state can be normalized on every read/write using the existing local-store rules.

Supabase project:

- Project ref: `pkpqafyfwpoykniusghx`
- URL: `https://pkpqafyfwpoykniusghx.supabase.co`
- Frontend uses the public anon key, with security enforced by Supabase Auth and RLS.

## Data Model

Create a `pushup_states` table:

```sql
create table public.pushup_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.pushup_states enable row level security;

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

The `state` JSON will use the app's versioned local data shape:

```json
{
  "version": 3,
  "goal": 100,
  "cameraMode": "user",
  "calibrations": {
    "user": null,
    "environment": null
  },
  "days": []
}
```

## Authentication UX

When the app starts:

1. Initialize the Supabase client.
2. Check whether there is an active session.
3. If no session exists, show a login screen before the main app.
4. After login, keep the session in the browser so daily use does not require logging in again.

The initial login method will be email and password. Supabase will persist the session locally. The user only needs to log in again after signing out, changing browser/device, clearing browser site data, or if the session expires.

The app should show a compact account/status area with:

- signed-in email
- sync status
- sign out button

## Store Abstraction

Add a cloud-backed store with the same public methods used by `app.js` today:

- `getState()`
- `startSession()`
- `finishSession(sessionId)`
- `addReps(count, { sessionId })`
- `setTodayReps(reps)`
- `setGoal(goal)`
- `setCameraMode(cameraMode)`
- `setCalibration(calibration)`

The store should:

- load from Supabase after login
- normalize the state shape before rendering
- save the full state JSON after each mutation
- keep a local cached copy for fast startup and temporary offline tolerance
- expose sync state so the UI can show whether the latest change is saved

The existing `local-store.js` can be refactored into reusable pure state helpers so local and cloud stores share the same normalization and mutation behavior.

## Migration From Phone Local Data

After login, the app should check for existing local data.

If cloud state does not exist:

- upload the local state automatically
- keep the local cache in place
- show the app normally

If both local and cloud state exist:

- choose cloud state as source of truth by default
- preserve local cache as fallback
- avoid merging automatically in the first version, because duplicate sessions or manual corrections could create wrong totals

This is acceptable because the target user is one person and the first cloud setup will likely happen from the same phone that already has the current local history.

## Sync Behavior

Reads:

- On login, fetch the state row from Supabase.
- If no row exists, create one from local cached data or default data.
- If fetch fails but local cached data exists, render from local cache and show an offline/sync warning.

Writes:

- Mutate state locally first so the UI stays responsive.
- Save the full state JSON to Supabase with upsert.
- Update local cache after successful mutation.
- If save fails, keep the local state and mark sync as pending/failed.

The first version does not need a complex background queue. It should retry the next time the app starts or the next time a mutation happens.

## Statistics

Statistics remain client-side. Existing functions in `public/js/stats.js` continue to compute totals, averages, streaks, and hourly breakdowns from `state.days`.

This keeps the first cloud version small and avoids duplicating statistics logic in SQL.

## Error Handling

The UI should handle these states clearly:

- loading session
- signed out
- signing in
- loading cloud data
- sync saved
- sync pending
- sync failed

Camera and pose detection should remain independent from sync. If camera detection fails, cloud history and manual updates should still work.

## Security

The Supabase anon key may be included in frontend code because it is public by design. It must never be confused with the Supabase service role key.

Security depends on:

- Supabase Auth identifying the current user
- Row Level Security on `pushup_states`
- policies allowing each user to read/write only `user_id = auth.uid()`

No service role key should be committed or exposed in the browser.

## Testing Plan

Automated tests should cover:

- state normalization remains compatible with existing local data
- cloud store creates default state when no cloud row exists
- cloud store uploads existing local state when cloud state is missing
- mutations call upsert with the normalized full state
- failed cloud writes keep usable local state and expose failed sync status
- app shows login UI when signed out
- app uses the authenticated cloud state after sign-in

Manual verification should cover:

- first login on phone
- data migration from existing local history
- changing goal persists after reload
- adding reps persists after reload
- statistics persist after reload
- sign out and sign back in restores cloud history
- app still hosts from GitHub Pages without the laptop running

## Non-Goals For First Version

- multi-user sharing
- admin dashboards
- SQL-level statistics
- automatic conflict merging across multiple active devices
- exporting data to CSV
- native mobile app packaging

## Rollout

1. Create Supabase table and RLS policies.
2. Add frontend Supabase config and client.
3. Add login screen and session handling.
4. Extract reusable state helpers from `local-store.js`.
5. Add cloud store with local cache fallback.
6. Wire `app.js` to wait for authenticated cloud store initialization.
7. Add migration behavior.
8. Test locally and on GitHub Pages.

