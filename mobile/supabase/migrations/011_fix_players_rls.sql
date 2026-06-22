-- Fix players RLS: Allow all authenticated users to read players (for username checking)
-- Keep write operations restricted to game members

DROP POLICY IF EXISTS "Players readable by game members" ON players;
DROP POLICY IF EXISTS "Players readable by authenticated users" ON players;

-- Allow all authenticated users to read players (needed for username availability check)
CREATE POLICY "Players readable by authenticated users"
  ON players FOR SELECT
  TO authenticated
  USING (true);

-- Only game members can insert players
DROP POLICY IF EXISTS "Game members can insert players" ON players;
CREATE POLICY "Game members can insert players"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = players.game_id 
      AND games.host_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM players AS p
      WHERE p.game_id = players.game_id 
      AND p.user_id = auth.uid()
    )
  );
