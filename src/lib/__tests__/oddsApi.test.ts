/**
 * @jest-environment node
 */

// Mock fetch before importing
global.fetch = jest.fn();

// Mock console methods to prevent test warnings
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
});

import { oddsApiService } from '../oddsApi';
import { SUPPORTED_SPORTS } from '../../types/game';

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('OddsApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.ODDS_API_KEY;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSports', () => {
    it('should fetch available sports successfully', async () => {
      const mockSports = [
        { key: 'americanfootball_nfl', title: 'NFL', description: 'American Football' },
        { key: 'americanfootball_ncaaf', title: 'NCAAF', description: 'College Football' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSports,
      } as Response);

      const result = await oddsApiService.getSports();

      expect(result).toEqual(mockSports);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sports?apiKey=')
      );
    });

    it('should handle API errors when fetching sports', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      await expect(oddsApiService.getSports()).rejects.toThrow('Failed to fetch available sports');
      expect(console.error).toHaveBeenCalledWith('Error fetching sports:', expect.any(Error));
    });

    it('should handle network errors when fetching sports', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(oddsApiService.getSports()).rejects.toThrow('Failed to fetch available sports');
      expect(console.error).toHaveBeenCalledWith('Error fetching sports:', expect.any(Error));
    });
  });

  describe('getGamesForSport', () => {
    const startDate = '2024-01-01T00:00:00Z';
    const endDate = '2024-01-07T23:59:59Z';

    it('should fetch games for NFL successfully', async () => {
      const mockGames = [
        {
          id: 'game1',
          sport_key: 'americanfootball_nfl',
          sport_title: 'NFL',
          commence_time: '2024-01-01T20:00:00Z',
          home_team: 'Team A',
          away_team: 'Team B',
          bookmakers: []
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGames,
        headers: new Headers({
          'x-requests-remaining': '100'
        })
      } as Response);

      const result = await oddsApiService.getGamesForSport(SUPPORTED_SPORTS.NFL, startDate, endDate);

      expect(result).toEqual(mockGames);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sports/americanfootball_nfl/odds?')
      );
      expect(console.log).toHaveBeenCalledWith(
        'Odds API requests remaining: 100'
      );
    });

    it('should fetch games for college football successfully', async () => {
      const mockGames = [
        {
          id: 'college1',
          sport_key: 'americanfootball_ncaaf',
          sport_title: 'NCAAF',
          commence_time: '2024-01-01T19:00:00Z',
          home_team: 'College A',
          away_team: 'College B',
          bookmakers: []
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGames,
        headers: new Headers()
      } as Response);

      const result = await oddsApiService.getGamesForSport(SUPPORTED_SPORTS.COLLEGE, startDate, endDate);

      expect(result).toEqual(mockGames);
    });

    it('should handle API errors with proper error details', async () => {
      const errorResponse = {
        message: 'API key is not valid',
        error_code: 'INVALID_KEY'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify(errorResponse)
      } as Response);

      await expect(
        oddsApiService.getGamesForSport(SUPPORTED_SPORTS.NFL, startDate, endDate)
      ).rejects.toThrow('Failed to fetch americanfootball_nfl games');

      expect(console.error).toHaveBeenCalledWith(
        'API Error for americanfootball_nfl:',
        401,
        'Unauthorized',
        JSON.stringify(errorResponse)
      );
    });

    it('should return empty array when no games are found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null,
        headers: new Headers()
      } as Response);

      const result = await oddsApiService.getGamesForSport(SUPPORTED_SPORTS.NFL, startDate, endDate);

      expect(result).toEqual([]);
    });

    it('should format dates correctly for API', async () => {
      const mockGames = [];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGames,
        headers: new Headers()
      } as Response);

      await oddsApiService.getGamesForSport(SUPPORTED_SPORTS.NFL, startDate, endDate);

      const fetchCall = mockFetch.mock.calls[0][0] as string;
      expect(fetchCall).toContain('commenceTimeFrom=2024-01-01T00%3A00%3A00Z');
      expect(fetchCall).toContain('commenceTimeTo=2024-01-07T23%3A59%3A59Z');
    });
  });

  describe('getNFLGames', () => {
    it('should call getGamesForSport with NFL sport key', async () => {
      const spy = jest.spyOn(oddsApiService, 'getGamesForSport');
      spy.mockResolvedValueOnce([]);

      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-01-07T23:59:59Z';

      await oddsApiService.getNFLGames(startDate, endDate);

      expect(spy).toHaveBeenCalledWith(SUPPORTED_SPORTS.NFL, startDate, endDate);

      spy.mockRestore();
    });
  });

  describe('getCollegeGames', () => {
    it('should call getGamesForSport with college sport key', async () => {
      const spy = jest.spyOn(oddsApiService, 'getGamesForSport');
      spy.mockResolvedValueOnce([]);

      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-01-07T23:59:59Z';

      await oddsApiService.getCollegeGames(startDate, endDate);

      expect(spy).toHaveBeenCalledWith(SUPPORTED_SPORTS.COLLEGE, startDate, endDate);

      spy.mockRestore();
    });
  });

  describe('getAllFootballGames', () => {
    it('should fetch both NFL and college games', async () => {
      const nflGames = [{ id: 'nfl1', sport_key: 'americanfootball_nfl' }];
      const collegeGames = [{ id: 'college1', sport_key: 'americanfootball_ncaaf' }];

      const nflSpy = jest.spyOn(oddsApiService, 'getNFLGames');
      const collegeSpy = jest.spyOn(oddsApiService, 'getCollegeGames');

      nflSpy.mockResolvedValueOnce(nflGames as never[]);
      collegeSpy.mockResolvedValueOnce(collegeGames as never[]);

      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-01-07T23:59:59Z';

      const result = await oddsApiService.getAllFootballGames(startDate, endDate);

      expect(result).toEqual({
        nfl: nflGames,
        college: collegeGames
      });

      expect(nflSpy).toHaveBeenCalledWith(startDate, endDate);
      expect(collegeSpy).toHaveBeenCalledWith(startDate, endDate);

      nflSpy.mockRestore();
      collegeSpy.mockRestore();
    });

    it('should handle errors when fetching all games', async () => {
      const nflSpy = jest.spyOn(oddsApiService, 'getNFLGames');
      nflSpy.mockRejectedValueOnce(new Error('NFL API error'));

      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-01-07T23:59:59Z';

      await expect(
        oddsApiService.getAllFootballGames(startDate, endDate)
      ).rejects.toThrow('Failed to fetch football games');

      expect(console.error).toHaveBeenCalledWith(
        'Error fetching all football games:',
        expect.any(Error)
      );

      nflSpy.mockRestore();
    });
  });

  describe('transformToGameData', () => {
    it('should transform API event to game data format', () => {
      const mockEvent = {
        id: 'game123',
        sport_key: 'americanfootball_nfl',
        home_team: 'Team A',
        away_team: 'Team B',
        commence_time: '2024-01-01T20:00:00Z',
        bookmakers: [
          {
            title: 'FanDuel',
            last_update: '2024-01-01T19:00:00Z',
            markets: [
              {
                key: 'spreads',
                outcomes: [
                  { name: 'Team A', point: -3.5, price: -110 },
                  { name: 'Team B', point: 3.5, price: -110 }
                ]
              },
              {
                key: 'totals',
                outcomes: [
                  { name: 'Over', point: 47.5, price: -110 },
                  { name: 'Under', point: 47.5, price: -110 }
                ]
              },
              {
                key: 'h2h',
                outcomes: [
                  { name: 'Team A', price: -150 },
                  { name: 'Team B', price: 130 }
                ]
              }
            ]
          }
        ]
      };

      const weekId = 1;
      const result = oddsApiService.transformToGameData(mockEvent as never, weekId);

      expect(result).toEqual({
        week_id: weekId,
        sport: 'americanfootball_nfl',
        external_id: 'game123',
        home_team: 'Team A',
        away_team: 'Team B',
        commence_time: '2024-01-01T20:00:00Z',
        spread_home: -3.5,
        spread_away: 3.5,
        total_over_under: 47.5,
        moneyline_home: -150,
        moneyline_away: 130,
        bookmaker: 'FanDuel',
        odds_last_updated: '2024-01-01T19:00:00Z'
      });
    });

    it('should handle events with no bookmakers', () => {
      const mockEvent = {
        id: 'game123',
        sport_key: 'americanfootball_nfl',
        home_team: 'Team A',
        away_team: 'Team B',
        commence_time: '2024-01-01T20:00:00Z',
        bookmakers: []
      };

      const weekId = 1;
      const result = oddsApiService.transformToGameData(mockEvent as never, weekId);

      expect(result).toEqual({
        week_id: weekId,
        sport: 'americanfootball_nfl',
        external_id: 'game123',
        home_team: 'Team A',
        away_team: 'Team B',
        commence_time: '2024-01-01T20:00:00Z',
        spread_home: undefined,
        spread_away: undefined,
        total_over_under: undefined,
        moneyline_home: undefined,
        moneyline_away: undefined,
        bookmaker: '',
        odds_last_updated: ''
      });
    });
  });

  describe('environment handling', () => {
    it('should warn when ODDS_API_KEY is not set', async () => {
      // Re-import to trigger the warning
      await jest.isolateModulesAsync(async () => {
        delete process.env.ODDS_API_KEY;
        await import('../oddsApi');
        expect(console.warn).toHaveBeenCalledWith('ODDS_API_KEY not found in environment variables');
      });
    });

    it('should not warn when ODDS_API_KEY is set', async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.ODDS_API_KEY = 'test-key';
        jest.clearAllMocks();
        await import('../oddsApi');
        expect(console.warn).not.toHaveBeenCalled();
      });
    });
  });
});