-- 015_fix_fog_deltas_rls.sql
-- Ensures fog_deltas RLS policies exist (idempotent)

-- Table (if migration 009 wasn't run)
CREATE TABLE IF NOT EXISTS fog_deltas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  deltas INTEGER[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fog_deltas_game_time ON fog_deltas(game_id, created_at DESC);

ALTER TABLE fog_deltas ENABLE ROW LEVEL SECURITY;

-- Drop old policies to recreate cleanly
DROP POLICY IF EXISTS "Game members can read fog deltas" ON fog_deltas;
DROP POLICY IF EXISTS "Game members can insert fog deltas" ON fog_deltas;

-- SELECT: any player in the game can read fog deltas
CREATE POLICY "Game members can read fog deltas"
  ON fog_deltas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = fog_deltas.game_id
        AND players.user_id = auth.uid()
    )
  );

-- INSERT: any player in the game can insert fog deltas
CREATE POLICY "Game members can insert fog deltas"
  ON fog_deltas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = fog_deltas.game_id
        AND players.user_id = auth.uid()
    )
  );

-- Realtime (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'fog_deltas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE fog_deltas;
  END IF;
END $$;
