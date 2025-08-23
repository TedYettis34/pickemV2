-- Fix foreign key constraint issue in picks table
-- The picks table should reference users.cognito_user_id, not users.id

-- Drop the foreign key constraint if it exists
ALTER TABLE picks DROP CONSTRAINT IF EXISTS fk_picks_user_id;

-- The picks table stores Cognito user IDs in user_id column
-- But there's no foreign key constraint needed since user sync happens in the API layer
-- Just add a comment to document the relationship
COMMENT ON COLUMN picks.user_id IS 'Cognito user ID - references users.cognito_user_id (enforced at application level)';
