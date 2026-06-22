-- Fix infinite recursion on players table RLS
-- Drop the self-referencing policy
DROP POLICY IF EXISTS "Players readable by game members" ON players;

-- Allow all authenticated users to read players (needed for grid_discoveries/poi_discoveries INSERT policies)
CREATE POLICY "Players readable by authenticated users"
  ON players FOR SELECT
  TO authenticated
  USING (true);
