-- Add cutoff_time column to weeks table
-- This prevents pick submissions after the specified cutoff date/time
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS cutoff_time TIMESTAMPTZ NULL;

-- Add index for efficient querying by cutoff_time
CREATE INDEX IF NOT EXISTS idx_weeks_cutoff_time ON weeks(cutoff_time);

-- Add comment to document the new column
COMMENT ON COLUMN weeks.cutoff_time IS 'Cutoff date and time after which picks cannot be submitted or re-submitted for this week';