-- Fix the Ole Miss vs Kentucky picks that are incorrectly marked as wins
-- Game 114: Ole Miss Rebels 30 @ Kentucky Wildcats 23 (Ole Miss won by 7)
-- Users picked Ole Miss -9.5 and -10.5 (Ole Miss laying points), should be LOSSES

-- In this case, users picked Ole Miss to win by more than 9.5 or 10.5 points
-- Ole Miss only won by 7, so these should be LOSSES

-- Manual fix for the specific picks (106, 81, 102)
UPDATE picks 
SET result = 'loss',  -- Change from 'win' to 'loss'
    evaluated_at = NOW()
WHERE id IN (106, 81, 102)
  AND game_id = 114
  AND pick_type = 'away_spread';

-- STEP 2: Verify the fixes
SELECT 
  p.id,
  p.pick_type,
  p.spread_value,
  p.result,
  g.away_team,
  g.home_team,
  g.away_score,
  g.home_score,
  (g.away_score - g.home_score) as away_margin
FROM picks p
JOIN games g ON p.game_id = g.id
WHERE p.id IN (106, 81, 102);

-- Expected results after fix:
-- Pick 106: spread_value=9.5, result='loss' (Ole Miss won by 7, needed 10+)
-- Pick 81: spread_value=10.5, result='loss' (Ole Miss won by 7, needed 11+)  
-- Pick 102: spread_value=10.5, result='loss' (Ole Miss won by 7, needed 11+)
