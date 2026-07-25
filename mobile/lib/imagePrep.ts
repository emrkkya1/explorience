import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_DIMENSION = 512;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToBytes(b64: string, byteLength: number): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const out = new Uint8Array(byteLength);
  let bit = 0;
  let accum = 0;
  let outIdx = 0;
  for (let i = 0; i < clean.length; i++) {
    const c = clean.charAt(i);
    if (c === '=') break;
    const val = B64.indexOf(c);
    if (val < 0) continue;
    accum = (accum << 6) | val;
    bit += 6;
    if (bit >= 8) {
      bit -= 8;
      if (outIdx < byteLength) {
        out[outIdx++] = (accum >> bit) & 0xff;
      }
    }
  }
  return out;
}

export type PreparedImage = {
  uri: string;
  base64: string;
  bytes: Uint8Array;
};

// Prepare a remote or local image uri: download (if remote), resize to <=512px
// max dimension, re-save as PNG, return uri + base64 + Uint8Array bytes for the
// image-similarity algorithm.
export async function prepareImage(inputUri: string): Promise<PreparedImage> {
  let localUri = inputUri;
  if (inputUri.startsWith('http://') || inputUri.startsWith('https://')) {
    const downloadDest = `${FileSystem.cacheDirectory}explore_ref_${Date.now()}.jpg`;
    const downloadRes = await FileSystem.downloadAsync(inputUri, downloadDest);
    localUri = downloadRes.uri;
  }

  const context = ImageManipulator.manipulate(localUri);
  context.resize({ width: MAX_DIMENSION, height: MAX_DIMENSION });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    format: SaveFormat.PNG,
    compress: 0.9,
  });

  const base64 = await FileSystem.readAsStringAsync(saved.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const info = await FileSystem.getInfoAsync(saved.uri, { size: true });
  const byteLength =
    info.exists && typeof info.size === 'number'
      ? info.size
      : Math.floor((base64.replace(/=/g, '').length * 3) / 4);
  const bytes = base64ToBytes(base64, byteLength);

  return { uri: saved.uri, base64, bytes };
}