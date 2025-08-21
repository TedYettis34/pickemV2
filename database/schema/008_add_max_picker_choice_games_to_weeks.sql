-- Add max_picker_choice_games column to weeks table
-- This field defines the maximum number of non-must-pick games a user can pick in a week

ALTER TABLE weeks 
ADD COLUMN max_picker_choice_games INTEGER;

-- Add constraint to ensure the value is positive when set
ALTER TABLE weeks 
ADD CONSTRAINT weeks_max_picker_choice_games_positive 
CHECK (max_picker_choice_games IS NULL OR max_picker_choice_games > 0);

-- Add comment to document the new column
COMMENT ON COLUMN weeks.max_picker_choice_games IS 'Maximum number of non-must-pick games a user can pick in this week (NULL means no limit)';