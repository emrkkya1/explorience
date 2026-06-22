export function createBitmap(width: number, height: number): Uint8Array {
  return new Uint8Array(width * height);
}

export function applyDeltas(bitmap: Uint8Array, deltas: number[], value: number = 1): void {
  for (const index of deltas) {
    if (index >= 0 && index < bitmap.length) {
      bitmap[index] = value;
    }
  }
}

export function compressRLE(bitmap: Uint8Array): number[] {
  if (bitmap.length === 0) return [];
  
  const rle: number[] = [];
  let count = 1;
  let current = bitmap[0];
  
  for (let i = 1; i < bitmap.length; i++) {
    if (bitmap[i] === current) {
      count++;
    } else {
      rle.push(count, current);
      current = bitmap[i];
      count = 1;
    }
  }
  rle.push(count, current);
  return rle;
}

export function decompressRLE(rle: number[], size: number): Uint8Array {
  const bitmap = new Uint8Array(size);
  let idx = 0;
  
  for (let i = 0; i < rle.length; i += 2) {
    const count = rle[i];
    const value = rle[i + 1];
    for (let j = 0; j < count; j++) {
      if (idx < size) bitmap[idx++] = value;
    }
  }
  return bitmap;
}
