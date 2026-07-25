-- 019_poi_rpc_and_normalized_policies.sql
-- Normalizes RLS policies for poi_discoveries and poi_hints and introduces
-- SECURITY DEFINER upsert RPCs so the client no longer relies on split
-- INSERT/UPDATE policies (which surface as hard RLS errors during token
-- refresh / replaced-anon-session windows).
-- Also tightens WITH CHECK to require ownership of the player_id being written.

-- ============================================================================
-- poi_discoveries: normalize policies
-- ============================================================================

DROP POLICY IF EXISTS "Game members can read POI discoveries" ON poi_discoveries;
DROP POLICY IF EXISTS "Game members can insert POI discoveries" ON poi_discoveries;
DROP POLICY IF EXISTS "Game members can update POI discoveries" ON poi_discoveries;

CREATE POLICY "Game members can read POI discoveries"
  ON poi_discoveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = poi_discoveries.game_id
        AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Game members can insert POI discoveries"
  ON poi_discoveries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.game_id = poi_discoveries.game_id
        AND p.user_id = auth.uid()
        AND p.id = poi_discoveries.player_id
    )
  );

CREATE POLICY "Game members can update POI discoveries"
  ON poi_discoveries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = poi_discoveries.game_id
        AND players.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = poi_discoveries.game_id
        AND players.user_id = auth.uid()
    )
    -- explored_by, if set, must reference the caller's own player row.
    AND (
      poi_discoveries.explored_by IS NULL
      OR poi_discoveries.explored_by IN (
        SELECT p.id FROM players p
        WHERE p.game_id = poi_discoveries.game_id AND p.user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- poi_hints: normalize policies
-- ============================================================================

DROP POLICY IF EXISTS "Game members can read POI hints" ON poi_hints;
DROP POLICY IF EXISTS "Game members can insert POI hints" ON poi_hints;
DROP POLICY IF EXISTS "Game members can update POI hints" ON poi_hints;

CREATE POLICY "Game members can read POI hints"
  ON poi_hints FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = poi_hints.game_id
        AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Game members can insert POI hints"
  ON poi_hints FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.game_id = poi_hints.game_id
        AND p.user_id = auth.uid()
        AND p.id = poi_hints.player_id
    )
  );

CREATE POLICY "Game members can update POI hints"
  ON poi_hints FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = poi_hints.game_id
        AND players.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = poi_hints.game_id
        AND players.user_id = auth.uid()
    )
  );

-- ============================================================================
-- upsert_poi_discovery
-- Atomic INSERT ... ON CONFLICT DO UPDATE that verifies the caller owns
-- p_player_id in p_game_id. Explore columns are only written when supplied
-- (NULL = leave unchanged), so discover calls never clobber explore state.
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_poi_discovery(
  p_game_id UUID,
  p_player_id UUID,
  p_poi_id UUID,
  p_explored BOOLEAN DEFAULT NULL,
  p_explored_by UUID DEFAULT NULL,
  p_user_photo_uri TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_player UUID;
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

  IF p_explored_by IS NOT NULL AND p_explored_by <> p_player_id THEN
    RAISE EXCEPTION 'explored_by must be the caller'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO poi_discoveries (game_id, player_id, poi_id)
  VALUES (p_game_id, p_player_id, p_poi_id)
  ON CONFLICT (game_id, poi_id) DO UPDATE
    SET
      player_id = EXCLUDED.player_id,
      explored = COALESCE(p_explored, poi_discoveries.explored),
      explored_at = CASE
        WHEN p_explored = TRUE THEN now()
        ELSE poi_discoveries.explored_at
      END,
      explored_by = COALESCE(p_explored_by, poi_discoveries.explored_by),
      user_photo_uri = COALESCE(p_user_photo_uri, poi_discoveries.user_photo_uri);
END;
$$;

-- ============================================================================
-- upsert_poi_hint
-- Atomic INSERT ... ON CONFLICT DO UPDATE with caller-ownership check.
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_poi_hint(
  p_game_id UUID,
  p_player_id UUID,
  p_poi_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_player UUID;
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

  INSERT INTO poi_hints (game_id, player_id, poi_id)
  VALUES (p_game_id, p_player_id, p_poi_id)
  ON CONFLICT (game_id, poi_id) DO UPDATE
    SET player_id = EXCLUDED.player_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION upsert_poi_discovery(UUID, UUID, UUID, BOOLEAN, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION upsert_poi_hint(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_poi_discovery(UUID, UUID, UUID, BOOLEAN, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_poi_hint(UUID, UUID, UUID) TO authenticated;