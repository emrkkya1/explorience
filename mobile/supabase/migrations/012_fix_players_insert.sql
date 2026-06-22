-- Fix players INSERT policy to match original
-- Allow any authenticated user to insert their own player record

DROP POLICY IF EXISTS "Game members can insert players" ON players;
DROP POLICY IF EXISTS "Authenticated users can insert players" ON players;

CREATE POLICY "Authenticated users can insert players" ON players
  FOR INSERT WITH CHECK (auth.uid() = user_id);
