ALTER TABLE players DROP CONSTRAINT IF EXISTS players_user_id_game_id_key;

ALTER TABLE players ADD CONSTRAINT players_username_game_id_key UNIQUE (username, game_id);
