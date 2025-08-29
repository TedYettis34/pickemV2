import { evaluatePick } from './src/lib/pickEvaluation';
import { Pick } from './src/types/pick';

describe('Debug Nebraska -6.5 scenario', () => {
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

  test('Nebraska -6.5 home favorite, won by 3 points should be LOSS', () => {
    // Final Score: Nebraska (home) 20, Cincinnati (away) 17
    // Nebraska won by 3, but needed to win by more than 6.5
    const result = evaluatePick(basePick, 20, 17);
    
    console.log('='.repeat(60));
    console.log('NEBRASKA -6.5 DEBUG TEST');
    console.log('='.repeat(60));
    console.log('Final Score: Nebraska (home) 20, Cincinnati (away) 17');
    console.log('Spread: Nebraska -6.5');
    console.log('Margin: Nebraska won by 3 points');
    console.log('Required: Nebraska needs to win by MORE than 6.5 points');
    console.log(`Result: ${result}`);
    console.log(`Expected: loss`);
    console.log(`Status: ${result === 'loss' ? '✅ CORRECT' : '❌ BUG FOUND!'}`);
    console.log('');
    
    expect(result).toBe('loss');
  });

  test('Nebraska -6.5 away favorite, won by 3 points should be LOSS', () => {
    // If Nebraska is away team with -6.5 spread
    const awayPick: Pick = {
      ...basePick,
      pick_type: 'away_spread',
      spread_value: 6.5  // Home team gets +6.5, meaning Nebraska (away) is -6.5
    };
    
    // Final Score: Cincinnati (home) 17, Nebraska (away) 20
    const result = evaluatePick(awayPick, 17, 20);
    
    console.log('Nebraska as AWAY team scenario:');
    console.log('Final Score: Cincinnati (home) 17, Nebraska (away) 20');
    console.log('Home team spread: +6.5 (Nebraska is -6.5)');
    console.log('Margin: Nebraska won by 3 points');
    console.log(`Result: ${result}`);
    console.log(`Expected: loss`);
    console.log(`Status: ${result === 'loss' ? '✅ CORRECT' : '❌ BUG FOUND!'}`);
    
    expect(result).toBe('loss');
  });

  test('Additional scenarios for verification', () => {
    // Nebraska -3, won by 3 (should be push)
    const pushPick: Pick = { ...basePick, spread_value: -3 };
    const pushResult = evaluatePick(pushPick, 20, 17);
    expect(pushResult).toBe('push');

    // Nebraska -2.5, won by 3 (should be win)
    const winPick: Pick = { ...basePick, spread_value: -2.5 };
    const winResult = evaluatePick(winPick, 20, 17);
    expect(winResult).toBe('win');

    // Nebraska -7, won by 3 (should be loss)
    const lossPick: Pick = { ...basePick, spread_value: -7 };
    const lossResult = evaluatePick(lossPick, 20, 17);
    expect(lossResult).toBe('loss');

    console.log('Edge cases:');
    console.log(`Nebraska -3, won by 3: ${pushResult} ✅`);
    console.log(`Nebraska -2.5, won by 3: ${winResult} ✅`);
    console.log(`Nebraska -7, won by 3: ${lossResult} ✅`);
  });
});
