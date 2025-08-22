/**
 * @jest-environment node
 */

// Mock the database module
jest.mock('../../../../../lib/database', () => ({
  query: jest.fn(),
}));

import { NextRequest, NextResponse } from 'next/server';
import { GET } from '../route';
import { query } from '../../../../../lib/database';

// Mock NextResponse methods
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url) => ({
    nextUrl: {
      searchParams: new URLSearchParams(url?.split('?')[1] || '')
    }
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200
    }))
  }
}));

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockNextResponse = NextResponse as jest.Mocked<typeof NextResponse>;

describe('/api/picks/all', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPicksData = [
    {
      id: 1,
      user_id: 'user-123',
      game_id: 1,
      pick_type: 'home_spread',
      spread_value: -3,
      submitted: true,
      is_triple_play: true,
      result: 'win',
      evaluated_at: '2024-01-02T10:00:00Z',
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z',
      week_id: 6,
      sport: 'americanfootball_nfl',
      external_id: 'nfl-game-1',
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
      home_score: 28,
      away_score: 21,
      game_status: 'final',
      game_created_at: '2024-01-01T00:00:00Z',
      game_updated_at: '2024-01-01T00:00:00Z',
      username: 'Test User',
      display_name: 'Test User',
      week_name: 'Week 6: Conference Championships'
    }
  ];

  describe('GET', () => {
    test('should return all submitted picks without week filter', async () => {
      mockQuery.mockResolvedValue(mockPicksData);

      const request = new NextRequest('http://localhost:3000/api/picks/all') as NextRequest;
      await GET(request);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM picks p'),
        []
      );

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            user_id: 'user-123',
            username: 'Test User',
            display_name: 'Test User',
            is_triple_play: true,
            game: expect.objectContaining({
              id: 1,
              home_team: 'Chiefs',
              away_team: 'Raiders'
            })
          })
        ])
      });
    });

    test('should return picks filtered by week', async () => {
      mockQuery.mockResolvedValue([mockPicksData[0]]);

      const request = new NextRequest('http://localhost:3000/api/picks/all?weekId=6') as NextRequest;
      await GET(request);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND g.week_id = $1'),
        [6]
      );
    });

    test('should return 400 for invalid weekId', async () => {
      const request = new NextRequest('http://localhost:3000/api/picks/all?weekId=invalid') as NextRequest;
      await GET(request);

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid week ID'
      }, { status: 400 });
    });

    test('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/picks/all') as NextRequest;
      await GET(request);

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database connection failed'
      }, { status: 500 });
    });

    test('should include correct SQL joins and conditions', async () => {
      mockQuery.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/picks/all?weekId=6') as NextRequest;
      await GET(request);

      const sqlCall = mockQuery.mock.calls[0][0];
      
      // Check for correct JOINs
      expect(sqlCall).toContain('JOIN games g ON p.game_id = g.id');
      expect(sqlCall).toContain('JOIN users u ON p.user_id = u.cognito_user_id');
      expect(sqlCall).toContain('JOIN weeks w ON g.week_id = w.id');
      
      // Check for correct WHERE clause
      expect(sqlCall).toContain('WHERE p.submitted = true');
      
      // Check for correct ORDER BY
      expect(sqlCall).toContain('ORDER BY g.commence_time DESC, u.name ASC');
      
      // Check for user field aliases
      expect(sqlCall).toContain('u.name as username');
      expect(sqlCall).toContain('u.name as display_name');
      expect(sqlCall).toContain('w.name as week_name');
    });

    test('should transform database rows correctly', async () => {
      mockQuery.mockResolvedValue([mockPicksData[0]]);

      const request = new NextRequest('http://localhost:3000/api/picks/all') as NextRequest;
      await GET(request);

      const responseData = mockNextResponse.json.mock.calls[0][0];
      const pick = responseData.data[0];
      
      // Check pick properties are preserved
      expect(pick.id).toBe(1);
      expect(pick.user_id).toBe('user-123');
      expect(pick.is_triple_play).toBe(true);
      expect(pick.result).toBe('win');

      // Check game object is properly nested
      expect(pick.game).toEqual({
        id: 1,
        week_id: 6,
        sport: 'americanfootball_nfl',
        external_id: 'nfl-game-1',
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
        home_score: 28,
        away_score: 21,
        game_status: 'final',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });

      // Check user properties
      expect(pick.username).toBe('Test User');
      expect(pick.display_name).toBe('Test User');
      expect(pick.week_name).toBe('Week 6: Conference Championships');
    });

    test('should convert weekId string to integer', async () => {
      mockQuery.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/picks/all?weekId=6') as NextRequest;
      await GET(request);

      // Should pass integer to query, not string
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [6] // integer, not '6'
      );
    });
  });
});