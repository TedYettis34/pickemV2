/**
 * @jest-environment node
 */

// Mock the database query function BEFORE imports
jest.mock('../../../../../lib/database', () => ({
  query: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { query } from '../../../../../lib/database';

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('/api/picks/bulk-unsubmit', () => {
  const mockUserId = 'test-user-123';
  const mockWeekId = 1;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: { weekId: number | null }, headers: Record<string, string> = {}) => {
    return {
      headers: {
        get: (name: string) => {
          if (name === 'authorization') return 'Bearer test-token';
          if (name === 'x-user-id') return mockUserId;
          return headers[name];
        },
      },
      json: async () => body,
    } as unknown as NextRequest;
  };

  describe('POST', () => {
    it('should successfully unsubmit all picks when no games have started', async () => {
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now
      
      // Mock existing picks - all games in future
      mockQuery
        .mockResolvedValueOnce([
          {
            id: 1,
            game_id: 1,
            pick_type: 'home_spread',
            spread_value: -3,
            submitted: true,
            commence_time: futureTime,
          },
          {
            id: 2,
            game_id: 2,
            pick_type: 'away_spread',
            spread_value: 7,
            submitted: true,
            commence_time: futureTime,
          },
        ])
        // Mock unsubmit update query
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

      const request = createMockRequest({ weekId: mockWeekId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.picksUnsubmitted).toBe(2);
      expect(data.data.startedGamesCount).toBe(0);
      expect(data.data.message).toBe('Successfully unsubmitted 2 picks');
    });

    it('should unsubmit only picks for games that haven\'t started (partial unsubmission)', async () => {
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now
      
      // Mock existing picks - mix of past and future games
      mockQuery
        .mockResolvedValueOnce([
          {
            id: 1,
            game_id: 1,
            pick_type: 'home_spread',
            spread_value: -3,
            submitted: true,
            commence_time: pastTime, // Game has started
          },
          {
            id: 2,
            game_id: 2,
            pick_type: 'away_spread',
            spread_value: 7,
            submitted: true,
            commence_time: futureTime, // Game hasn't started
          },
          {
            id: 3,
            game_id: 3,
            pick_type: 'home_spread',
            spread_value: 0,
            submitted: true,
            commence_time: futureTime, // Game hasn't started
          },
        ])
        // Mock unsubmit update query (only returns picks for future games)
        .mockResolvedValueOnce([{ id: 2 }, { id: 3 }]);

      const request = createMockRequest({ weekId: mockWeekId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.picksUnsubmitted).toBe(2);
      expect(data.data.startedGamesCount).toBe(1);
      expect(data.data.totalPicksCount).toBe(3);
      expect(data.data.message).toBe('Successfully unsubmitted 2 picks (1 picks for started games remain submitted)');
    });

    it('should reject when all games have started', async () => {
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
      
      // Mock existing picks - all games in past
      mockQuery.mockResolvedValueOnce([
        {
          id: 1,
          game_id: 1,
          pick_type: 'home_spread',
          spread_value: -3,
          submitted: true,
          commence_time: pastTime,
        },
        {
          id: 2,
          game_id: 2,
          pick_type: 'away_spread',
          spread_value: 7,
          submitted: true,
          commence_time: pastTime,
        },
      ]);

      const request = createMockRequest({ weekId: mockWeekId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot unsubmit picks - all games have already started');
    });

    it('should reject when no submitted picks are found for unstarted games', async () => {
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      // Mock existing picks - future game but not submitted
      mockQuery.mockResolvedValueOnce([
        {
          id: 1,
          game_id: 1,
          pick_type: 'home_spread',
          spread_value: -3,
          submitted: true,
          commence_time: pastTime, // Started
        },
        {
          id: 2,
          game_id: 2,
          pick_type: 'away_spread',
          spread_value: 7,
          submitted: false, // Not submitted
          commence_time: futureTime, // Not started
        },
      ]);

      const request = createMockRequest({ weekId: mockWeekId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No submitted picks found that can be unsubmitted');
    });

    it('should reject when no picks exist for the week', async () => {
      // Mock no existing picks
      mockQuery.mockResolvedValueOnce([]);

      const request = createMockRequest({ weekId: mockWeekId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No picks found for this week');
    });

    it('should reject when no submitted picks exist at all', async () => {
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      // Mock existing picks but none are submitted
      mockQuery.mockResolvedValueOnce([
        {
          id: 1,
          game_id: 1,
          pick_type: 'home_spread',
          spread_value: -3,
          submitted: false,
          commence_time: futureTime,
        },
      ]);

      const request = createMockRequest({ weekId: mockWeekId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No submitted picks found for this week');
    });

    it('should require valid weekId', async () => {
      const request = createMockRequest({ weekId: null });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Valid weekId is required');
    });

    it('should require user authentication', async () => {
      const request = {
        headers: {
          get: () => null, // No authorization header
        },
        json: async () => ({ weekId: mockWeekId }),
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authorization header required');
    });

    it('should require user ID header', async () => {
      const request = {
        headers: {
          get: (name: string) => {
            if (name === 'authorization') return 'Bearer test-token';
            return null; // No x-user-id header
          },
        },
        json: async () => ({ weekId: mockWeekId }),
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User ID required');
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const request = createMockRequest({ weekId: mockWeekId });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to unsubmit picks');
    });

    it('should use correct SQL query with time constraint', async () => {
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      mockQuery
        .mockResolvedValueOnce([
          {
            id: 1,
            game_id: 1,
            pick_type: 'home_spread',
            spread_value: -3,
            submitted: true,
            commence_time: futureTime,
          },
        ])
        .mockResolvedValueOnce([{ id: 1 }]);

      const request = createMockRequest({ weekId: mockWeekId });
      await POST(request);

      // Verify the unsubmit query includes the time constraint
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND g.commence_time > $3'),
        [mockUserId, mockWeekId, expect.any(String)]
      );
    });
  });
});