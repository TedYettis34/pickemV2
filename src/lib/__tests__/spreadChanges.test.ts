import { 
  calculateSpreadChange, 
  enhancePicksWithSpreadChanges, 
  getSpreadChangeDisplayText, 
  getSpreadChangeClasses 
} from '../spreadChanges';
import { PickWithGame, SpreadChange } from '../../types/pick';
import { Game } from '../../types/game';

describe('spreadChanges', () => {
  const mockGame: Game = {
    id: 1,
    external_id: 'game1',
    week_id: 1,
    home_team: 'Team A',
    away_team: 'Team B',
    commence_time: '2025-12-25T20:00:00Z', // Future date
    sport: 'americanfootball_nfl',
    spread_home: -3.5,
    spread_away: 3.5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockHomeSpreadPick: PickWithGame = {
    id: 1,
    user_id: 'user-123',
    game_id: 1,
    pick_type: 'home_spread',
    spread_value: -7.0, // Original spread when pick was made (worse than current -3.5)
    submitted: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    game: mockGame
  };

  const mockAwaySpreadPick: PickWithGame = {
    id: 2,
    user_id: 'user-123',
    game_id: 1,
    pick_type: 'away_spread',
    spread_value: 7.0, // Original spread when pick was made
    submitted: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    game: mockGame
  };

  describe('calculateSpreadChange', () => {
    it('should return undefined for pick with null spread_value', () => {
      const pick = { ...mockHomeSpreadPick, spread_value: null };
      const result = calculateSpreadChange(pick);
      expect(result).toBeUndefined();
    });

    it('should return undefined for pick with undefined spread_value', () => {
      const pick = { ...mockHomeSpreadPick, spread_value: undefined };
      const result = calculateSpreadChange(pick);
      expect(result).toBeUndefined();
    });

    it('should return undefined when current spread is null', () => {
      const gameWithNullSpread = { ...mockGame, spread_home: null };
      const pick = { ...mockHomeSpreadPick, game: gameWithNullSpread };
      const result = calculateSpreadChange(pick);
      expect(result).toBeUndefined();
    });

    it('should return no change when spreads are identical', () => {
      const pick = { ...mockHomeSpreadPick, spread_value: -3.5 }; // Same as current
      const result = calculateSpreadChange(pick);
      
      expect(result).toEqual({
        hasChanged: false,
        originalSpread: -3.5,
        currentSpread: -3.5,
        isFavorable: false
      });
    });

    it('should handle floating point precision correctly', () => {
      const pick = { ...mockHomeSpreadPick, spread_value: -3.5001 }; // Tiny difference
      const result = calculateSpreadChange(pick);
      
      expect(result?.hasChanged).toBe(false);
    });

    it('should detect favorable change for home spread (spread improved)', () => {
      const pick = { ...mockHomeSpreadPick, spread_value: -7.0 }; // Original was -7, now -3.5
      const result = calculateSpreadChange(pick);
      
      expect(result).toEqual({
        hasChanged: true,
        originalSpread: -7.0,
        currentSpread: -3.5,
        isFavorable: true,
        improvementAmount: 3.5
      });
    });

    it('should detect unfavorable change for home spread (spread worsened)', () => {
      const pick = { ...mockHomeSpreadPick, spread_value: -1.0 }; // Original was -1, now -3.5
      const result = calculateSpreadChange(pick);
      
      expect(result).toEqual({
        hasChanged: true,
        originalSpread: -1.0,
        currentSpread: -3.5,
        isFavorable: false,
        improvementAmount: undefined
      });
    });

    it('should detect favorable change for away spread (spread improved)', () => {
      const pick = { ...mockAwaySpreadPick, spread_value: 1.0 }; // Original was +1, now +3.5
      const result = calculateSpreadChange(pick);
      
      expect(result).toEqual({
        hasChanged: true,
        originalSpread: 1.0,
        currentSpread: 3.5,
        isFavorable: true,
        improvementAmount: 2.5
      });
    });

    it('should detect unfavorable change for away spread (spread worsened)', () => {
      const pick = { ...mockAwaySpreadPick, spread_value: 7.0 }; // Original was +7, now +3.5
      const result = calculateSpreadChange(pick);
      
      expect(result).toEqual({
        hasChanged: true,
        originalSpread: 7.0,
        currentSpread: 3.5,
        isFavorable: false,
        improvementAmount: undefined
      });
    });

    it('should handle home spread going from negative to positive', () => {
      const gameWithPositiveSpread = { ...mockGame, spread_home: 2.0, spread_away: -2.0 };
      const pick = { ...mockHomeSpreadPick, spread_value: -3.0, game: gameWithPositiveSpread };
      const result = calculateSpreadChange(pick);
      
      expect(result).toEqual({
        hasChanged: true,
        originalSpread: -3.0,
        currentSpread: 2.0,
        isFavorable: true,
        improvementAmount: 5.0
      });
    });
  });

  describe('enhancePicksWithSpreadChanges', () => {
    it('should enhance picks with spread change information', () => {
      const picks = [mockHomeSpreadPick];
      const enhanced = enhancePicksWithSpreadChanges(picks);
      
      expect(enhanced).toHaveLength(1);
      expect(enhanced[0]).toHaveProperty('spreadChange');
      expect(enhanced[0]).toHaveProperty('canUpdateToCurrentLine');
      
      // Should be true because: not submitted, future game, and favorable spread change (-7 to -3.5)
      expect(enhanced[0].canUpdateToCurrentLine).toBe(true);
    });

    it('should prevent updates for submitted picks', () => {
      const submittedPick = { ...mockHomeSpreadPick, submitted: true };
      const picks = [submittedPick];
      const enhanced = enhancePicksWithSpreadChanges(picks);
      
      expect(enhanced[0].canUpdateToCurrentLine).toBe(false);
    });

    it('should prevent updates for started games', () => {
      const pastGame = { ...mockGame, commence_time: '2020-01-01T20:00:00Z' }; // Past date
      const pick = { ...mockHomeSpreadPick, game: pastGame };
      const picks = [pick];
      const enhanced = enhancePicksWithSpreadChanges(picks);
      
      expect(enhanced[0].canUpdateToCurrentLine).toBe(false);
    });

    it('should prevent updates for unfavorable changes', () => {
      const pick = { ...mockHomeSpreadPick, spread_value: -1.0 }; // Unfavorable change
      const picks = [pick];
      const enhanced = enhancePicksWithSpreadChanges(picks);
      
      expect(enhanced[0].canUpdateToCurrentLine).toBe(false);
    });

    it('should allow updates for favorable changes on future unsubmitted picks', () => {
      const pick = { ...mockHomeSpreadPick, spread_value: -7.0 }; // Favorable change
      const picks = [pick];
      const enhanced = enhancePicksWithSpreadChanges(picks);
      
      expect(enhanced[0].canUpdateToCurrentLine).toBe(true);
    });
  });

  describe('getSpreadChangeDisplayText', () => {
    it('should format favorable change with improvement amount', () => {
      const spreadChange: SpreadChange = {
        hasChanged: true,
        originalSpread: -7.0,
        currentSpread: -3.5,
        isFavorable: true,
        improvementAmount: 3.5
      };
      
      const result = getSpreadChangeDisplayText(spreadChange);
      expect(result).toBe('-7 → -3.5 (+3.5 better!)');
    });

    it('should format unfavorable change without improvement text', () => {
      const spreadChange: SpreadChange = {
        hasChanged: true,
        originalSpread: -1.0,
        currentSpread: -3.5,
        isFavorable: false
      };
      
      const result = getSpreadChangeDisplayText(spreadChange);
      expect(result).toBe('-1 → -3.5');
    });

    it('should format positive spreads with plus signs', () => {
      const spreadChange: SpreadChange = {
        hasChanged: true,
        originalSpread: 3.0,
        currentSpread: 7.0,
        isFavorable: true,
        improvementAmount: 4.0
      };
      
      const result = getSpreadChangeDisplayText(spreadChange);
      expect(result).toBe('+3 → +7 (+4.0 better!)');
    });

    it('should handle decimal improvements correctly', () => {
      const spreadChange: SpreadChange = {
        hasChanged: true,
        originalSpread: -6.5,
        currentSpread: -3.0,
        isFavorable: true,
        improvementAmount: 3.5
      };
      
      const result = getSpreadChangeDisplayText(spreadChange);
      expect(result).toBe('-6.5 → -3 (+3.5 better!)');
    });
  });

  describe('getSpreadChangeClasses', () => {
    it('should return empty string for undefined spread change', () => {
      const result = getSpreadChangeClasses(undefined);
      expect(result).toBe('');
    });

    it('should return empty string for no change', () => {
      const spreadChange: SpreadChange = {
        hasChanged: false,
        originalSpread: -3.5,
        currentSpread: -3.5,
        isFavorable: false
      };
      
      const result = getSpreadChangeClasses(spreadChange);
      expect(result).toBe('');
    });

    it('should return green classes for favorable changes', () => {
      const spreadChange: SpreadChange = {
        hasChanged: true,
        originalSpread: -7.0,
        currentSpread: -3.5,
        isFavorable: true,
        improvementAmount: 3.5
      };
      
      const result = getSpreadChangeClasses(spreadChange);
      expect(result).toBe('text-green-600 dark:text-green-400 font-medium');
    });

    it('should return orange classes for unfavorable changes', () => {
      const spreadChange: SpreadChange = {
        hasChanged: true,
        originalSpread: -1.0,
        currentSpread: -3.5,
        isFavorable: false
      };
      
      const result = getSpreadChangeClasses(spreadChange);
      expect(result).toBe('text-orange-600 dark:text-orange-400');
    });
  });
});