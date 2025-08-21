-- Add game result tracking fields
ALTER TABLE games ADD COLUMN home_score INTEGER;
ALTER TABLE games ADD COLUMN away_score INTEGER;
ALTER TABLE games ADD COLUMN game_status VARCHAR(20) DEFAULT 'scheduled' CHECK (game_status IN ('scheduled', 'in_progress', 'final', 'cancelled', 'postponed'));