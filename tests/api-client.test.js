import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../public/js/api-client.js';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function jsonResponse(body, ok = true, status = 200) {
  return {
    ok,
    status,
    async json() {
      return body;
    },
  };
}

test('getState reads /api/state', async () => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return jsonResponse({ goal: 100 });
  };

  const api = createApiClient();
  assert.deepEqual(await api.getState(), { goal: 100 });
  assert.deepEqual(calls, [{ url: '/api/state', options: undefined }]);
});

test('setGoal sends a PUT request with JSON body', async () => {
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return jsonResponse({ goal: 75 });
  };

  const api = createApiClient();
  assert.deepEqual(await api.setGoal(75), { goal: 75 });
  assert.equal(request.url, '/api/goal');
  assert.equal(request.options.method, 'PUT');
  assert.equal(request.options.body, JSON.stringify({ goal: 75 }));
});

test('sendReps buffers failed reps and flushes them with the next successful send', async () => {
  const bodies = [];
  let attempt = 0;
  global.fetch = async (url, options) => {
    assert.equal(url, '/api/reps');
    attempt += 1;
    bodies.push(JSON.parse(options.body));
    if (attempt === 1) throw new Error('offline');
    return jsonResponse({ today: { reps: 3 } });
  };

  const api = createApiClient();
  assert.equal(await api.sendReps(1), null);
  assert.deepEqual(await api.sendReps(2), { today: { reps: 3 } });
  assert.deepEqual(bodies, [{ count: 1 }, { count: 3 }]);
});
