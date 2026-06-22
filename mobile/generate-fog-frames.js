const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const FRAME_SIZE = 1024;
const NUM_FRAMES = 200;
const CIRCLE_RADIUS = 50;
const FOG_COLOR = { r: 26, g: 47, b: 58 };
const MIN_ALPHA = 0.15;
const MAX_ALPHA = 0.85;

const BASE_W = FRAME_SIZE + CIRCLE_RADIUS * 2;
const BASE_H = FRAME_SIZE + CIRCLE_RADIUS * 2;

const perm = new Uint8Array(512);
const grad3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];

function seed(s) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + t * (b - a); }
function dot3(g, x, y) { return g[0]*x + g[1]*y; }

function noise2d(x, y) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);
  const aa = perm[perm[X] + Y] % 12;
  const ab = perm[perm[X] + Y + 1] % 12;
  const ba = perm[perm[X + 1] + Y] % 12;
  const bb = perm[perm[X + 1] + Y + 1] % 12;
  return lerp(
    lerp(dot3(grad3[aa], xf, yf), dot3(grad3[ba], xf - 1, yf), u),
    lerp(dot3(grad3[ab], xf, yf - 1), dot3(grad3[bb], xf - 1, yf - 1), u),
    v
  );
}

function fbm(x, y, octaves = 6) {
  let val = 0, amp = 0.5, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    val += amp * noise2d(x * freq, y * freq);
    max += amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return val / max;
}

seed(42);

console.log(`Generating base noise field ${BASE_W}x${BASE_H}...`);
const scale = 3;
const baseNoise = new Float32Array(BASE_W * BASE_H);
for (let y = 0; y < BASE_H; y++) {
  for (let x = 0; x < BASE_W; x++) {
    const nx = x / FRAME_SIZE * scale;
    const ny = y / FRAME_SIZE * scale;
    let n = fbm(nx, ny, 6);
    n = (n + 1) * 0.5;
    n = Math.pow(n, 1.1);
    n = Math.max(MIN_ALPHA, Math.min(MAX_ALPHA, n));
    baseNoise[y * BASE_W + x] = n;
  }
}

const outputDir = path.join(__dirname, 'assets', 'images');

for (let f = 0; f < NUM_FRAMES; f++) {
  const angle = (2 * Math.PI * f) / NUM_FRAMES;
  const offsetX = Math.round(CIRCLE_RADIUS * Math.sin(angle)) + CIRCLE_RADIUS;
  const offsetY = Math.round(CIRCLE_RADIUS * Math.cos(angle)) + CIRCLE_RADIUS;

  const png = new PNG({ width: FRAME_SIZE, height: FRAME_SIZE });

  for (let y = 0; y < FRAME_SIZE; y++) {
    for (let x = 0; x < FRAME_SIZE; x++) {
      const alpha = baseNoise[(y + offsetY) * BASE_W + (x + offsetX)];
      const a = Math.max(0, Math.min(255, Math.floor(alpha * 255)));
      const idx = (y * FRAME_SIZE + x) * 4;
      png.data[idx] = FOG_COLOR.r;
      png.data[idx + 1] = FOG_COLOR.g;
      png.data[idx + 2] = FOG_COLOR.b;
      png.data[idx + 3] = a;
    }
  }

  const outPath = path.join(outputDir, `fog-${String(f).padStart(3, '0')}.png`);
  const buf = PNG.sync.write(png);
  fs.writeFileSync(outPath, buf);
  
  if (f % 20 === 0) console.log(`  Frame ${f}/${NUM_FRAMES - 1}...`);
}

console.log(`Generated ${NUM_FRAMES} frames (${FRAME_SIZE}x${FRAME_SIZE}) - circular motion, seamless loop`);
