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