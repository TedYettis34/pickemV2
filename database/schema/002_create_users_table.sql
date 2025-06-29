-- Create users table for PickEm application
-- This table stores additional user data that complements AWS Cognito
-- Cognito handles authentication, this table stores app-specific user data

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    cognito_user_id VARCHAR(255) NOT NULL UNIQUE, -- Maps to Cognito User ID
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    
    -- User preferences
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    
    -- Status and metadata
    is_admin BOOLEAN DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT users_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT users_cognito_id_not_empty CHECK (LENGTH(TRIM(cognito_user_id)) > 0)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_users_cognito_id ON users (cognito_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users (last_login_at);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the table structure
COMMENT ON TABLE users IS 'Table to store user data that complements AWS Cognito authentication';
COMMENT ON COLUMN users.id IS 'Internal unique identifier for each user';
COMMENT ON COLUMN users.cognito_user_id IS 'AWS Cognito User ID (UUID from Cognito)';
COMMENT ON COLUMN users.email IS 'User email address (synced from Cognito)';
COMMENT ON COLUMN users.name IS 'User display name (synced from Cognito)';
COMMENT ON COLUMN users.timezone IS 'User preferred timezone';
COMMENT ON COLUMN users.is_admin IS 'Whether the user has admin privileges';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of last successful login';
COMMENT ON COLUMN users.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when the record was last updated';