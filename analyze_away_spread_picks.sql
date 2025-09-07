-- Analyze away_spread picks to identify potential evaluation issues
-- Look for patterns where away team picks with negative spreads might be incorrectly evaluated

SELECT 
  p.id,
  p.pick_type,
  p.spread_value,
  p.result,
  g.away_team,
  g.home_team,
  g.away_score,
  g.home_score,
  CASE 
    WHEN g.away_score IS NOT NULL AND g.home_score IS NOT NULL 
    THEN (g.away_score - g.home_score) 
    ELSE NULL 
  END as away_margin,
  -- For negative spread_values in away_spread picks, what should the result be?
  CASE 
    WHEN p.pick_type = 'away_spread' 
         AND p.spread_value < 0 
         AND g.away_score IS NOT NULL 
         AND g.home_score IS NOT NULL
    THEN 
      CASE 
        WHEN (g.away_score - g.home_score) > ABS(p.spread_value) THEN 'should_be_win'
        WHEN (g.away_score - g.home_score) = ABS(p.spread_value) THEN 'should_be_push'
        ELSE 'should_be_loss'
      END
    ELSE 'not_applicable'
  END as correct_result,
  g.game_status,
  g.commence_time
FROM picks p
JOIN games g ON p.game_id = g.id
WHERE p.pick_type = 'away_spread' 
  AND p.spread_value < 0
  AND p.submitted = true
  AND p.result IS NOT NULL
  AND g.home_score IS NOT NULL 
  AND g.away_score IS NOT NULL
ORDER BY g.commence_time DESC, p.spread_value ASC;

-- Summary of potential issues
SELECT 
  COUNT(*) as total_away_negative_spreads,
  COUNT(CASE WHEN p.result = 'win' THEN 1 END) as currently_marked_win,
  COUNT(CASE WHEN p.result = 'loss' THEN 1 END) as currently_marked_loss,
  COUNT(CASE WHEN p.result = 'push' THEN 1 END) as currently_marked_push,
  COUNT(CASE 
    WHEN p.result != CASE 
      WHEN (g.away_score - g.home_score) > ABS(p.spread_value) THEN 'win'
      WHEN (g.away_score - g.home_score) = ABS(p.spread_value) THEN 'push'
      ELSE 'loss'
    END THEN 1 END) as incorrect_evaluations
FROM picks p
JOIN games g ON p.game_id = g.id
WHERE p.pick_type = 'away_spread' 
  AND p.spread_value < 0
  AND p.submitted = true
  AND p.result IS NOT NULL
  AND g.home_score IS NOT NULL 
  AND g.away_score IS NOT NULL;
