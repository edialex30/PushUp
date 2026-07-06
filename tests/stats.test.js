import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, hourlyStatsByDay, hourlyStatsForDay } from '../public/js/stats.js';

test('empty history yields zeros', () => {
  const s = computeStats([], '2026-07-06');
  assert.deepEqual(s, {
    total: 0, bestDay: 0, average: 0,
    currentStreak: 0, bestStreak: 0, metGoalToday: false,
  });
});

test('totals, best and average', () => {
  const days = [
    { date: '2026-07-04', reps: 100, goal: 100 },
    { date: '2026-07-05', reps: 50, goal: 100 },
    { date: '2026-07-06', reps: 120, goal: 100 },
  ];
  const s = computeStats(days, '2026-07-06');
  assert.equal(s.total, 270);
  assert.equal(s.bestDay, 120);
  assert.equal(s.average, 90);
});

test('current streak counts consecutive met-goal days ending today', () => {
  const days = [
    { date: '2026-07-04', reps: 100, goal: 100 },
    { date: '2026-07-05', reps: 100, goal: 100 },
    { date: '2026-07-06', reps: 100, goal: 100 },
  ];
  assert.equal(computeStats(days, '2026-07-06').currentStreak, 3);
});

test('current streak breaks on a missed day', () => {
  const days = [
    { date: '2026-07-04', reps: 100, goal: 100 },
    { date: '2026-07-05', reps: 40, goal: 100 },
    { date: '2026-07-06', reps: 100, goal: 100 },
  ];
  assert.equal(computeStats(days, '2026-07-06').currentStreak, 1);
});

test('current streak breaks on a calendar gap', () => {
  const days = [
    { date: '2026-07-04', reps: 100, goal: 100 },
    { date: '2026-07-06', reps: 100, goal: 100 }, // missing 07-05
  ];
  assert.equal(computeStats(days, '2026-07-06').currentStreak, 1);
});

test('current streak is zero when today missed', () => {
  const days = [
    { date: '2026-07-05', reps: 100, goal: 100 },
    { date: '2026-07-06', reps: 30, goal: 100 },
  ];
  const s = computeStats(days, '2026-07-06');
  assert.equal(s.currentStreak, 0);
  assert.equal(s.metGoalToday, false);
});

test('best streak finds longest consecutive run', () => {
  const days = [
    { date: '2026-07-01', reps: 100, goal: 100 },
    { date: '2026-07-02', reps: 100, goal: 100 },
    { date: '2026-07-03', reps: 10, goal: 100 },
    { date: '2026-07-04', reps: 100, goal: 100 },
    { date: '2026-07-05', reps: 100, goal: 100 },
    { date: '2026-07-06', reps: 100, goal: 100 },
  ];
  assert.equal(computeStats(days, '2026-07-06').bestStreak, 3);
});

test('hourlyStatsForDay groups workout sessions by hour', () => {
  const day = {
    date: '2026-07-06',
    reps: 25,
    goal: 100,
    sessions: [
      { id: 'a', hour: '08:00', reps: 10 },
      { id: 'b', hour: '18:00', reps: 5 },
      { id: 'c', hour: '18:00', reps: 10 },
    ],
  };

  assert.deepEqual(hourlyStatsForDay(day), [
    { hour: '08:00', reps: 10 },
    { hour: '18:00', reps: 15 },
  ]);
});

test('hourlyStatsForDay preserves legacy daily totals without sessions', () => {
  const day = { date: '2026-07-06', reps: 25, goal: 100 };

  assert.deepEqual(hourlyStatsForDay(day), [
    { hour: 'Total zi', reps: 25 },
  ]);
});

test('hourlyStatsForDay shows manual corrections when daily total exceeds session reps', () => {
  const day = {
    date: '2026-07-06',
    reps: 30,
    goal: 100,
    sessions: [
      { id: 'a', hour: '08:00', reps: 10 },
      { id: 'b', hour: '18:00', reps: 5 },
    ],
  };

  assert.deepEqual(hourlyStatsForDay(day), [
    { hour: '08:00', reps: 10 },
    { hour: '18:00', reps: 5 },
    { hour: 'Corectie', reps: 15 },
  ]);
});

test('hourlyStatsByDay returns hourly rows for every day, newest first', () => {
  const days = [
    {
      date: '2026-07-05',
      reps: 12,
      goal: 100,
      sessions: [
        { id: 'a', hour: '09:00', reps: 5 },
        { id: 'b', hour: '20:00', reps: 7 },
      ],
    },
    {
      date: '2026-07-06',
      reps: 30,
      goal: 100,
      sessions: [
        { id: 'c', hour: '08:00', reps: 10 },
        { id: 'd', hour: '08:00', reps: 15 },
      ],
    },
    {
      date: '2026-07-04',
      reps: 0,
      goal: 100,
      sessions: [],
    },
  ];

  assert.deepEqual(hourlyStatsByDay(days), [
    {
      date: '2026-07-06',
      reps: 30,
      hourly: [
        { hour: '08:00', reps: 25 },
        { hour: 'Corectie', reps: 5 },
      ],
    },
    {
      date: '2026-07-05',
      reps: 12,
      hourly: [
        { hour: '09:00', reps: 5 },
        { hour: '20:00', reps: 7 },
      ],
    },
  ]);
});
