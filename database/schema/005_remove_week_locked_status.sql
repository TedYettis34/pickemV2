-- Remove locked status from weeks table
-- This migration removes the locking concept from weeks

-- Remove the locked status columns
ALTER TABLE weeks 
DROP COLUMN IF EXISTS is_locked,
DROP COLUMN IF EXISTS locked_at,
DROP COLUMN IF EXISTS locked_by;

-- Update any indexes that might have been created on these columns
-- (This is safe to run even if the indexes don't exist)
DROP INDEX IF EXISTS idx_weeks_is_locked;
DROP INDEX IF EXISTS idx_weeks_locked_at;