const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

// ── CLI args ──────────────────────────────────────────────────────────
const colorHex = process.argv[2];      // e.g. "#1a3a5c"
const outName = process.argv[3];       // e.g. "fog-navy"
if (!colorHex || !outName) {
  console.error('Usage: node generate-fog-texture.js <hexColor> <outputName>');
  process.exit(1);
}

const color = {
  r: parseInt(colorHex.slice(1, 3), 16),
  g: parseInt(colorHex.slice(3, 5), 16),
  b: parseInt(colorHex.slice(5, 7), 16),
};

// ── Parameters ────────────────────────────────────────────────────────
const SIZE = 1024;            // output PNG dimensions
const PERIOD = 256;           // tile period (power of 2 for bitmask efficiency)
const MIN_ALPHA = 0.18;
const MAX_ALPHA = 0.95;
const SCALE = 2.0;          // overall noise zoom (higher = finer detail)
const ALPHA_POWER = 1.0;    // 1.0 = linear, higher = punchier contrast

// ── Gradient permutation table ────────────────────────────────────────
const permSize = 256;
let perm = new Uint8Array(permSize * 2);
function seedPermutation(seed) {
  const p = new Uint8Array(permSize);
  for (let i = 0; i < permSize; i++) p[i] = i;
  let s = seed;
  for (let i = permSize - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < permSize * 2; i++) perm[i] = p[i & 255];
}
seedPermutation(42);

// ── Gradient vectors ──────────────────────────────────────────────────
const grad2 = [
  [ 1, 1], [-1, 1], [ 1,-1], [-1,-1],
  [ 1, 0], [-1, 0], [ 0, 1], [ 0,-1],
];

// ── Utility ───────────────────────────────────────────────────────────
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + t * (b - a); }
function dot2(g, x, y) { return g[0] * x + g[1] * y; }

// ── Tileable 2D Perlin noise ──────────────────────────────────────────
// Indices wrap using period (bitmask since period is power of 2)
const MASK = PERIOD - 1;

function hash(x, y) {
  return perm[(perm[x & 255] + y) & 255] & 7;
}

function perlinTileable(x, y, px, py) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const left   = (xi & MASK) + px;
  const right  = ((xi + 1) & MASK) + px;
  const bottom = (yi & MASK) + py;
  const top    = ((yi + 1) & MASK) + py;

  const g00 = grad2[hash(left,  bottom)];
  const g10 = grad2[hash(right, bottom)];
  const g11 = grad2[hash(right, top)];
  const g01 = grad2[hash(left,  top)];

  const u = fade(xf);
  const v = fade(yf);

  const n00 = dot2(g00, xf,   yf);
  const n10 = dot2(g10, xf-1, yf);
  const n11 = dot2(g11, xf-1, yf-1);
  const n01 = dot2(g01, xf,   yf-1);

  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
}

// ── FBM with tiling ───────────────────────────────────────────────────
function fbmTileable(x, y) {
  let val = 0, amp = 0.6, freq = 2.5, max = 0;
  for (let i = 0; i < 6; i++) {
    const px = (i * 73 + 17) & MASK;
    const py = (i * 41 + 91) & MASK;
    val += amp * perlinTileable(x * freq, y * freq, px, py);
    max += amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return val / max;
}

// ── Generate ──────────────────────────────────────────────────────────
console.log(`Generating ${SIZE}x${SIZE} fog texture for ${colorHex} → ${outName}.png...`);

const png = new PNG({ width: SIZE, height: SIZE });

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const nx = (x / SIZE) * SCALE;
    const ny = (y / SIZE) * SCALE;
    let n = fbmTileable(nx, ny);
    n = (n + 1) * 0.5;                         // map [-1,1] → [0,1]
    n = Math.pow(n, ALPHA_POWER);               // contrast boost
    n = Math.max(MIN_ALPHA, Math.min(MAX_ALPHA, n));
    const a = Math.floor(n * 255);

    const idx = (y * SIZE + x) * 4;
    png.data[idx]     = color.r;
    png.data[idx + 1] = color.g;
    png.data[idx + 2] = color.b;
    png.data[idx + 3] = a;
  }
}

const outDir = path.join(__dirname, 'assets', 'images');
const outPath = path.join(outDir, `${outName}.png`);
const buf = PNG.sync.write(png);
fs.writeFileSync(outPath, buf);
console.log(`  → ${outPath}  (${(buf.length / 1024).toFixed(0)} KB)`);
