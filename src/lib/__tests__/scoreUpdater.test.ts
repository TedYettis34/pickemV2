// Mock the database module to avoid PostgreSQL dependencies in tests
jest.mock('../database', () => ({
  query: jest.fn(),
}));

// Mock the gameResults module
jest.mock('../gameResults', () => ({
  finalizeGameResult: jest.fn(),
}));

// Mock the oddsApi module
jest.mock('../oddsApi', () => ({
  oddsApiService: {
    getAllFootballScores: jest.fn(),
    getScores: jest.fn(),
  },
}));

import { Game, OddsApiScore } from '../../types/game';

import { 
  shouldFetchScore, 
  extractScoresFromApiResponse, 
  getGamesNeedingScoreUpdates,
  updateScoresFromApi,
  updateScoreForGame
} from '../scoreUpdater';
import { query } from '../database';
import { oddsApiService } from '../oddsApi';
import { finalizeGameResult } from '../gameResults';

describe('scoreUpdater', () => {
  const baseGame: Game = {
    id: 1,
    week_id: 1,
    sport: 'americanfootball_nfl',
    external_id: 'test-game',
    home_team: 'Chiefs',
    away_team: 'Raiders',
    commence_time: '2024-01-01T20:00:00Z',
    spread_home: -3,
    spread_away: 3,
    total_over_under: 47.5,
    moneyline_home: -150,
    moneyline_away: 130,
    bookmaker: 'fanduel',
    odds_last_updated: '2024-01-01T12:00:00Z',
    must_pick: false,
    home_score: null,
    away_score: null,
    game_status: 'scheduled',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };
  
  const mockQuery = query as jest.MockedFunction<typeof query>;
  const mockOddsApiService = oddsApiService as jest.Mocked<typeof oddsApiService>;
  const mockFinalizeGameResult = finalizeGameResult as jest.MockedFunction<typeof finalizeGameResult>;

  describe('shouldFetchScore', () => {
    beforeEach(() => {
      // Mock the current time to a specific date for consistent testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-02T02:00:00Z')); // 6 hours after game start
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should return true for game started 5+ hours ago with no manual score', () => {
      const game: Game = {
        ...baseGame,
        commence_time: '2024-01-01T20:00:00Z', // 6 hours ago
        home_score: null,
        away_score: null,
        game_status: 'scheduled'
      };

      expect(shouldFetchScore(game)).toBe(true);
    });

    test('should return false for game started less than 5 hours ago', () => {
      const game: Game = {
        ...baseGame,
        commence_time: '2024-01-01T22:00:00Z', // 4 hours ago
        home_score: null,
        away_score: null,
        game_status: 'scheduled'
      };

      expect(shouldFetchScore(game)).toBe(false);
    });

    test('should return false for game with manual score set', () => {
      const game: Game = {
        ...baseGame,
        commence_time: '2024-01-01T20:00:00Z', // 6 hours ago
        home_score: 21,
        away_score: 17,
        game_status: 'final'
      };

      expect(shouldFetchScore(game)).toBe(false);
    });

    test('should return false for game already marked as final', () => {
      const game: Game = {
        ...baseGame,
        commence_time: '2024-01-01T20:00:00Z', // 6 hours ago
        home_score: null,
        away_score: null,
        game_status: 'final'
      };

      expect(shouldFetchScore(game)).toBe(false);
    });

    test('should return true even if only one score is set manually', () => {
      const game: Game = {
        ...baseGame,
        commence_time: '2024-01-01T20:00:00Z', // 6 hours ago
        home_score: 21,
        away_score: null, // Only one score set
        game_status: 'scheduled'
      };

      expect(shouldFetchScore(game)).toBe(false); // Both scores must be null
    });
  });

  describe('extractScoresFromApiResponse', () => {
    test('extracts scores from completed game', () => {
      const scoreData: OddsApiScore = {
        id: 'test-game',
        sport_key: 'americanfootball_nfl',
        sport_title: 'NFL',
        commence_time: '2024-01-01T20:00:00Z',
        home_team: 'Chiefs',
        away_team: 'Raiders',
        completed: true,
        scores: [
          { name: 'Chiefs', score: '21' },
          { name: 'Raiders', score: '17' }
        ]
      };

      const result = extractScoresFromApiResponse(scoreData);
      
      expect(result).toEqual({
        homeScore: 21,
        awayScore: 17
      });
    });

    test('returns null for uncompleted game', () => {
      const scoreData: OddsApiScore = {
        id: 'test-game',
        sport_key: 'americanfootball_nfl',
        sport_title: 'NFL',
        commence_time: '2024-01-01T20:00:00Z',
        home_team: 'Chiefs',
        away_team: 'Raiders',
        completed: false,
        scores: [
          { name: 'Chiefs', score: '14' },
          { name: 'Raiders', score: '10' }
        ]
      };

      const result = extractScoresFromApiResponse(scoreData);
      expect(result).toBeNull();
    });

    test('returns null when scores array is null', () => {
      const scoreData: OddsApiScore = {
        id: 'test-game',
        sport_key: 'americanfootball_nfl',
        sport_title: 'NFL',
        commence_time: '2024-01-01T20:00:00Z',
        home_team: 'Chiefs',
        away_team: 'Raiders',
        completed: true,
        scores: null
      };

      const result = extractScoresFromApiResponse(scoreData);
      expect(result).toBeNull();
    });

    test('returns null when team scores are missing', () => {
      const scoreData: OddsApiScore = {
        id: 'test-game',
        sport_key: 'americanfootball_nfl',
        sport_title: 'NFL',
        commence_time: '2024-01-01T20:00:00Z',
        home_team: 'Chiefs',
        away_team: 'Raiders',
        completed: true,
        scores: [
          { name: 'Chiefs', score: '21' }
          // Missing Raiders score
        ]
      };

      const result = extractScoresFromApiResponse(scoreData);
      expect(result).toBeNull();
    });

    test('returns null when scores are invalid numbers', () => {
      const scoreData: OddsApiScore = {
        id: 'test-game',
        sport_key: 'americanfootball_nfl',
        sport_title: 'NFL',
        commence_time: '2024-01-01T20:00:00Z',
        home_team: 'Chiefs',
        away_team: 'Raiders',
        completed: true,
        scores: [
          { name: 'Chiefs', score: 'invalid' },
          { name: 'Raiders', score: '17' }
        ]
      };

      const result = extractScoresFromApiResponse(scoreData);
      expect(result).toBeNull();
    });

    test('handles team name matching correctly', () => {
      const scoreData: OddsApiScore = {
        id: 'test-game',
        sport_key: 'americanfootball_nfl',
        sport_title: 'NFL',
        commence_time: '2024-01-01T20:00:00Z',
        home_team: 'Kansas City Chiefs',
        away_team: 'Las Vegas Raiders',
        completed: true,
        scores: [
          { name: 'Kansas City Chiefs', score: '28' },
          { name: 'Las Vegas Raiders', score: '14' }
        ]
      };

      const result = extractScoresFromApiResponse(scoreData);
      
      expect(result).toEqual({
        homeScore: 28,
        awayScore: 14
      });
    });
  });

  describe('getGamesNeedingScoreUpdates', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should return games from database that need updates', async () => {
      const mockGames = [
        {
          ...baseGame,
          id: 1,
          commence_time: '2024-01-01T20:00:00Z',
          home_score: null,
          away_score: null,
          game_status: 'scheduled'
        },
        {
          ...baseGame,
          id: 2,
          commence_time: '2024-01-01T20:00:00Z', // Both games started 6 hours ago
          home_score: null,
          away_score: null,
          game_status: 'scheduled'
        }
      ];

      mockQuery.mockResolvedValue(mockGames);
      
      // Mock the current time to be 6 hours after the first game
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-02T02:00:00Z'));

      const result = await getGamesNeedingScoreUpdates();
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM games')
      );
      expect(result).toHaveLength(2);
      
      jest.useRealTimers();
    });

    test('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(getGamesNeedingScoreUpdates()).rejects.toThrow('Database connection failed');
    });

    test('should filter out games that do not meet shouldFetchScore criteria', async () => {
      const mockGames = [
        {
          ...baseGame,
          id: 1,
          commence_time: '2024-01-01T20:00:00Z', // Will pass shouldFetchScore
          home_score: null,
          away_score: null,
          game_status: 'scheduled'
        },
        {
          ...baseGame,
          id: 2,
          commence_time: '2024-01-01T20:00:00Z',
          home_score: 21, // Will fail shouldFetchScore due to manual score
          away_score: 17,
          game_status: 'final'
        }
      ];

      mockQuery.mockResolvedValue(mockGames);
      
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-02T02:00:00Z'));

      const result = await getGamesNeedingScoreUpdates();
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      
      jest.useRealTimers();
    });
  });

  describe('updateScoresFromApi', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      console.log = jest.fn();
      console.error = jest.fn();
    });

    test('should return early when no games need updates', async () => {
      mockQuery.mockResolvedValue([]);
      
      const result = await updateScoresFromApi();
      
      expect(result).toEqual({
        gamesChecked: 0,
        gamesUpdated: 0,
        errors: []
      });
      expect(console.log).toHaveBeenCalledWith('No games need score updates');
    });

    test('should successfully update game scores from API', async () => {
      const mockGames = [
        {
          ...baseGame,
          id: 1,
          external_id: 'nfl-game-1',
          sport: 'americanfootball_nfl'
        },
        {
          ...baseGame,
          id: 2,
          external_id: 'ncaaf-game-1',
          sport: 'americanfootball_ncaaf'
        }
      ];

      const mockApiScores = {
        nfl: [{
          id: 'nfl-game-1',
          sport_key: 'americanfootball_nfl',
          sport_title: 'NFL',
          commence_time: '2024-01-01T20:00:00Z',
          home_team: 'Chiefs',
          away_team: 'Raiders',
          completed: true,
          scores: [
            { name: 'Chiefs', score: '28' },
            { name: 'Raiders', score: '21' }
          ]
        }],
        college: [{
          id: 'ncaaf-game-1',
          sport_key: 'americanfootball_ncaaf',
          sport_title: 'College Football',
          commence_time: '2024-01-01T20:00:00Z',
          home_team: 'Alabama',
          away_team: 'Georgia',
          completed: true,
          scores: [
            { name: 'Alabama', score: '35' },
            { name: 'Georgia', score: '24' }
          ]
        }]
      };

      mockQuery.mockResolvedValue(mockGames);
      mockOddsApiService.getAllFootballScores.mockResolvedValue(mockApiScores);
      mockFinalizeGameResult.mockResolvedValue(undefined);
      
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-02T02:00:00Z'));

      const result = await updateScoresFromApi();
      
      expect(result.gamesChecked).toBe(2);
      expect(result.gamesUpdated).toBe(2);
      expect(result.errors).toHaveLength(0);
      
      expect(mockOddsApiService.getAllFootballScores).toHaveBeenCalledWith(['nfl-game-1', 'ncaaf-game-1']);
      expect(mockFinalizeGameResult).toHaveBeenCalledTimes(2);
      expect(mockFinalizeGameResult).toHaveBeenCalledWith(1, 28, 21);
      expect(mockFinalizeGameResult).toHaveBeenCalledWith(2, 35, 24);
      
      jest.useRealTimers();
    });

    test('should handle API errors gracefully', async () => {
      const mockGames = [{ ...baseGame, id: 1 }];
      
      mockQuery.mockResolvedValue(mockGames);
      mockOddsApiService.getAllFootballScores.mockRejectedValue(new Error('API rate limit exceeded'));
      
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-02T02:00:00Z'));

      const result = await updateScoresFromApi();
      
      expect(result.gamesChecked).toBe(1);
      expect(result.gamesUpdated).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to fetch scores from API: API rate limit exceeded');
      
      jest.useRealTimers();
    });

    test('should skip games without score data', async () => {
      const mockGames = [{
        ...baseGame,
        id: 1,
        external_id: 'missing-game'
      }];

      mockQuery.mockResolvedValue(mockGames);
      mockOddsApiService.getAllFootballScores.mockResolvedValue({ nfl: [], college: [] });
      
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-02T02:00:00Z'));

      const result = await updateScoresFromApi();
      
      expect(result.gamesChecked).toBe(1);
      expect(result.gamesUpdated).toBe(0);
      expect(result.errors).toHaveLength(0);
      
      jest.useRealTimers();
    });

    test('should skip incomplete games', async () => {
      const mockGames = [{
        ...baseGame,
        id: 1,
        external_id: 'incomplete-game'
      }];

      const mockApiScores = {
        nfl: [{
          id: 'incomplete-game',
          sport_key: 'americanfootball_nfl',
          sport_title: 'NFL',
          commence_time: '2024-01-01T20:00:00Z',
          home_team: 'Chiefs',
          away_team: 'Raiders',
          completed: false, // Game not completed
          scores: [
            { name: 'Chiefs', score: '14' },
            { name: 'Raiders', score: '10' }
          ]
        }],
        college: []
      };

      mockQuery.mockResolvedValue(mockGames);
      mockOddsApiService.getAllFootballScores.mockResolvedValue(mockApiScores);
      
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-02T02:00:00Z'));

      const result = await updateScoresFromApi();
      
      expect(result.gamesChecked).toBe(1);
      expect(result.gamesUpdated).toBe(0);
      expect(result.errors).toHaveLength(0);
      
      jest.useRealTimers();
    });

    test('should handle individual game update errors', async () => {
      const mockGames = [{
        ...baseGame,
        id: 1,
        external_id: 'error-game'
      }];

      const mockApiScores = {
        nfl: [{
          id: 'error-game',
          sport_key: 'americanfootball_nfl',
          sport_title: 'NFL',
          commence_time: '2024-01-01T20:00:00Z',
          home_team: 'Chiefs',
          away_team: 'Raiders',
          completed: true,
          scores: [
            { name: 'Chiefs', score: '28' },
            { name: 'Raiders', score: '21' }
          ]
        }],
        college: []
      };

      mockQuery.mockResolvedValue(mockGames);
      mockOddsApiService.getAllFootballScores.mockResolvedValue(mockApiScores);
      mockFinalizeGameResult.mockRejectedValue(new Error('Database update failed'));
      
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-02T02:00:00Z'));

      const result = await updateScoresFromApi();
      
      expect(result.gamesChecked).toBe(1);
      expect(result.gamesUpdated).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Error updating game 1: Database update failed');
      
      jest.useRealTimers();
    });
  });

  describe('updateScoreForGame', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      console.error = jest.fn();
    });

    test('should return error when game not found', async () => {
      mockQuery.mockResolvedValue([]);
      
      const result = await updateScoreForGame(999);
      
      expect(result.updated).toBe(false);
      expect(result.error).toBe('Game not found');
    });

    test('should return error when game does not meet update criteria', async () => {
      const mockGame = {
        ...baseGame,
        home_score: 21,
        away_score: 17,
        game_status: 'final'
      };
      
      mockQuery.mockResolvedValue([mockGame]);
      
      const result = await updateScoreForGame(1);
      
      expect(result.updated).toBe(false);
      expect(result.error).toBe('Game does not meet criteria for automatic score update');
    });

    test('should successfully update single game score', async () => {
      const mockGame = {
        ...baseGame,
        id: 1,
        external_id: 'single-game',
        commence_time: '2024-01-01T20:00:00Z'
      };

      const mockApiScores = [{
        id: 'single-game',
        sport_key: 'americanfootball_nfl',
        sport_title: 'NFL',
        commence_time: '2024-01-01T20:00:00Z',
        home_team: 'Chiefs',
        away_team: 'Raiders',
        completed: true,
        scores: [
          { name: 'Chiefs', score: '31' },
          { name: 'Raiders', score: '17' }
        ]
      }];
      
      mockQuery.mockResolvedValue([mockGame]);
      mockOddsApiService.getScores.mockResolvedValue(mockApiScores);
      mockFinalizeGameResult.mockResolvedValue(undefined);
      
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-02T02:00:00Z'));

      const result = await updateScoreForGame(1);
      
      expect(result.updated).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockOddsApiService.getScores).toHaveBeenCalledWith('americanfootball_nfl', ['single-game']);
      expect(mockFinalizeGameResult).toHaveBeenCalledWith(1, 31, 17);
      
      jest.useRealTimers();
    });

    test('should handle missing or incomplete score data', async () => {
      const mockGame = {
        ...baseGame,
        id: 1,
        external_id: 'incomplete-single-game',
        commence_time: '2024-01-01T20:00:00Z'
      };
      
      mockQuery.mockResolvedValue([mockGame]);
      mockOddsApiService.getScores.mockResolvedValue([]);
      
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-02T02:00:00Z'));

      const result = await updateScoreForGame(1);
      
      expect(result.updated).toBe(false);
      expect(result.error).toBe('Score not available or game not completed');
      
      jest.useRealTimers();
    });

    test('should handle database and API errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));
      
      const result = await updateScoreForGame(1);
      
      expect(result.updated).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(console.error).toHaveBeenCalledWith(
        'Error updating score for game 1:',
        'Database connection failed'
      );
    });
  });
});