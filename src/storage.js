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
