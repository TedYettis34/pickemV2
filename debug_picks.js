
// Debug script to verify the logic
const { evaluatePick } = require('./src/lib/pickEvaluation');

const mockPick = {
  id: 1,
  user_id: 'test',
  game_id: 1,
  pick_type: 'home_spread',  // If Nebraska was home
  spread_value: -6.5,
  submitted: true,
  is_triple_play: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Test both scenarios
console.log('=== DEBUGGING NEBRASKA EVALUATION ===');
console.log('Final Score: Nebraska 20, Cincinnati 17');
console.log('');

// Scenario 1: Nebraska is home team
console.log('Scenario 1: Nebraska is HOME team');
console.log('Pick: Nebraska -6.5 (home_spread)');
console.log('homeScore: 20, awayScore: 17');
const result1 = evaluatePick(mockPick, 20, 17);
console.log(`Result: ${result1}`);
console.log(`Expected: loss (won by 3, needed 6.5+)`);
console.log(`Status: ${result1 === 'loss' ? '✅ CORRECT' : '❌ BUG'}`);
console.log('');

// Scenario 2: Nebraska is away team  
const awayPick = { ...mockPick, pick_type: 'away_spread', spread_value: 6.5 };
console.log('Scenario 2: Nebraska is AWAY team');
console.log('Pick: Nebraska -6.5 (shown as away_spread 6.5)');
console.log('homeScore: 17, awayScore: 20');
const result2 = evaluatePick(awayPick, 17, 20);
console.log(`Result: ${result2}`);
console.log(`Expected: loss (won by 3, needed 6.5+)`);
console.log(`Status: ${result2 === 'loss' ? '✅ CORRECT' : '❌ BUG'}`);
