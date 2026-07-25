-- Add image_uri column to pois (public URL into the poi_images storage bucket)
ALTER TABLE pois ADD COLUMN IF NOT EXISTS image_uri TEXT;

-- Create the poi_images storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('poi_images', 'poi_images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for objects in the poi_images bucket
DROP POLICY IF EXISTS "Public read access for poi_images" ON storage.objects;
CREATE POLICY "Public read access for poi_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'poi_images');
