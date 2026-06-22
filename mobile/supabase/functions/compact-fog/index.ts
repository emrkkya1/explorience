import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CELL_SIZE = 0.0001;

function createBitmap(width: number, height: number): Uint8Array {
  return new Uint8Array(width * height);
}

function applyDeltas(bitmap: Uint8Array, deltas: number[]): void {
  for (const index of deltas) {
    if (index >= 0 && index < bitmap.length) {
      bitmap[index] = 1;
    }
  }
}

function compressRLE(bitmap: Uint8Array): number[] {
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

function decompressRLE(rle: number[], size: number): Uint8Array {
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

async function compactGame(supabase: any, gameId: string, cutoffTime: string): Promise<void> {
  // Look up city bounds to compute grid dimensions
  const { data: gameData, error: gameError } = await supabase
    .from('games')
    .select('city_id')
    .eq('id', gameId)
    .single();

  if (gameError || !gameData) {
    console.error(`Error loading game ${gameId} for compaction:`, gameError);
    return;
  }

  const { data: cityData, error: cityError } = await supabase
    .from('cities')
    .select('north, west, grid_width, grid_height')
    .eq('id', gameData.city_id)
    .single();

  if (cityError || !cityData) {
    console.error(`Error loading city ${gameData.city_id} for compaction:`, cityError);
    return;
  }

  const gridWidth: number = cityData.grid_width;
  const gridHeight: number = cityData.grid_height;

  // Load current bitmap
  const { data: areaData, error: areaError } = await supabase
    .from('explored_areas')
    .select('bitmap, last_compacted_at')
    .eq('game_id', gameId)
    .maybeSingle();

  if (areaError) {
    console.error(`Error loading explored_areas for game ${gameId}:`, areaError);
  }

  const bitmap = createBitmap(gridWidth, gridHeight);
  
  if (areaData?.bitmap) {
    try {
      console.log(`[Compact] Bitmap data type: ${typeof areaData.bitmap}`);
      
      // JSONB columns return parsed arrays directly
      const rle = areaData.bitmap;
      console.log(`[Compact] RLE array length: ${rle.length}`);
      
      if (rle.length === 0) {
        console.warn(`[Compact] Empty RLE array for game ${gameId}`);
      } else {
        const decompressed = decompressRLE(rle, gridWidth * gridHeight);
        console.log(`[Compact] Decompressed bitmap length: ${decompressed.length}`);
        bitmap.set(decompressed);
      }
    } catch (error) {
      console.error(`[Compact] Error parsing bitmap for game ${gameId}:`, error);
    }
  } else {
    console.log(`[Compact] No bitmap found for game ${gameId}`);
  }

  // Load all deltas up to cutoff time
  const { data: deltaData, error: deltaError } = await supabase
    .from('fog_deltas')
    .select('deltas')
    .eq('game_id', gameId)
    .lte('created_at', cutoffTime);

  if (deltaError) {
    console.error(`Error loading deltas for game ${gameId}:`, deltaError);
    return;
  }

  if (!deltaData || deltaData.length === 0) return;

  // Apply deltas
  for (const row of deltaData) {
    applyDeltas(bitmap, row.deltas);
  }

  // Compress and save
  const rle = compressRLE(bitmap);
  
  console.log(`[Compact] RLE length: ${rle.length}`);
  console.log(`[Compact] RLE values (first 20):`, rle.slice(0, 20));
  
  // Count explored cells for verification
  let exploredCount = 0;
  for (let i = 0; i < bitmap.length; i++) {
    if (bitmap[i] === 1) exploredCount++;
  }
  console.log(`[Compact] Total explored cells: ${exploredCount}`);

  if (areaData) {
    const { error: updateError } = await supabase
      .from('explored_areas')
      .update({
        bitmap: rle,
        last_compacted_at: new Date().toISOString(),
      })
      .eq('game_id', gameId);
    
    if (updateError) {
      console.error(`Error updating bitmap for game ${gameId}:`, updateError);
      return;
    }
  } else {
    const { error: insertError } = await supabase
      .from('explored_areas')
      .insert({
        game_id: gameId,
        bitmap: rle,
        last_compacted_at: new Date().toISOString(),
      });
    
    if (insertError) {
      console.error(`Error inserting bitmap for game ${gameId}:`, insertError);
      return;
    }
  }

  // Delete only the deltas we just processed (up to cutoff time)
  const { error: deleteError } = await supabase
    .from('fog_deltas')
    .delete()
    .eq('game_id', gameId)
    .lte('created_at', cutoffTime);

  if (deleteError) {
    console.error(`Error deleting deltas for game ${gameId}:`, deleteError);
  }
}

Deno.serve(async (req) => {
  try {
    // Initialize Supabase client inside the handler
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 
                       JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').service_role;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing env vars',
          available: Object.keys(Deno.env.toObject())
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use cutoff timestamp: now minus 1 second buffer
    // This ensures we don't delete deltas that were just written
    const cutoffTime = new Date(Date.now() - 1000).toISOString();
    
    // Find all games with deltas up to cutoff time
    const { data: gamesWithDeltas, error } = await supabase
      .from('fog_deltas')
      .select('game_id')
      .lte('created_at', cutoffTime);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const uniqueGameIds = [...new Set(gamesWithDeltas?.map((g) => g.game_id) || [])];
    
    console.log(`Compacting ${uniqueGameIds.length} games (cutoff: ${cutoffTime})`);

    for (const gameId of uniqueGameIds) {
      await compactGame(supabase, gameId, cutoffTime);
    }

    return new Response(
      JSON.stringify({ success: true, compactedGames: uniqueGameIds.length }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
