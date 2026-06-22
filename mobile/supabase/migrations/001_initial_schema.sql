CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO cities (name) VALUES ('KRAKOW');

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  city_id INTEGER REFERENCES cities(id) NOT NULL,
  host_user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  username TEXT NOT NULL,
  game_id UUID REFERENCES games(id) NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_id)
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cities" ON cities
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read games by code" ON games
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create games" ON games
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read players" ON players
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert players" ON players
  FOR INSERT WITH CHECK (auth.uid() = user_id);
