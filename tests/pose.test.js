import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPoseTracker } from '../public/js/pose.js';

test('close stops the tracker and releases the landmarker', async () => {
  let closed = false;
  let frames = 0;
  const tracker = await createPoseTracker({
    video: { readyState: 0 },
    onLandmarks() {},
    filesetResolver: { forVisionTasks: async () => ({}) },
    poseLandmarker: {
      createFromOptions: async () => ({
        detectForVideo() {
          return { landmarks: [] };
        },
        close() {
          closed = true;
        },
      }),
    },
    requestFrame(callback) {
      frames += 1;
      return frames === 1 ? callback() : undefined;
    },
  });

  tracker.start();
  tracker.close();

  assert.equal(closed, true);
});
