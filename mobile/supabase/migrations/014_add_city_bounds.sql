-- Add city bounds columns
ALTER TABLE cities ADD COLUMN north DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE cities ADD COLUMN west DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE cities ADD COLUMN grid_width INTEGER NOT NULL DEFAULT 3000;
ALTER TABLE cities ADD COLUMN grid_height INTEGER NOT NULL DEFAULT 3000;

-- Populate existing cities with bounds from seeder configs
-- Cell size: 0.0001 degrees (~11m)
-- Krakow: grid_width = ceil((20.1470 - 19.7915) / 0.0001) = 3555
--         grid_height = ceil((50.1430 - 49.9740) / 0.0001) = 1690
UPDATE cities SET north = 50.1430, west = 19.7915, grid_width = 3555, grid_height = 1690 WHERE name = 'KRAKOW';

-- Izmir:   grid_width = ceil((27.2333 - 27.0) / 0.0001) = 2333
--          grid_height = ceil((38.4833 - 38.35) / 0.0001) = 1333
UPDATE cities SET north = 38.4833, west = 27.0, grid_width = 2333, grid_height = 1333 WHERE name = 'IZMIR';

-- Wipe game-state data (grid dimensions changed, old cell indices are now invalid)
TRUNCATE TABLE explored_areas, fog_deltas, poi_hints, poi_discoveries;
