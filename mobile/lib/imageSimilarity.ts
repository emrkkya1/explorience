import UPNG from 'upng-js';

export type SimilarityResult = {
  structureSimilarity: number;
  colorSimilarity: number;
};

type DecodedImage = {
  width: number;
  height: number;
  data: Uint8Array;
};

const DHASH_SIZE = 8;
const HIST_SIZE = 32;
const H_BINS = 8;
const S_BINS = 8;

export function decodePng(bytes: Uint8Array): DecodedImage {
  const png = UPNG.decode(bytes);
  const frames = UPNG.toRGBA8(png);
  if (frames.length === 0) {
    throw new Error('PNG has no frames');
  }
  return {
    width: png.width,
    height: png.height,
    data: new Uint8Array(frames[0]),
  };
}

function readGray(rgba: Uint8Array, idx: number): number {
  const r = rgba[idx];
  const g = rgba[idx + 1];
  const b = rgba[idx + 2];
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function downscaleToGray(
  img: DecodedImage,
  targetW: number,
  targetH: number
): Float32Array {
  const out = new Float32Array(targetW * targetH);
  const xRatio = img.width / targetW;
  const yRatio = img.height / targetH;
  for (let y = 0; y < targetH; y++) {
    const srcY0 = Math.floor(y * yRatio);
    const srcY1 = Math.max(srcY0 + 1, Math.floor((y + 1) * yRatio));
    for (let x = 0; x < targetW; x++) {
      const srcX0 = Math.floor(x * xRatio);
      const srcX1 = Math.max(srcX0 + 1, Math.floor((x + 1) * xRatio));
      let sum = 0;
      let count = 0;
      for (let sy = srcY0; sy < srcY1; sy++) {
        for (let sx = srcX0; sx < srcX1; sx++) {
          sum += readGray(img.data, (sy * img.width + sx) * 4);
          count += 1;
        }
      }
      out[y * targetW + x] = count > 0 ? sum / count : sum;
    }
  }
  return out;
}

function dHash(gray: Float32Array, w: number, h: number): Uint8Array {
  const hash = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w - 1; x++) {
      const left = gray[y * w + x];
      const right = gray[y * w + (x + 1)];
      hash[y * w + x] = left > right ? 1 : 0;
    }
  }
  return hash;
}

function hammingDistance(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  let dist = 0;
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) dist += 1;
  }
  return dist;
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rf) {
      h = (((gf - bf) / delta) % 6);
    } else if (max === gf) {
      h = (bf - rf) / delta + 2;
    } else {
      h = (rf - gf) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return [h, s, v];
}

function downscaleToRgba(img: DecodedImage, size: number): DecodedImage {
  const out = new Uint8Array(size * size * 4);
  const xRatio = img.width / size;
  const yRatio = img.height / size;
  for (let y = 0; y < size; y++) {
    const srcY = Math.min(img.height - 1, Math.floor(y * yRatio));
    for (let x = 0; x < size; x++) {
      const srcX = Math.min(img.width - 1, Math.floor(x * xRatio));
      const srcIdx = (srcY * img.width + srcX) * 4;
      const dstIdx = (y * size + x) * 4;
      out[dstIdx] = img.data[srcIdx];
      out[dstIdx + 1] = img.data[srcIdx + 1];
      out[dstIdx + 2] = img.data[srcIdx + 2];
      out[dstIdx + 3] = img.data[srcIdx + 3];
    }
  }
  return { width: size, height: size, data: out };
}

function hsvHistogram(img: DecodedImage): Float32Array {
  const scaled = downscaleToRgba(img, HIST_SIZE);
  const hist = new Float32Array(H_BINS * S_BINS);
  for (let i = 0; i < HIST_SIZE * HIST_SIZE; i++) {
    const idx = i * 4;
    const r = scaled.data[idx];
    const g = scaled.data[idx + 1];
    const b = scaled.data[idx + 2];
    const [_h, s, _v] = rgbToHsv(r, g, b);
    const hBin = Math.floor(_h / (360 / H_BINS)) % H_BINS;
    const sBin = Math.min(S_BINS - 1, Math.floor(s * S_BINS));
    hist[hBin * S_BINS + sBin] += 1;
  }
  const total = HIST_SIZE * HIST_SIZE;
  for (let i = 0; i < hist.length; i++) {
    hist[i] /= total;
  }
  return hist;
}

function chiSquaredDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const denom = a[i] + b[i];
    if (denom > 0) {
      const diff = a[i] - b[i];
      sum += (diff * diff) / denom;
    }
  }
  return sum;
}

export function computeSimilarity(
  imageBytesA: Uint8Array,
  imageBytesB: Uint8Array
): SimilarityResult {
  const imgA = decodePng(imageBytesA);
  const imgB = decodePng(imageBytesB);

  const grayA = downscaleToGray(imgA, DHASH_SIZE + 1, DHASH_SIZE);
  const grayB = downscaleToGray(imgB, DHASH_SIZE + 1, DHASH_SIZE);
  const hashA = dHash(grayA, DHASH_SIZE + 1, DHASH_SIZE);
  const hashB = dHash(grayB, DHASH_SIZE + 1, DHASH_SIZE);
  const bits = DHASH_SIZE * DHASH_SIZE;
  const hamming = hammingDistance(hashA, hashB);
  const structureSimilarity = 1 - hamming / bits;

  const histA = hsvHistogram(imgA);
  const histB = hsvHistogram(imgB);
  const chiSq = chiSquaredDistance(histA, histB);
  const colorSimilarity = Math.max(0, 1 - chiSq);

  return {
    structureSimilarity,
    colorSimilarity,
  };
}