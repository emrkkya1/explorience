-- Add explored columns to poi_discoveries
-- Tracks whether a discovered POI has been visually verified by a player.
ALTER TABLE poi_discoveries
  ADD COLUMN IF NOT EXISTS explored BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS explored_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS explored_by UUID REFERENCES players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_photo_uri TEXT;

-- Create poi_explores storage bucket (public read, auth insert)
-- Stores user-captured verification photos.
INSERT INTO storage.buckets (id, name, public)
VALUES ('poi_explores', 'poi_explores', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for objects in poi_explores bucket
DROP POLICY IF EXISTS "Public read access for poi_explores" ON storage.objects;
CREATE POLICY "Public read access for poi_explores"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'poi_explores');

-- Auth users can insert into poi_explores bucket
DROP POLICY IF EXISTS "Auth users can insert into poi_explores" ON storage.objects;
CREATE POLICY "Auth users can insert into poi_explores"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'poi_explores' AND auth.role() = 'authenticated');