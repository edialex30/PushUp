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

  function currentState() {
    return stateFromData(data, date());
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
