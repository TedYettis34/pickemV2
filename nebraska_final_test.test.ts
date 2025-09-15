import { evaluatePick } from './src/lib/pickEvaluation';
import { Pick } from './src/types/pick';

describe('Nebraska Spread Evaluation - Final Validation', () => {
  // Test the exact scenario described in the GitHub issue
  test('Nebraska -6.5 home spread, won by 3, should be LOSS (exact issue scenario)', () => {
    const pick: Pick = {
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

    // Nebraska (home) 20, Cincinnati (away) 17
    // Nebraska won by 3, but needed to win by MORE than 6.5
    const result = evaluatePick(pick, 20, 17);
    
    expect(result).toBe('loss');
  });

  test('Nebraska -6.5 away spread, won by 3, should be LOSS', () => {
    const pick: Pick = {
      id: 2,
      user_id: 'test-user',
      game_id: 2,
      pick_type: 'away_spread',
      spread_value: 6.5, // Home team gets +6.5, away team (Nebraska) is -6.5
      submitted: true,
      is_triple_play: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    // Cincinnati (home) 17, Nebraska (away) 20
    // Nebraska won by 3, but needed to win by MORE than 6.5
    const result = evaluatePick(pick, 17, 20);
    
    expect(result).toBe('loss');
  });

  test('Comprehensive favorite spread scenarios', () => {
    const basePick: Pick = {
      id: 3,
      user_id: 'test-user',
      game_id: 3,
      pick_type: 'home_spread',
      spread_value: -6.5,
      submitted: true,
      is_triple_play: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    // Home favorite -6.5, various margins
    expect(evaluatePick(basePick, 20, 17)).toBe('loss');  // Won by 3 < 6.5
    expect(evaluatePick(basePick, 23, 17)).toBe('loss');  // Won by 6 < 6.5
    expect(evaluatePick(basePick, 24, 17)).toBe('win');   // Won by 7 > 6.5
    expect(evaluatePick(basePick, 27, 17)).toBe('win');   // Won by 10 > 6.5
    expect(evaluatePick(basePick, 17, 20)).toBe('loss');  // Lost by 3
    
    // Integer spread for push scenarios
    const pushPick = { ...basePick, spread_value: -6 };
    expect(evaluatePick(pushPick, 23, 17)).toBe('push');  // Won by exactly 6
    expect(evaluatePick(pushPick, 22, 17)).toBe('loss');  // Won by 5 < 6
    expect(evaluatePick(pushPick, 24, 17)).toBe('win');   // Won by 7 > 6
  });

  test('Away team favorite scenarios', () => {
    const awayFavoritePick: Pick = {
      id: 4,
      user_id: 'test-user',
      game_id: 4,
      pick_type: 'away_spread',
      spread_value: 6.5, // Home gets +6.5, away is -6.5 favorite
      submitted: true,
      is_triple_play: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    // Away team needs to win by MORE than 6.5
    expect(evaluatePick(awayFavoritePick, 17, 20)).toBe('loss'); // Away won by 3 < 6.5
    expect(evaluatePick(awayFavoritePick, 17, 23)).toBe('loss'); // Away won by 6 < 6.5
    expect(evaluatePick(awayFavoritePick, 17, 24)).toBe('win');  // Away won by 7 > 6.5
    expect(evaluatePick(awayFavoritePick, 20, 17)).toBe('loss'); // Away lost by 3

    // Integer spread
    const pushPick = { ...awayFavoritePick, spread_value: 6 };
    expect(evaluatePick(pushPick, 17, 23)).toBe('push');  // Away won by exactly 6
  });

  test('Underdog scenarios', () => {
    // Home underdog +3.5
    const homeUnderdogPick: Pick = {
      id: 5,
      user_id: 'test-user',
      game_id: 5,
      pick_type: 'home_spread',
      spread_value: 3.5,
      submitted: true,
      is_triple_play: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    expect(evaluatePick(homeUnderdogPick, 20, 17)).toBe('win');  // Home won outright
    expect(evaluatePick(homeUnderdogPick, 17, 20)).toBe('win');  // Home lost by 3 < 3.5
    expect(evaluatePick(homeUnderdogPick, 16, 20)).toBe('loss'); // Home lost by 4 > 3.5
    
    // Integer for push
    const pushPick = { ...homeUnderdogPick, spread_value: 3 };
    expect(evaluatePick(pushPick, 17, 20)).toBe('push');  // Home lost by exactly 3
  });

  test('Pick em (0 spread)', () => {
    const pickEmPick: Pick = {
      id: 6,
      user_id: 'test-user',
      game_id: 6,
      pick_type: 'home_spread',
      spread_value: 0,
      submitted: true,
      is_triple_play: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    expect(evaluatePick(pickEmPick, 21, 20)).toBe('win');  // Home won by 1
    expect(evaluatePick(pickEmPick, 20, 20)).toBe('push'); // Tie
    expect(evaluatePick(pickEmPick, 20, 21)).toBe('loss'); // Home lost by 1
  });

  test('Invalid spread handling', () => {
    const invalidPick: Pick = {
      id: 7,
      user_id: 'test-user',
      game_id: 7,
      pick_type: 'home_spread',
      spread_value: null,
      submitted: true,
      is_triple_play: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    expect(() => evaluatePick(invalidPick, 20, 17)).toThrow('No spread value available for pick evaluation');
  });
});
