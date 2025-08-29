const { evaluatePick } = require('./src/lib/pickEvaluation.ts');

// Test the Nebraska vs Cincinnati scenario
const pick = {
  id: 1,
  user_id: 'test-user',
  game_id: 1,
  pick_type: 'home_spread', // Assuming Nebraska is home team
  spread_value: -6.5,
  submitted: true,
  is_triple_play: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

// Final Score: Nebraska 20, Cincinnati 17
// If Nebraska is home: homeScore = 20, awayScore = 17
// If Nebraska is away: homeScore = 17, awayScore = 20

console.log('Testing Nebraska -6.5 scenario:');
console.log('Final Score: Nebraska 20, Cincinnati 17 (Nebraska won by 3)');
console.log('Spread: Nebraska -6.5');
console.log('');

// Test if Nebraska is the home team
console.log('Case 1: Nebraska is HOME team');
console.log('pick_type: home_spread, spread_value: -6.5');
console.log('homeScore: 20, awayScore: 17');
const result1 = evaluatePick(pick, 20, 17);
console.log('Result:', result1);
console.log('Expected: loss (Nebraska only won by 3, needed to win by more than 6.5)');
console.log('');

// Test if Nebraska is the away team
const awayPick = {
  ...pick,
  pick_type: 'away_spread',
  spread_value: 6.5  // Home team spread would be +6.5, so away spread is -6.5
};
console.log('Case 2: Nebraska is AWAY team');
console.log('pick_type: away_spread, spread_value: 6.5 (home team has +6.5)');
console.log('homeScore: 17, awayScore: 20');
const result2 = evaluatePick(awayPick, 17, 20);
console.log('Result:', result2);
console.log('Expected: loss (Nebraska only won by 3, needed to win by more than 6.5)');
