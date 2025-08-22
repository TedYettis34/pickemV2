// Database migration definitions
// These are the SQL statements to set up the database schema

export const migrations = [
  {
    id: '001_create_weeks_table',
    sql: `
-- Create weeks table for PickEm application
-- This table stores week definitions for pick periods

CREATE TABLE IF NOT EXISTS weeks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT weeks_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT weeks_valid_date_range CHECK (start_date < end_date),
    CONSTRAINT weeks_unique_name UNIQUE (name)
);

-- Create index for efficient querying by date ranges
CREATE INDEX IF NOT EXISTS idx_weeks_date_range ON weeks (start_date, end_date);

-- Create index for efficient querying by name
CREATE INDEX IF NOT EXISTS idx_weeks_name ON weeks (name);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_weeks_updated_at 
    BEFORE UPDATE ON weeks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the table structure
COMMENT ON TABLE weeks IS 'Table to store week definitions for pick periods';
COMMENT ON COLUMN weeks.id IS 'Unique identifier for each week';
COMMENT ON COLUMN weeks.name IS 'Display name for the week (e.g., "Week 1", "Championship Week")';
COMMENT ON COLUMN weeks.start_date IS 'Start date and time for picks to be available';
COMMENT ON COLUMN weeks.end_date IS 'End date and time for picks to close';
COMMENT ON COLUMN weeks.description IS 'Optional description of the week';
COMMENT ON COLUMN weeks.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN weeks.updated_at IS 'Timestamp when the record was last updated';
    `
  },
  {
    id: '002_create_users_table',
    sql: `
-- Create users table for PickEm application
-- This table stores user profiles and preferences

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    cognito_user_id VARCHAR(128) NOT NULL UNIQUE,
    email VARCHAR(320) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    preferred_name VARCHAR(255),
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    email_preferences JSONB DEFAULT '{"weekly_reminders": true, "pick_confirmations": true, "results_notifications": true}'::jsonb,
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT users_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
    CONSTRAINT users_preferred_name_not_empty CHECK (preferred_name IS NULL OR LENGTH(TRIM(preferred_name)) > 0),
    CONSTRAINT users_valid_timezone CHECK (timezone IS NULL OR LENGTH(TRIM(timezone)) > 0)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_users_cognito_user_id ON users (cognito_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users (is_admin);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users (last_login_at);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the table structure
COMMENT ON TABLE users IS 'Table to store user profiles and preferences';
COMMENT ON COLUMN users.id IS 'Unique identifier for each user';
COMMENT ON COLUMN users.cognito_user_id IS 'AWS Cognito user identifier for authentication';
COMMENT ON COLUMN users.email IS 'User email address (unique)';
COMMENT ON COLUMN users.name IS 'Full name of the user';
COMMENT ON COLUMN users.preferred_name IS 'Optional preferred display name';
COMMENT ON COLUMN users.avatar_url IS 'URL to user profile picture';
COMMENT ON COLUMN users.timezone IS 'User preferred timezone for displaying dates/times';
COMMENT ON COLUMN users.email_preferences IS 'JSON object containing email notification preferences';
COMMENT ON COLUMN users.is_admin IS 'Whether the user has administrative privileges';
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of last login';
COMMENT ON COLUMN users.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when the record was last updated';
    `
  },
  {
    id: '003_create_games_table',
    sql: `
-- Create games table for PickEm application
-- This table stores game information and betting lines

CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    week_id INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
    sport VARCHAR(50) NOT NULL CHECK (sport IN ('americanfootball_nfl', 'americanfootball_ncaaf')),
    external_id VARCHAR(255) NOT NULL,
    home_team VARCHAR(255) NOT NULL,
    away_team VARCHAR(255) NOT NULL,
    commence_time TIMESTAMPTZ NOT NULL,
    
    -- Betting lines (can be updated)
    spread_home DECIMAL(4,1),
    spread_away DECIMAL(4,1),
    total_over_under DECIMAL(4,1),
    moneyline_home INTEGER,
    moneyline_away INTEGER,
    
    -- Metadata
    bookmaker VARCHAR(100) DEFAULT 'fanduel',
    odds_last_updated TIMESTAMPTZ,
    
    -- Game results
    home_score INTEGER,
    away_score INTEGER,
    game_status VARCHAR(20) DEFAULT 'scheduled' CHECK (game_status IN ('scheduled', 'in_progress', 'final', 'cancelled', 'postponed')),
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT games_teams_different CHECK (home_team != away_team),
    CONSTRAINT games_external_id_unique UNIQUE (external_id),
    CONSTRAINT games_home_team_not_empty CHECK (LENGTH(TRIM(home_team)) > 0),
    CONSTRAINT games_away_team_not_empty CHECK (LENGTH(TRIM(away_team)) > 0),
    CONSTRAINT games_valid_scores CHECK (
        (home_score IS NULL AND away_score IS NULL) OR 
        (home_score IS NOT NULL AND away_score IS NOT NULL AND home_score >= 0 AND away_score >= 0)
    )
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_games_week_id ON games (week_id);
CREATE INDEX IF NOT EXISTS idx_games_external_id ON games (external_id);
CREATE INDEX IF NOT EXISTS idx_games_commence_time ON games (commence_time);
CREATE INDEX IF NOT EXISTS idx_games_sport ON games (sport);
CREATE INDEX IF NOT EXISTS idx_games_status ON games (game_status);
CREATE INDEX IF NOT EXISTS idx_games_teams ON games (home_team, away_team);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_games_updated_at 
    BEFORE UPDATE ON games 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the table structure
COMMENT ON TABLE games IS 'Table to store game information and betting lines';
COMMENT ON COLUMN games.id IS 'Unique identifier for each game';
COMMENT ON COLUMN games.week_id IS 'Reference to the week this game belongs to';
COMMENT ON COLUMN games.sport IS 'Sport type (NFL or College Football)';
COMMENT ON COLUMN games.external_id IS 'External API identifier for the game';
COMMENT ON COLUMN games.home_team IS 'Name of the home team';
COMMENT ON COLUMN games.away_team IS 'Name of the away team';
COMMENT ON COLUMN games.commence_time IS 'Scheduled start time of the game';
COMMENT ON COLUMN games.spread_home IS 'Point spread for home team (negative = favored)';
COMMENT ON COLUMN games.spread_away IS 'Point spread for away team (negative = favored)';
    `
  },
  {
    id: '004_add_week_locked_status',
    sql: `
-- Add locked status to weeks table
-- This allows administrators to prevent further picks for a week

ALTER TABLE weeks ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying of locked status
CREATE INDEX IF NOT EXISTS idx_weeks_locked ON weeks (locked);

-- Add comment for the new column
COMMENT ON COLUMN weeks.locked IS 'Whether picks are locked for this week (prevents new/updated picks)';
    `
  },
  {
    id: '005_remove_week_locked_status',
    sql: `
-- Remove locked status from weeks table
-- After review, we decided to handle locking at the application level based on game times

-- Drop the index first
DROP INDEX IF EXISTS idx_weeks_locked;

-- Drop the column
ALTER TABLE weeks DROP COLUMN IF EXISTS locked;
    `
  },
  {
    id: '006_create_picks_table',
    sql: `
-- Create picks table for PickEm application
-- This table stores user picks for games

CREATE TABLE IF NOT EXISTS picks (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL, -- References users.cognito_user_id
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    pick_type VARCHAR(20) NOT NULL CHECK (pick_type IN ('home_spread', 'away_spread')),
    spread_value DECIMAL(4,1), -- The spread value at time of pick
    submitted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT picks_unique_user_game UNIQUE (user_id, game_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_picks_user_id ON picks (user_id);
CREATE INDEX IF NOT EXISTS idx_picks_game_id ON picks (game_id);
CREATE INDEX IF NOT EXISTS idx_picks_submitted ON picks (submitted);
CREATE INDEX IF NOT EXISTS idx_picks_user_submitted ON picks (user_id, submitted);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_picks_updated_at 
    BEFORE UPDATE ON picks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint for user_id (references cognito_user_id)
ALTER TABLE picks ADD CONSTRAINT fk_picks_user_id 
    FOREIGN KEY (user_id) REFERENCES users(cognito_user_id) ON DELETE CASCADE;

-- Add comments to document the table structure
COMMENT ON TABLE picks IS 'Table to store user picks for games';
COMMENT ON COLUMN picks.id IS 'Unique identifier for each pick';
COMMENT ON COLUMN picks.user_id IS 'Cognito user ID of the user making the pick';
COMMENT ON COLUMN picks.game_id IS 'Reference to the game being picked';
COMMENT ON COLUMN picks.pick_type IS 'Type of pick: home_spread or away_spread';
COMMENT ON COLUMN picks.spread_value IS 'The spread value at the time the pick was made';
COMMENT ON COLUMN picks.submitted IS 'Whether the pick has been submitted (locked in)';
COMMENT ON COLUMN picks.created_at IS 'Timestamp when the pick was created';
COMMENT ON COLUMN picks.updated_at IS 'Timestamp when the pick was last updated';
    `
  },
  {
    id: '007_add_must_pick_to_games',
    sql: `
-- Add must_pick field to games table
-- This allows administrators to designate certain games as required picks

ALTER TABLE games ADD COLUMN IF NOT EXISTS must_pick BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying of must pick games
CREATE INDEX IF NOT EXISTS idx_games_must_pick ON games (must_pick);

-- Add comment for the new column
COMMENT ON COLUMN games.must_pick IS 'Whether this game is designated as a required pick for all users';
    `
  },
  {
    id: '008_add_max_picker_choice_games_to_weeks',
    sql: `
-- Add max_picker_choice_games to weeks table
-- This field controls how many non-must-pick games users can select per week

ALTER TABLE weeks ADD COLUMN IF NOT EXISTS max_picker_choice_games INTEGER DEFAULT 5;

-- Add constraint to ensure the value is positive
ALTER TABLE weeks ADD CONSTRAINT weeks_max_picker_choice_games_positive 
    CHECK (max_picker_choice_games > 0);

-- Add comment for the new column
COMMENT ON COLUMN weeks.max_picker_choice_games IS 'Maximum number of non-must-pick games users can select for this week';
    `
  },
  {
    id: '009_add_max_triple_plays_to_weeks',
    sql: `
-- Add max_triple_plays to weeks table
-- This field controls how many triple plays users can make per week

ALTER TABLE weeks ADD COLUMN IF NOT EXISTS max_triple_plays INTEGER DEFAULT 1;

-- Add constraint to ensure the value is non-negative
ALTER TABLE weeks ADD CONSTRAINT weeks_max_triple_plays_non_negative 
    CHECK (max_triple_plays >= 0);

-- Add comment for the new column
COMMENT ON COLUMN weeks.max_triple_plays IS 'Maximum number of triple plays users can make for this week';
    `
  },
  {
    id: '010_add_is_triple_play_to_picks',
    sql: `
-- Add is_triple_play field to picks table
-- This allows users to designate picks as triple plays for bonus points

ALTER TABLE picks ADD COLUMN IF NOT EXISTS is_triple_play BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying of triple play picks
CREATE INDEX IF NOT EXISTS idx_picks_is_triple_play ON picks (is_triple_play);
CREATE INDEX IF NOT EXISTS idx_picks_user_triple_play ON picks (user_id, is_triple_play);

-- Add comment for the new column
COMMENT ON COLUMN picks.is_triple_play IS 'Whether this pick is marked as a triple play (worth 3x points if correct)';
    `
  },
  {
    id: '011_add_game_results',
    sql: `
-- Add game result tracking fields that were missing
-- Ensure all result fields exist and have proper constraints

-- Add home_score and away_score if they don't exist (they should from migration 003)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'home_score') THEN
        ALTER TABLE games ADD COLUMN home_score INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'away_score') THEN
        ALTER TABLE games ADD COLUMN away_score INTEGER;
    END IF;
END $$;
    `
  },
  {
    id: '012_add_pick_results',
    sql: `
-- Add pick result tracking field
ALTER TABLE picks ADD COLUMN IF NOT EXISTS result VARCHAR(10) CHECK (result IN ('win', 'loss', 'push'));
ALTER TABLE picks ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMP;
    `
  }
];

export const sampleData = {
  id: 'sample_weeks_data',
  sql: `
-- Sample data for weeks table
-- This provides example weeks for development and testing

INSERT INTO weeks (name, start_date, end_date, description) VALUES
(
    'Week 1 - Season Opener',
    '2024-09-01 00:00:00+00',
    '2024-09-08 23:59:59+00',
    'Opening week of the season - college football starts!'
),
(
    'Week 2 - Conference Play Begins',
    '2024-09-08 00:00:00+00',
    '2024-09-15 23:59:59+00',
    'Conference games begin, rivalry matchups heat up'
),
(
    'Week 3 - Primetime Showdowns',
    '2024-09-15 00:00:00+00',
    '2024-09-22 23:59:59+00',
    'Major matchups under the lights'
),
(
    'Championship Week',
    '2024-12-01 00:00:00+00',
    '2024-12-08 23:59:59+00',
    'Conference championship games - final picks of the regular season'
)
ON CONFLICT (name) DO NOTHING;
  `
};