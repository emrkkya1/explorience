CREATE TABLE poi_hints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  poi_id UUID NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  hinted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, poi_id)
);

CREATE INDEX idx_poi_hints_game_id ON poi_hints(game_id);
CREATE INDEX idx_poi_hints_player_id ON poi_hints(player_id);

ALTER TABLE poi_hints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game members can read POI hints"
  ON poi_hints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = poi_hints.game_id
        AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Game members can insert POI hints"
  ON poi_hints FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = poi_hints.game_id
        AND players.user_id = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE poi_hints;
