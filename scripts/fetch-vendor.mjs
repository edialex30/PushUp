import { mkdirSync, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { dirname } from 'node:path';

const files = [
  ['https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js',
   'public/vendor/chart.umd.min.js'],
  ['https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/vision_bundle.mjs',
   'public/vendor/vision_bundle.mjs'],
  ['https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm/vision_wasm_internal.js',
   'public/vendor/wasm/vision_wasm_internal.js'],
  ['https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm/vision_wasm_internal.wasm',
   'public/vendor/wasm/vision_wasm_internal.wasm'],
  ['https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm/vision_wasm_nosimd_internal.js',
   'public/vendor/wasm/vision_wasm_nosimd_internal.js'],
  ['https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm/vision_wasm_nosimd_internal.wasm',
   'public/vendor/wasm/vision_wasm_nosimd_internal.wasm'],
  ['https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
   'public/vendor/pose_landmarker_lite.task'],
];

for (const [url, dest] of files) {
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  console.log('saved', dest);
}
console.log('vendor assets ready');
