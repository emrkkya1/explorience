ALTER TABLE player_locations ADD COLUMN source TEXT NOT NULL DEFAULT 'foreground';

ALTER TABLE player_locations ADD CONSTRAINT chk_player_locations_source CHECK (source IN ('foreground', 'background'));
