-- Add pick result tracking field
ALTER TABLE picks ADD COLUMN result VARCHAR(10) CHECK (result IN ('win', 'loss', 'push'));
ALTER TABLE picks ADD COLUMN evaluated_at TIMESTAMP;