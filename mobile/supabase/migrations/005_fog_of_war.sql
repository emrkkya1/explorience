CREATE TABLE grid_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  grid_id TEXT NOT NULL,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, grid_id)
);

CREATE INDEX idx_grid_discoveries_game_id ON grid_discoveries(game_id);
CREATE INDEX idx_grid_discoveries_player_id ON grid_discoveries(player_id);

CREATE TABLE poi_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  poi_id UUID NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, poi_id)
);

CREATE INDEX idx_poi_discoveries_game_id ON poi_discoveries(game_id);
CREATE INDEX idx_poi_discoveries_player_id ON poi_discoveries(player_id);

ALTER TABLE grid_discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE poi_discoveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game members can read grid discoveries"
  ON grid_discoveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = grid_discoveries.game_id
        AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Game members can insert grid discoveries"
  ON grid_discoveries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = grid_discoveries.game_id
        AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Game members can read POI discoveries"
  ON poi_discoveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = poi_discoveries.game_id
        AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Game members can insert POI discoveries"
  ON poi_discoveries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = poi_discoveries.game_id
        AND players.user_id = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE grid_discoveries;
ALTER PUBLICATION supabase_realtime ADD TABLE poi_discoveries;
