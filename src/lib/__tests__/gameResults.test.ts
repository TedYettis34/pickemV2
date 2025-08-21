import { 
  updateGameResult, 
  getPicksForGame,
  updatePickResults,
  finalizeGameResult,
  getGamesNeedingResults,
  getCompletedGames,
  reevaluateGamePicks
} from '../gameResults';
import { GamePickEvaluation } from '../pickEvaluation';

// Mock the database module
jest.mock('../database');

import { query } from '../database';
const mockQuery = query as jest.MockedFunction<typeof query>;

// Mock the pickEvaluation module
jest.mock('../pickEvaluation');
import { evaluateGamePicks } from '../pickEvaluation';
const mockEvaluateGamePicks = evaluateGamePicks as jest.MockedFunction<typeof evaluateGamePicks>;

describe('gameResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateGameResult', () => {
    test('Updates game with final score and status', async () => {
      const mockGame = {
        id: 1,
        week_id: 1,
        sport: 'americanfootball_nfl' as const,
        external_id: 'test-game',
        home_team: 'Chiefs',
        away_team: 'Raiders',
        commence_time: '2024-01-01T00:00:00Z',
        spread_home: -3,
        spread_away: 3,
        total_over_under: 47.5,
        moneyline_home: -150,
        moneyline_away: 130,
        bookmaker: 'fanduel',
        odds_last_updated: '2024-01-01T00:00:00Z',
        must_pick: false,
        home_score: 21,
        away_score: 17,
        game_status: 'final' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.mockResolvedValue([mockGame]);

      const result = await updateGameResult(1, 21, 17, 'final');

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE games \n       SET home_score = $1, away_score = $2, game_status = $3, updated_at = CURRENT_TIMESTAMP\n       WHERE id = $4\n       RETURNING *`,
        [21, 17, 'final', 1]
      );
      expect(result).toEqual(mockGame);
    });

    test('Throws error when game not found', async () => {
      mockQuery.mockResolvedValue([]);

      await expect(updateGameResult(999, 21, 17)).rejects.toThrow('Game not found');
    });

    test('Uses default status of "final"', async () => {
      const mockGame = { id: 1, home_score: 21, away_score: 17, game_status: 'final' };
      mockQuery.mockResolvedValue([mockGame]);

      await updateGameResult(1, 21, 17);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [21, 17, 'final', 1]
      );
    });
  });

  describe('getPicksForGame', () => {
    test('Returns picks for a game', async () => {
      const mockPicks = [
        {
          id: 1,
          user_id: 'user1',
          game_id: 1,
          pick_type: 'home_spread' as const,
          spread_value: -3,
          submitted: true,
          is_triple_play: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockQuery.mockResolvedValue(mockPicks);

      const result = await getPicksForGame(1);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM picks WHERE game_id = $1',
        [1]
      );
      expect(result).toEqual(mockPicks);
    });

    test('Returns empty array when no picks found', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await getPicksForGame(999);

      expect(result).toEqual([]);
    });
  });

  describe('updatePickResults', () => {
    test('Updates pick results in database', async () => {
      const evaluations: GamePickEvaluation[] = [
        {
          pickId: 1,
          result: 'win',
          actualMargin: 4,
          requiredMargin: 3
        },
        {
          pickId: 2,
          result: 'loss',
          actualMargin: 4,
          requiredMargin: -3
        }
      ];

      mockQuery.mockResolvedValue([]);

      await updatePickResults(evaluations);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(1,
        `UPDATE picks \n         SET result = $1, evaluated_at = CURRENT_TIMESTAMP\n         WHERE id = $2`,
        ['win', 1]
      );
      expect(mockQuery).toHaveBeenNthCalledWith(2,
        `UPDATE picks \n         SET result = $1, evaluated_at = CURRENT_TIMESTAMP\n         WHERE id = $2`,
        ['loss', 2]
      );
    });

    test('Handles empty evaluations array', async () => {
      await updatePickResults([]);

      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('finalizeGameResult', () => {
    test('Updates game and evaluates all picks', async () => {
      const mockGame = {
        id: 1,
        home_score: 21,
        away_score: 17,
        game_status: 'final'
      };

      const mockPicks = [
        {
          id: 1,
          user_id: 'user1',
          game_id: 1,
          pick_type: 'home_spread' as const,
          spread_value: -3,
          submitted: true,
          is_triple_play: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockEvaluations: GamePickEvaluation[] = [
        {
          pickId: 1,
          result: 'win',
          actualMargin: 4,
          requiredMargin: 3
        }
      ];

      // Mock the three main operations
      mockQuery
        .mockResolvedValueOnce([mockGame]) // updateGameResult
        .mockResolvedValueOnce(mockPicks)   // getPicksForGame
        .mockResolvedValue([]);             // updatePickResults (called once per evaluation)

      mockEvaluateGamePicks.mockReturnValue(mockEvaluations);

      const result = await finalizeGameResult(1, 21, 17);

      expect(result.game).toEqual(mockGame);
      expect(result.pickEvaluations).toEqual(mockEvaluations);
      expect(result.picksUpdated).toBe(1);
      expect(mockEvaluateGamePicks).toHaveBeenCalledWith(mockPicks, 21, 17);
    });
  });

  describe('getGamesNeedingResults', () => {
    test('Returns games without results for all weeks', async () => {
      const mockGames = [
        {
          id: 1,
          game_status: 'final',
          home_score: null,
          away_score: null,
          commence_time: '2024-01-01T00:00:00Z'
        }
      ];

      mockQuery.mockResolvedValue(mockGames);

      const result = await getGamesNeedingResults();

      expect(mockQuery).toHaveBeenCalledWith(
        `\n      SELECT * FROM games \n      WHERE game_status IN ('final', 'in_progress') \n        AND (home_score IS NULL OR away_score IS NULL)\n      ORDER BY commence_time ASC\n    `,
        []
      );
      expect(result).toEqual(mockGames);
    });

    test('Returns games without results for specific week', async () => {
      const mockGames = [
        {
          id: 1,
          week_id: 1,
          game_status: 'final',
          home_score: null,
          away_score: null
        }
      ];

      mockQuery.mockResolvedValue(mockGames);

      const result = await getGamesNeedingResults(1);

      expect(mockQuery).toHaveBeenCalledWith(
        `\n        SELECT * FROM games \n        WHERE week_id = $1 \n          AND game_status IN ('final', 'in_progress')\n          AND (home_score IS NULL OR away_score IS NULL)\n        ORDER BY commence_time ASC\n      `,
        [1]
      );
      expect(result).toEqual(mockGames);
    });
  });

  describe('getCompletedGames', () => {
    test('Returns completed games for all weeks', async () => {
      const mockGames = [
        {
          id: 1,
          game_status: 'final',
          home_score: 21,
          away_score: 17,
          commence_time: '2024-01-01T00:00:00Z'
        }
      ];

      mockQuery.mockResolvedValue(mockGames);

      const result = await getCompletedGames();

      expect(mockQuery).toHaveBeenCalledWith(
        `\n      SELECT * FROM games \n      WHERE game_status = 'final' \n        AND home_score IS NOT NULL \n        AND away_score IS NOT NULL\n      ORDER BY commence_time DESC\n    `,
        []
      );
      expect(result).toEqual(mockGames);
    });

    test('Returns completed games for specific week', async () => {
      const mockGames = [
        {
          id: 1,
          week_id: 1,
          game_status: 'final',
          home_score: 21,
          away_score: 17
        }
      ];

      mockQuery.mockResolvedValue(mockGames);

      const result = await getCompletedGames(1);

      expect(mockQuery).toHaveBeenCalledWith(
        `\n        SELECT * FROM games \n        WHERE week_id = $1 \n          AND game_status = 'final' \n          AND home_score IS NOT NULL \n          AND away_score IS NOT NULL\n        ORDER BY commence_time DESC\n      `,
        [1]
      );
      expect(result).toEqual(mockGames);
    });
  });

  describe('reevaluateGamePicks', () => {
    test('Re-evaluates picks for a game with scores', async () => {
      const mockGame = {
        id: 1,
        home_score: 21,
        away_score: 17
      };

      const mockPicks = [
        {
          id: 1,
          user_id: 'user1',
          game_id: 1,
          pick_type: 'home_spread' as const,
          spread_value: -3,
          submitted: true,
          is_triple_play: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockEvaluations: GamePickEvaluation[] = [
        {
          pickId: 1,
          result: 'win',
          actualMargin: 4,
          requiredMargin: 3
        }
      ];

      mockQuery
        .mockResolvedValueOnce([mockGame])  // Get game with scores
        .mockResolvedValueOnce(mockPicks)   // Get picks for game
        .mockResolvedValue([]);             // Update pick results

      mockEvaluateGamePicks.mockReturnValue(mockEvaluations);

      const result = await reevaluateGamePicks(1);

      expect(result).toEqual(mockEvaluations);
      expect(mockEvaluateGamePicks).toHaveBeenCalledWith(mockPicks, 21, 17);
    });

    test('Throws error when game not found or has no scores', async () => {
      mockQuery.mockResolvedValue([]); // No game found

      await expect(reevaluateGamePicks(999)).rejects.toThrow('Game not found or scores not available');
    });
  });
});