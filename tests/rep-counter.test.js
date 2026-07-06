import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elbowAngle, createRepCounter } from '../public/js/rep-counter.js';

const V = 1; // full visibility
const pt = (x, y) => ({ x, y, visibility: V });

test('elbowAngle is ~180 for a straight arm', () => {
  const a = elbowAngle(pt(0, 0), pt(1, 0), pt(2, 0));
  assert.ok(Math.abs(a - 180) < 1, `got ${a}`);
});

test('elbowAngle is ~90 for a right angle', () => {
  const a = elbowAngle(pt(0, 1), pt(0, 0), pt(1, 0));
  assert.ok(Math.abs(a - 90) < 1, `got ${a}`);
});

function feed(counter, angle) {
  // build shoulder/elbow/wrist producing the given elbow angle
  const rad = (angle * Math.PI) / 180;
  const shoulder = pt(0, 1);
  const elbow = pt(0, 0);
  const wrist = pt(Math.sin(rad), Math.cos(rad));
  return counter.update({ shoulder, elbow, wrist });
}

test('counts one rep on down then up', () => {
  const c = createRepCounter();
  feed(c, 170); // up
  feed(c, 80);  // down
  const r = feed(c, 165); // back up -> count
  assert.equal(r.counted, true);
  assert.equal(r.total, 1);
});

test('does not count a partial (never reaching down)', () => {
  const c = createRepCounter();
  feed(c, 170);
  feed(c, 120); // not below downAngle
  const r = feed(c, 165);
  assert.equal(r.counted, false);
  assert.equal(r.total, 0);
});

test('counts multiple reps', () => {
  const c = createRepCounter();
  feed(c, 170);
  for (let i = 0; i < 3; i++) { feed(c, 80); feed(c, 165); }
  assert.equal(c.total, 3);
});

test('ignores low-visibility frames', () => {
  const c = createRepCounter();
  feed(c, 170);
  const lowVis = { shoulder: { x: 0, y: 1, visibility: 0.1 }, elbow: pt(0, 0), wrist: pt(1, 0) };
  const r = c.update(lowVis);
  assert.equal(r.state, 'unknown');
  assert.equal(r.counted, false);
});

test('reset clears total', () => {
  const c = createRepCounter();
  feed(c, 170); feed(c, 80); feed(c, 165);
  c.reset();
  assert.equal(c.total, 0);
});
