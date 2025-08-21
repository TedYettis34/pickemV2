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

import { shouldFetchScore, extractScoresFromApiResponse } from '../scoreUpdater';
import { Game, OddsApiScore } from '../../types/game';

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

  describe('shouldFetchScore', () => {
    beforeEach(() => {
      // Mock the current time to a specific date for consistent testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-02T01:00:00Z')); // 5 hours after game start
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should return true for game started 4+ hours ago with no manual score', () => {
      const game: Game = {
        ...baseGame,
        commence_time: '2024-01-01T20:00:00Z', // 5 hours ago
        home_score: null,
        away_score: null,
        game_status: 'scheduled'
      };

      expect(shouldFetchScore(game)).toBe(true);
    });

    test('should return false for game started less than 4 hours ago', () => {
      const game: Game = {
        ...baseGame,
        commence_time: '2024-01-01T22:00:00Z', // 3 hours ago
        home_score: null,
        away_score: null,
        game_status: 'scheduled'
      };

      expect(shouldFetchScore(game)).toBe(false);
    });

    test('should return false for game with manual score set', () => {
      const game: Game = {
        ...baseGame,
        commence_time: '2024-01-01T20:00:00Z', // 5 hours ago
        home_score: 21,
        away_score: 17,
        game_status: 'final'
      };

      expect(shouldFetchScore(game)).toBe(false);
    });

    test('should return false for game already marked as final', () => {
      const game: Game = {
        ...baseGame,
        commence_time: '2024-01-01T20:00:00Z', // 5 hours ago
        home_score: null,
        away_score: null,
        game_status: 'final'
      };

      expect(shouldFetchScore(game)).toBe(false);
    });

    test('should return true even if only one score is set manually', () => {
      const game: Game = {
        ...baseGame,
        commence_time: '2024-01-01T20:00:00Z', // 5 hours ago
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
});