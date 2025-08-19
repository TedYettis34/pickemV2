-- Create picks table for user game predictions
CREATE TABLE IF NOT EXISTS picks (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- Cognito user ID
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    pick_type VARCHAR(20) NOT NULL CHECK (pick_type IN ('home_spread', 'away_spread')),
    spread_value DECIMAL(4,1), -- The spread value at time of pick (e.g., -3.5, +7.0)
    submitted BOOLEAN DEFAULT FALSE, -- Whether pick is finalized
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure user can only have one pick per game
    UNIQUE(user_id, game_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_picks_user_id ON picks(user_id);
CREATE INDEX IF NOT EXISTS idx_picks_game_id ON picks(game_id);
CREATE INDEX IF NOT EXISTS idx_picks_submitted ON picks(submitted);
CREATE INDEX IF NOT EXISTS idx_picks_user_submitted ON picks(user_id, submitted);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_picks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_picks_updated_at
    BEFORE UPDATE ON picks
    FOR EACH ROW
    EXECUTE FUNCTION update_picks_updated_at();