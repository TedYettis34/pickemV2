import { evaluatePick } from './src/lib/pickEvaluation';
import { Pick } from './src/types/pick';

// Test the Nebraska vs Cincinnati scenario
const basePick: Pick = {
  id: 1,
  user_id: 'test-user',
  game_id: 1,
  pick_type: 'home_spread',
  spread_value: -6.5,
  submitted: true,
  is_triple_play: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

console.log('='.repeat(60));
console.log('DEBUGGING NEBRASKA -6.5 PICK EVALUATION');
console.log('='.repeat(60));
console.log('Final Score: Nebraska 20, Cincinnati 17 (Nebraska won by 3)');
console.log('Spread: Nebraska -6.5');
console.log('Expected Result: LOSS (Nebraska needed to win by MORE than 6.5)');
console.log('');

// Test if Nebraska is the home team with -6.5 spread
console.log('Case 1: Nebraska is HOME team (-6.5 spread)');
console.log('- pick_type: home_spread');
console.log('- spread_value: -6.5');
console.log('- homeScore: 20, awayScore: 17 (home won by 3)');

const homeResult = evaluatePick(basePick, 20, 17);
console.log(`- Actual Result: ${homeResult}`);
console.log(`- Expected: loss`);
console.log(`- Status: ${homeResult === 'loss' ? '✅ CORRECT' : '❌ BUG DETECTED'}`);
console.log('');

// Test if Nebraska is the away team with -6.5 spread
const awayPick: Pick = {
  ...basePick,
  pick_type: 'away_spread',
  spread_value: 6.5  // If Nebraska is -6.5, then when picked as away team, home team would be +6.5
};

console.log('Case 2: Nebraska is AWAY team (-6.5 spread)');
console.log('- pick_type: away_spread'); 
console.log('- spread_value: 6.5 (home team spread, Nebraska is -6.5 favorite)');
console.log('- homeScore: 17, awayScore: 20 (away won by 3)');

const awayResult = evaluatePick(awayPick, 17, 20);
console.log(`- Actual Result: ${awayResult}`);
console.log(`- Expected: loss`);
console.log(`- Status: ${awayResult === 'loss' ? '✅ CORRECT' : '❌ BUG DETECTED'}`);
console.log('');

// Additional edge case testing
console.log('='.repeat(30));
console.log('EDGE CASE TESTING');
console.log('='.repeat(30));

// Test exact push scenario
const pushPick: Pick = { ...basePick, spread_value: -3 };
const pushResult = evaluatePick(pushPick, 20, 17); // Won by exactly 3
console.log(`Nebraska -3, won by 3: ${pushResult} (should be push)`);

// Test clear win scenario  
const winPick: Pick = { ...basePick, spread_value: -2.5 };
const winResult = evaluatePick(winPick, 20, 17); // Won by 3, needed 2.5
console.log(`Nebraska -2.5, won by 3: ${winResult} (should be win)`);

// Test clear loss scenario
const lossPick: Pick = { ...basePick, spread_value: -7 };
const lossResult = evaluatePick(lossPick, 20, 17); // Won by 3, needed 7
console.log(`Nebraska -7, won by 3: ${lossResult} (should be loss)`);
