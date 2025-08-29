import { evaluatePick } from './src/lib/pickEvaluation';
import { Pick } from './src/types/pick';

describe('Nebraska vs Cincinnati Bug Fix', () => {
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

  test('Nebraska -6.5 home spread with 20-17 final score should be LOSS', () => {
    console.log('🏈 Testing Nebraska vs Cincinnati Game Issue');
    console.log('='.repeat(50));
    console.log('Final Score: Nebraska 20, Cincinnati 17');
    console.log('Margin: Nebraska won by 3 points');
    console.log('Spread: Nebraska -6.5');
    console.log('Expected: LOSS (needed to win by 7+ points)');
    console.log('');

    // Test if Nebraska is the home team (-6.5 spread)
    const homeResult = evaluatePick(basePick, 20, 17);
    console.log(`Home scenario result: ${homeResult}`);
    console.log(`Status: ${homeResult === 'loss' ? '✅ CORRECT' : '❌ BUG!'}`);
    
    expect(homeResult).toBe('loss');
  });

  test('Nebraska -6.5 away spread with 17-20 final score should be LOSS', () => {
    // Test if Nebraska is the away team
    const awayPick: Pick = {
      ...basePick,
      pick_type: 'away_spread',
      spread_value: 6.5  // If Nebraska is -6.5, home team would be +6.5
    };

    const awayResult = evaluatePick(awayPick, 17, 20);
    console.log('');
    console.log('Away scenario:');
    console.log(`Away scenario result: ${awayResult}`);
    console.log(`Status: ${awayResult === 'loss' ? '✅ CORRECT' : '❌ BUG!'}`);
    
    expect(awayResult).toBe('loss');
  });

  test('Verify evaluation logic with different scenarios', () => {
    console.log('');
    console.log('🧪 Additional test scenarios:');
    console.log('-'.repeat(30));

    // Nebraska wins by exactly 6.5 points (impossible, but closest would be 7)
    const exactWin = evaluatePick(basePick, 24, 17); // Won by 7
    console.log(`Nebraska -6.5, won by 7: ${exactWin} (should be win)`);
    expect(exactWin).toBe('win');

    // Nebraska wins by exactly 6 points (less than spread)
    const closeWin = evaluatePick(basePick, 23, 17); // Won by 6  
    console.log(`Nebraska -6.5, won by 6: ${closeWin} (should be loss)`);
    expect(closeWin).toBe('loss');

    // Nebraska loses outright
    const loss = evaluatePick(basePick, 17, 20); // Lost by 3
    console.log(`Nebraska -6.5, lost by 3: ${loss} (should be loss)`);
    expect(loss).toBe('loss');
  });
});
