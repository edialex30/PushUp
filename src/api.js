import express from 'express';
import { localDateString } from './day.js';

function isPositiveInt(n) {
  return Number.isInteger(n) && n >= 1;
}

export function createApiRouter({ store, now = () => new Date() }) {
  const router = express.Router();

  router.get('/state', (req, res) => {
    res.json(store.getState(localDateString(now())));
  });

  router.post('/reps', (req, res) => {
    const { count } = req.body || {};
    if (!isPositiveInt(count)) {
      return res.status(400).json({ error: 'count must be an integer >= 1' });
    }
    res.json(store.addReps(localDateString(now()), count));
  });

  router.put('/goal', (req, res) => {
    const { goal } = req.body || {};
    if (!isPositiveInt(goal)) {
      return res.status(400).json({ error: 'goal must be an integer >= 1' });
    }
    res.json(store.setGoal(goal));
  });

  return router;
}
