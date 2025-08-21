import { 
  evaluatePick, 
  evaluateGamePicks, 
  calculatePickStatistics,
  getPickResultExplanation
} from '../pickEvaluation';
import { Pick } from '../../types/pick';

describe('pickEvaluation', () => {
  const basePick: Pick = {
    id: 1,
    user_id: 'test-user',
    game_id: 1,
    pick_type: 'home_spread',
    spread_value: -3,
    submitted: true,
    is_triple_play: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  describe('evaluatePick', () => {

    describe('Home team spread picks', () => {
      test('Home favorite (-3) wins by more than spread', () => {
        const pick = { ...basePick, pick_type: 'home_spread' as const, spread_value: -3 };
        const result = evaluatePick(pick, 21, 17); // Home wins by 4, spread was -3
        expect(result).toBe('win');
      });

      test('Home favorite (-3) wins by exactly the spread', () => {
        const pick = { ...basePick, pick_type: 'home_spread' as const, spread_value: -3 };
        const result = evaluatePick(pick, 21, 18); // Home wins by 3, spread was -3
        expect(result).toBe('push');
      });

      test('Home favorite (-3) wins by less than spread', () => {
        const pick = { ...basePick, pick_type: 'home_spread' as const, spread_value: -3 };
        const result = evaluatePick(pick, 21, 19); // Home wins by 2, spread was -3
        expect(result).toBe('loss');
      });

      test('Home favorite (-3) loses', () => {
        const pick = { ...basePick, pick_type: 'home_spread' as const, spread_value: -3 };
        const result = evaluatePick(pick, 17, 21); // Home loses by 4
        expect(result).toBe('loss');
      });

      test('Home underdog (+3) wins outright', () => {
        const pick = { ...basePick, pick_type: 'home_spread' as const, spread_value: 3 };
        const result = evaluatePick(pick, 21, 17); // Home wins by 4
        expect(result).toBe('win');
      });

      test('Home underdog (+3) loses by less than spread', () => {
        const pick = { ...basePick, pick_type: 'home_spread' as const, spread_value: 3 };
        const result = evaluatePick(pick, 17, 19); // Home loses by 2, spread was +3
        expect(result).toBe('win');
      });

      test('Home underdog (+3) loses by exactly the spread', () => {
        const pick = { ...basePick, pick_type: 'home_spread' as const, spread_value: 3 };
        const result = evaluatePick(pick, 17, 20); // Home loses by 3, spread was +3
        expect(result).toBe('push');
      });

      test('Home underdog (+3) loses by more than spread', () => {
        const pick = { ...basePick, pick_type: 'home_spread' as const, spread_value: 3 };
        const result = evaluatePick(pick, 17, 21); // Home loses by 4, spread was +3
        expect(result).toBe('loss');
      });

      test('Pick em game (0 spread) - home wins', () => {
        const pick = { ...basePick, pick_type: 'home_spread' as const, spread_value: 0 };
        const result = evaluatePick(pick, 21, 17); // Home wins
        expect(result).toBe('win');
      });

      test('Pick em game (0 spread) - tie game', () => {
        const pick = { ...basePick, pick_type: 'home_spread' as const, spread_value: 0 };
        const result = evaluatePick(pick, 21, 21); // Tie
        expect(result).toBe('push');
      });

      test('Pick em game (0 spread) - home loses', () => {
        const pick = { ...basePick, pick_type: 'home_spread' as const, spread_value: 0 };
        const result = evaluatePick(pick, 17, 21); // Home loses
        expect(result).toBe('loss');
      });
    });

    describe('Away team spread picks', () => {
      test('Away favorite (home +3) wins by more than spread', () => {
        const pick = { ...basePick, pick_type: 'away_spread' as const, spread_value: 3 };
        const result = evaluatePick(pick, 17, 21); // Away wins by 4, away spread was -3
        expect(result).toBe('win');
      });

      test('Away favorite (home +3) wins by exactly the spread', () => {
        const pick = { ...basePick, pick_type: 'away_spread' as const, spread_value: 3 };
        const result = evaluatePick(pick, 18, 21); // Away wins by 3, away spread was -3
        expect(result).toBe('push');
      });

      test('Away favorite (home +3) wins by less than spread', () => {
        const pick = { ...basePick, pick_type: 'away_spread' as const, spread_value: 3 };
        const result = evaluatePick(pick, 19, 21); // Away wins by 2, away spread was -3
        expect(result).toBe('loss');
      });

      test('Away underdog (home -3) wins outright', () => {
        const pick = { ...basePick, pick_type: 'away_spread' as const, spread_value: -3 };
        const result = evaluatePick(pick, 17, 21); // Away wins by 4
        expect(result).toBe('win');
      });

      test('Away underdog (home -3) loses by less than spread', () => {
        const pick = { ...basePick, pick_type: 'away_spread' as const, spread_value: -3 };
        const result = evaluatePick(pick, 21, 19); // Away loses by 2, away spread was +3
        expect(result).toBe('win');
      });

      test('Away underdog (home -3) loses by exactly the spread', () => {
        const pick = { ...basePick, pick_type: 'away_spread' as const, spread_value: -3 };
        const result = evaluatePick(pick, 21, 18); // Away loses by 3, away spread was +3
        expect(result).toBe('push');
      });

      test('Away underdog (home -3) loses by more than spread', () => {
        const pick = { ...basePick, pick_type: 'away_spread' as const, spread_value: -3 };
        const result = evaluatePick(pick, 21, 17); // Away loses by 4, away spread was +3
        expect(result).toBe('loss');
      });
    });

    test('Throws error when spread value is null', () => {
      const pick = { ...basePick, spread_value: null };
      expect(() => evaluatePick(pick, 21, 17)).toThrow('No spread value available for pick evaluation');
    });

    test('Throws error when spread value is undefined', () => {
      const pick = { ...basePick, spread_value: undefined as number | undefined };
      expect(() => evaluatePick(pick, 21, 17)).toThrow('No spread value available for pick evaluation');
    });
  });

  describe('evaluateGamePicks', () => {
    test('Evaluates multiple picks correctly', () => {
      const picks: Pick[] = [
        {
          id: 1,
          user_id: 'user1',
          game_id: 1,
          pick_type: 'home_spread',
          spread_value: -3,
          submitted: true,
          is_triple_play: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          user_id: 'user2',
          game_id: 1,
          pick_type: 'away_spread',
          spread_value: 3,
          submitted: true,
          is_triple_play: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      const results = evaluateGamePicks(picks, 21, 17); // Home wins by 4

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        pickId: 1,
        result: 'win',
        actualMargin: 4,
        requiredMargin: 3 // Home needed to win by more than 3
      });
      expect(results[1]).toEqual({
        pickId: 2,
        result: 'loss',
        actualMargin: 4,
        requiredMargin: -3 // Away spread was +3, so required margin is -3
      });
    });

    test('Handles empty picks array', () => {
      const results = evaluateGamePicks([], 21, 17);
      expect(results).toEqual([]);
    });
  });

  describe('calculatePickStatistics', () => {
    test('Calculates stats for picks with results', () => {
      const picks: Pick[] = [
        { ...basePick, id: 1, result: 'win', is_triple_play: false },
        { ...basePick, id: 2, result: 'win', is_triple_play: true },
        { ...basePick, id: 3, result: 'loss', is_triple_play: false },
        { ...basePick, id: 4, result: 'push', is_triple_play: false },
        { ...basePick, id: 5, result: 'loss', is_triple_play: true },
        { ...basePick, id: 6, result: null, is_triple_play: false } // Unevaluated pick
      ];

      const stats = calculatePickStatistics(picks);

      expect(stats.totalPicks).toBe(5); // Excludes unevaluated pick
      expect(stats.wins).toBe(2);
      expect(stats.losses).toBe(2);
      expect(stats.pushes).toBe(1);
      expect(stats.winPercentage).toBe(50); // 2 wins out of 4 decided picks
      expect(stats.triplePlayTotal).toBe(2);
      expect(stats.triplePlayWins).toBe(1);
    });

    test('Calculates stats for empty picks', () => {
      const stats = calculatePickStatistics([]);
      
      expect(stats.totalPicks).toBe(0);
      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.pushes).toBe(0);
      expect(stats.winPercentage).toBe(0);
      expect(stats.triplePlayTotal).toBe(0);
      expect(stats.triplePlayWins).toBe(0);
    });

    test('Handles all wins', () => {
      const picks: Pick[] = [
        { ...basePick, id: 1, result: 'win', is_triple_play: false },
        { ...basePick, id: 2, result: 'win', is_triple_play: true }
      ];

      const stats = calculatePickStatistics(picks);
      expect(stats.winPercentage).toBe(100);
    });

    test('Handles all pushes (no wins or losses)', () => {
      const picks: Pick[] = [
        { ...basePick, id: 1, result: 'push', is_triple_play: false },
        { ...basePick, id: 2, result: 'push', is_triple_play: false }
      ];

      const stats = calculatePickStatistics(picks);
      expect(stats.winPercentage).toBe(0); // No decided games
      expect(stats.totalPicks).toBe(2);
    });
  });

  describe('getPickResultExplanation', () => {
    const pick: Pick = {
      ...basePick,
      pick_type: 'home_spread',
      spread_value: -3
    };

    test('Explains winning pick', () => {
      const explanation = getPickResultExplanation(pick, 'Chiefs', 'Raiders', 21, 17);
      expect(explanation).toContain('You picked Chiefs -3');
      expect(explanation).toContain('Final score: Raiders 17, Chiefs 21');
      expect(explanation).toContain('Chiefs covered the spread - you won!');
    });

    test('Explains losing pick', () => {
      const explanation = getPickResultExplanation(pick, 'Chiefs', 'Raiders', 21, 19);
      expect(explanation).toContain('You picked Chiefs -3');
      expect(explanation).toContain('Final score: Raiders 19, Chiefs 21');
      expect(explanation).toContain('Chiefs did not cover the spread - you lost.');
    });

    test('Explains push', () => {
      const explanation = getPickResultExplanation(pick, 'Chiefs', 'Raiders', 21, 18);
      expect(explanation).toContain('You picked Chiefs -3');
      expect(explanation).toContain('Final score: Raiders 18, Chiefs 21');
      expect(explanation).toContain('The margin exactly matched the spread - it\'s a push (tie).');
    });

    test('Handles positive spread display', () => {
      const underdogPick = { ...pick, spread_value: 3 };
      const explanation = getPickResultExplanation(underdogPick, 'Chiefs', 'Raiders', 17, 21);
      expect(explanation).toContain('You picked Chiefs +3');
    });

    test('Handles missing spread', () => {
      const noSpreadPick = { ...pick, spread_value: null };
      const explanation = getPickResultExplanation(noSpreadPick, 'Chiefs', 'Raiders', 21, 17);
      expect(explanation).toBe('No spread available for evaluation');
    });
  });
});