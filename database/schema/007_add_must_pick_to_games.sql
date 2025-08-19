-- Add must_pick column to games table
-- This column indicates whether a game is designated as a "must pick" game
-- by administrators, though users are not actually forced to pick it

ALTER TABLE games ADD COLUMN must_pick BOOLEAN NOT NULL DEFAULT FALSE;

-- Create an index to help with filtering must_pick games
CREATE INDEX IF NOT EXISTS idx_games_must_pick ON games(must_pick);

-- Add a comment to document the purpose
COMMENT ON COLUMN games.must_pick IS 'Whether this game is designated as a "must pick" by administrators. This is for UI indication only and does not enforce actual picking.';