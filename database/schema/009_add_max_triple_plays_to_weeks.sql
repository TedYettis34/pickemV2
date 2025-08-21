-- Add max_triple_plays field to weeks table
-- This allows admins to set a limit on how many triple play picks users can make per week

ALTER TABLE weeks ADD COLUMN max_triple_plays INTEGER;

-- Add comment to explain the field
COMMENT ON COLUMN weeks.max_triple_plays IS 'Maximum number of triple play picks a user can make in this week. NULL means no limit.';