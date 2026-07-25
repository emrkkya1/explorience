CREATE TABLE player_locations (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_player_locations_game_id ON player_locations(game_id);

ALTER TABLE player_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game members can read player locations"
  ON player_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = player_locations.game_id
        AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Players can insert their own location"
  ON player_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.game_id = player_locations.game_id
        AND p.user_id = auth.uid()
        AND p.id = player_locations.player_id
    )
  );

CREATE POLICY "Players can update their own location"
  ON player_locations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.game_id = player_locations.game_id
        AND p.user_id = auth.uid()
        AND p.id = player_locations.player_id
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE player_locations;
