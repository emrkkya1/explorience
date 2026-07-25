-- Add UPDATE policies for poi_hints and poi_discoveries
-- Needed because the app uses .upsert() which does INSERT ... ON CONFLICT DO UPDATE
-- Without an UPDATE policy, the UPDATE part of upsert is blocked by RLS

DROP POLICY IF EXISTS "Game members can update POI hints" ON poi_hints;
CREATE POLICY "Game members can update POI hints"
  ON poi_hints FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = poi_hints.game_id
        AND players.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = poi_hints.game_id
        AND players.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Game members can update POI discoveries" ON poi_discoveries;
CREATE POLICY "Game members can update POI discoveries"
  ON poi_discoveries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = poi_discoveries.game_id
        AND players.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = poi_discoveries.game_id
        AND players.user_id = auth.uid()
    )
  );
