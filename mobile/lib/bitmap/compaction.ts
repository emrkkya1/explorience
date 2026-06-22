import { supabase } from '@/lib/supabase';
import { createBitmap, applyDeltas, decompressRLE } from './core';

export async function loadAndMergeBitmap(gameId: string, gridWidth: number, gridHeight: number): Promise<Uint8Array> {
  console.log('[Bitmap] Loading bitmap for game:', gameId);

  const { data: areaData, error: areaError } = await supabase
    .from('explored_areas')
    .select('bitmap, last_compacted_at')
    .eq('game_id', gameId)
    .maybeSingle();

  if (areaError) {
    console.error('[Bitmap] Error loading explored_areas:', areaError);
  }

  const bitmap = createBitmap(gridWidth, gridHeight);

  if (areaData?.bitmap) {
    try {
      console.log('[Bitmap] Bitmap data type:', typeof areaData.bitmap);

      // JSONB columns return parsed arrays directly
      const rle = areaData.bitmap;
      console.log('[Bitmap] RLE array length:', rle.length);

      if (rle.length === 0) {
        console.warn('[Bitmap] Empty RLE array, using empty bitmap');
      } else {
        const decompressed = decompressRLE(rle, gridWidth * gridHeight);
        console.log('[Bitmap] Decompressed bitmap length:', decompressed.length);
        
        // Count explored cells and log first few bytes
        let exploredCount = 0;
        for (let i = 0; i < Math.min(100, decompressed.length); i++) {
          if (decompressed[i] === 1) exploredCount++;
        }
        console.log('[Bitmap] First 100 bytes explored count:', exploredCount);
        console.log('[Bitmap] First 20 bytes:', Array.from(decompressed.slice(0, 20)));
        
        bitmap.set(decompressed);
      }
    } catch (error) {
      console.error('[Bitmap] Error parsing bitmap:', error);
    }
  } else {
    console.log('[Bitmap] No bitmap found, using empty bitmap');
  }

  const lastCompacted = areaData?.last_compacted_at || new Date(0).toISOString();
  const { data: deltaData, error: deltaError } = await supabase
    .from('fog_deltas')
    .select('deltas')
    .eq('game_id', gameId)
    .gte('created_at', lastCompacted);

  if (deltaError) {
    console.error('[Bitmap] Error loading deltas:', deltaError);
  }

  if (deltaData) {
    console.log('[Bitmap] Found', deltaData.length, 'delta records');
    for (const row of deltaData) {
      applyDeltas(bitmap, row.deltas);
    }
  }

  return bitmap;
}
