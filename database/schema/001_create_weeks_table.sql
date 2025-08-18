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