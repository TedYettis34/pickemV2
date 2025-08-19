/**
 * @jest-environment node
 */

// Mock dependencies BEFORE imports
jest.mock('../../../../../../lib/database', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('../../../../../../lib/adminAuth');

import { NextRequest } from 'next/server';
import { PATCH } from '../route';
import { requireAdmin } from '../../../../../../lib/adminAuth';
import { getDatabase } from '../../../../../../lib/database';

const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('/api/admin/games/[id]', () => {
  const mockQuery = jest.fn();
  const mockAdminAuth = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockReturnValue(mockAdminAuth);
    mockGetDatabase.mockReturnValue({ query: mockQuery } as { query: typeof mockQuery });
  });

  describe('PATCH', () => {
    const mockGame = {
      id: 1,
      week_id: 1,
      sport: 'americanfootball_nfl',
      external_id: 'game1',
      home_team: 'Team A',
      away_team: 'Team B',
      commence_time: '2024-01-01T20:00:00Z',
      must_pick: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should return 401 when user is not authorized', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: false,
        error: 'Unauthorized',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/games/1', {
        method: 'PATCH',
        body: JSON.stringify({ must_pick: true }),
      });
      
      const response = await PATCH(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid game ID', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/games/invalid', {
        method: 'PATCH',
        body: JSON.stringify({ must_pick: true }),
      });
      
      const response = await PATCH(request, { params: { id: 'invalid' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid game ID');
    });

    it('should return 400 for invalid must_pick value', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/games/1', {
        method: 'PATCH',
        body: JSON.stringify({ must_pick: 'invalid' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await PATCH(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('must_pick must be a boolean');
    });

    it('should return 404 when game does not exist', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });

      // Mock game check to return no results
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/admin/games/999', {
        method: 'PATCH',
        body: JSON.stringify({ must_pick: true }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await PATCH(request, { params: { id: '999' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Game not found');
    });

    it('should successfully update must_pick to true', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });

      const updatedGame = { ...mockGame, must_pick: true };

      // Mock game exists check
      mockQuery.mockResolvedValueOnce({ rows: [mockGame] });
      // Mock update query
      mockQuery.mockResolvedValueOnce({ rows: [updatedGame] });

      const request = new NextRequest('http://localhost:3000/api/admin/games/1', {
        method: 'PATCH',
        body: JSON.stringify({ must_pick: true }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await PATCH(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(updatedGame);
      expect(data.message).toBe('Game must_pick status updated to true');
      
      // Verify the update query was called correctly
      expect(mockQuery).toHaveBeenNthCalledWith(
        2, // Second call should be the update
        expect.stringContaining('UPDATE games'),
        [true, 1]
      );
    });

    it('should successfully update must_pick to false', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });

      const updatedGame = { ...mockGame, must_pick: false };

      // Mock game exists check
      mockQuery.mockResolvedValueOnce({ rows: [mockGame] });
      // Mock update query
      mockQuery.mockResolvedValueOnce({ rows: [updatedGame] });

      const request = new NextRequest('http://localhost:3000/api/admin/games/1', {
        method: 'PATCH',
        body: JSON.stringify({ must_pick: false }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await PATCH(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(updatedGame);
      expect(data.message).toBe('Game must_pick status updated to false');
    });

    it('should handle database errors', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });

      // Mock game exists check to succeed
      mockQuery.mockResolvedValueOnce({ rows: [mockGame] });
      // Mock update query to fail
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/games/1', {
        method: 'PATCH',
        body: JSON.stringify({ must_pick: true }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await PATCH(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to update game');
    });
  });
});