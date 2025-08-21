-- Add is_triple_play field to picks table
-- This allows users to mark any of their picks (must-pick or picker's choice) as a triple play

ALTER TABLE picks ADD COLUMN is_triple_play BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment to explain the field
COMMENT ON COLUMN picks.is_triple_play IS 'Indicates whether this pick is marked as a triple play by the user';