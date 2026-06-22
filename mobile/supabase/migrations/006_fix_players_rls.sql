-- Fix RLS: Allow users to read player records for games they're part of
-- This is needed so the grid_discoveries and poi_discoveries INSERT policies can verify membership

DROP POLICY IF EXISTS "Players readable by game members" ON players;

CREATE POLICY "Players readable by game members"
  ON players FOR SELECT
  USING (
    game_id IN (
      SELECT game_id FROM players WHERE user_id = auth.uid()
    )
  );
