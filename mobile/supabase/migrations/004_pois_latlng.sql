-- Drop existing PostGIS-based POI table and function
DROP TABLE IF EXISTS pois CASCADE;
DROP FUNCTION IF EXISTS insert_poi;

-- Recreate with plain latitude/longitude columns
CREATE TABLE pois (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id INTEGER REFERENCES cities(id) NOT NULL,
  google_place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
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

-- Enable RLS
ALTER TABLE pois ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Enable read access for all users" ON pois FOR SELECT USING (true);
