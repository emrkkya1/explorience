CREATE EXTENSION IF NOT EXISTS postgis;

-- Insert IZMIR city (idempotent)
INSERT INTO cities (name) VALUES ('IZMIR') ON CONFLICT (name) DO NOTHING;

-- Ensure sequence is in sync
SELECT setval('cities_id_seq', (SELECT MAX(id) FROM cities));

CREATE TABLE pois (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id INTEGER REFERENCES cities(id) NOT NULL,
  google_place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  location GEOGRAPHY(POINT) NOT NULL,
  types JSONB,
  primary_type TEXT,
  category TEXT CHECK (category IN ('nightlife', 'food', 'landmark', 'history', 'nature', 'shopping', 'miscellaneous')),
  rarity TEXT CHECK (rarity IN ('legendary', 'epic', 'rare', 'common')),
  description TEXT,
  rating REAL,
  total_reviews INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(city_id, google_place_id)
);

ALTER TABLE pois ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pois" ON pois
  FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION insert_poi(
  p_city_id INTEGER,
  p_google_place_id TEXT,
  p_name TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_types JSONB,
  p_primary_type TEXT,
  p_category TEXT,
  p_rarity TEXT,
  p_description TEXT,
  p_rating REAL,
  p_total_reviews INTEGER
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO pois (city_id, google_place_id, name, location, types, primary_type, category, rarity, description, rating, total_reviews)
  VALUES (
    p_city_id,
    p_google_place_id,
    p_name,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_types,
    p_primary_type,
    p_category,
    p_rarity,
    p_description,
    p_rating,
    p_total_reviews
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
