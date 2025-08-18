-- Create games table for storing NFL and college football games
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    week_id INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
    sport VARCHAR(50) NOT NULL, -- 'americanfootball_nfl' or 'americanfootball_ncaaf'
    external_id VARCHAR(100) UNIQUE NOT NULL, -- ID from The Odds API
    home_team VARCHAR(100) NOT NULL,
    away_team VARCHAR(100) NOT NULL,
    commence_time TIMESTAMPTZ NOT NULL,
    
    -- Betting lines (can be null if not available)
    spread_home DECIMAL(5,2), -- Point spread for home team (e.g., -7.5)
    spread_away DECIMAL(5,2), -- Point spread for away team (e.g., +7.5)
    total_over_under DECIMAL(5,2), -- Over/under total points
    moneyline_home INTEGER, -- Moneyline odds for home team (e.g., -150)
    moneyline_away INTEGER, -- Moneyline odds for away team (e.g., +130)
    
    -- Additional metadata
    bookmaker VARCHAR(100), -- Which bookmaker provided the odds
    odds_last_updated TIMESTAMPTZ,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_games_week_id ON games(week_id);
CREATE INDEX IF NOT EXISTS idx_games_sport ON games(sport);
CREATE INDEX IF NOT EXISTS idx_games_commence_time ON games(commence_time);
CREATE INDEX IF NOT EXISTS idx_games_external_id ON games(external_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_games_updated_at();