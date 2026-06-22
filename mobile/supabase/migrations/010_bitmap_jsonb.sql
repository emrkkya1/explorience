-- Drop the old bytea bitmap column
ALTER TABLE explored_areas DROP COLUMN IF EXISTS bitmap;

-- Add new jsonb bitmap column with default empty array
ALTER TABLE explored_areas 
ADD COLUMN bitmap jsonb NOT NULL DEFAULT '[]'::jsonb;
