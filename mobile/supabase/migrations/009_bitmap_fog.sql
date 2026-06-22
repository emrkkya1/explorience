-- Snapshot bitmap (compacted hourly)
CREATE TABLE explored_areas (
  game_id UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  bitmap BYTEA NOT NULL DEFAULT '\x',
  last_compacted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Delta log (append-only, cleaned up on compaction)
CREATE TABLE fog_deltas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  deltas INTEGER[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fog_deltas_game_time ON fog_deltas(game_id, created_at DESC);

-- RLS
ALTER TABLE explored_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fog_deltas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game members can read explored areas"
  ON explored_areas FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM players WHERE players.game_id = explored_areas.game_id AND players.user_id = auth.uid())
  );

CREATE POLICY "Game members can update explored areas"
  ON explored_areas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM players WHERE players.game_id = explored_areas.game_id AND players.user_id = auth.uid())
  );

CREATE POLICY "Game members can insert explored areas"
  ON explored_areas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM players WHERE players.game_id = explored_areas.game_id AND players.user_id = auth.uid())
  );

CREATE POLICY "Game members can read fog deltas"
  ON fog_deltas FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM players WHERE players.game_id = fog_deltas.game_id AND players.user_id = auth.uid())
  );

CREATE POLICY "Game members can insert fog deltas"
  ON fog_deltas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM players WHERE players.game_id = fog_deltas.game_id AND players.user_id = auth.uid())
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE fog_deltas;

-- Drop old tables
DROP TABLE IF EXISTS grid_discoveries;

-- NOTE: Set up hourly compaction via Supabase Dashboard:
-- 1. Go to Edge Functions → compact-fog
-- 2. Click "Schedule" and set to run every hour (0 * * * *)
-- OR use Supabase CLI:
--   supabase functions deploy compact-fog
--   supabase cron schedule compact-fog --schedule "0 * * * *"
