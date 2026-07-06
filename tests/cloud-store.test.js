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
