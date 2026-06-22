-- Allow a user_id to have multiple player rows per game
-- and allow any authenticated user to update any player row (takeover on rejoin)
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_user_id_game_id_key;

DROP POLICY IF EXISTS "Authenticated users can update players" ON players;
CREATE POLICY "Authenticated users can update players"
  ON players FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
