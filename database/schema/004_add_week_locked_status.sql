-- Add locked status to weeks table
-- This prevents further modifications once an admin has reviewed and locked the week
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ NULL;
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS locked_by VARCHAR(255) NULL; -- Admin who locked the week

-- Create index for locked status queries
CREATE INDEX IF NOT EXISTS idx_weeks_is_locked ON weeks(is_locked);