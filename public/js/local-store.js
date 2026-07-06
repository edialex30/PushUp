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
