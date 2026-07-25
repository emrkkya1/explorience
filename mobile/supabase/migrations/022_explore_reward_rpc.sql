-- ============================================================================
-- grant_random_undiscovered_poi_hint
-- Picks a random undiscovered POI in the game's city and inserts it into
-- poi_hints so it appears as a "?" marker on every player's map.
-- Returns the chosen POI row (or empty set if city is exhausted).
-- ============================================================================

CREATE OR REPLACE FUNCTION grant_random_undiscovered_poi_hint(
  p_game_id UUID,
  p_player_id UUID
) RETURNS TABLE (
  id UUID,
  name TEXT,
  rarity TEXT,
  category TEXT,
  primary_type TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  image_uri TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_player UUID;
  v_city_id INT;
  v_chosen_id UUID;
BEGIN
  SELECT p.id INTO v_caller_player
  FROM players p
  WHERE p.game_id = p_game_id AND p.user_id = auth.uid();

  IF v_caller_player IS NULL THEN
    RAISE EXCEPTION 'Not a member of game %', p_game_id
      USING ERRCODE = '42501';
  END IF;

  IF v_caller_player <> p_player_id THEN
    RAISE EXCEPTION 'player_id does not belong to caller'
      USING ERRCODE = '42501';
  END IF;

  SELECT g.city_id INTO v_city_id
  FROM games g
  WHERE g.id = p_game_id;

  IF v_city_id IS NULL THEN
    RAISE EXCEPTION 'Game % not found', p_game_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT p.id INTO v_chosen_id
  FROM pois p
  WHERE p.city_id = v_city_id
    AND NOT EXISTS (
      SELECT 1 FROM poi_hints h
      WHERE h.game_id = p_game_id AND h.poi_id = p.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM poi_discoveries d
      WHERE d.game_id = p_game_id AND d.poi_id = p.id
    )
  ORDER BY random()
  LIMIT 1;

  IF v_chosen_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO poi_hints (game_id, player_id, poi_id)
  VALUES (p_game_id, p_player_id, v_chosen_id)
  ON CONFLICT (game_id, poi_id) DO NOTHING;

  RETURN QUERY
  SELECT
    p.id, p.name, p.rarity, p.category, p.primary_type,
    p.latitude, p.longitude, p.image_uri
  FROM pois p
  WHERE p.id = v_chosen_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION grant_random_undiscovered_poi_hint(UUID, UUID) FROM PUBLIC;
