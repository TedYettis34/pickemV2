/**
 * @jest-environment node
 */

// Mock dependencies BEFORE imports
jest.mock('../../../../../../../lib/adminAuth', () => ({
  validateAdminAuth: jest.fn(),
}));

jest.mock('../../../../../../../lib/gameResults', () => ({
  finalizeGameResult: jest.fn(),
  reevaluateGamePicks: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { PUT, POST } from '../route';
import { validateAdminAuth } from '../../../../../../../lib/adminAuth';
import { finalizeGameResult, reevaluateGamePicks } from '../../../../../../../lib/gameResults';

const mockValidateAdminAuth = validateAdminAuth as jest.MockedFunction<typeof validateAdminAuth>;
const mockFinalizeGameResult = finalizeGameResult as jest.MockedFunction<typeof finalizeGameResult>;
const mockReevaluateGamePicks = reevaluateGamePicks as jest.MockedFunction<typeof reevaluateGamePicks>;

describe('/api/admin/games/[id]/result', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('PUT - Update Game Result', () => {
    test('should successfully set game result as admin', async () => {
      // Mock successful admin authentication
      mockValidateAdminAuth.mockResolvedValue({ isValid: true });

      // Mock successful result finalization
      const mockGameResult = {
        game: {
          id: 1,
          external_id: 'test-game',
          home_team: 'Chiefs',
          away_team: 'Raiders',
          home_score: 28,
          away_score: 21,
          game_status: 'final'
        },
        pickEvaluations: [
          { pickId: 1, result: 'win', actualMargin: 7, requiredMargin: 3 },
          { pickId: 2, result: 'loss', actualMargin: 7, requiredMargin: -3 }
        ],
        picksUpdated: 2
      };
      
      mockFinalizeGameResult.mockResolvedValue(mockGameResult);

      const request = new NextRequest('http://localhost:3000/api/admin/games/1/result', {
        method: 'PUT',
        body: JSON.stringify({
          homeScore: 28,
          awayScore: 21
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        success: true,
        data: mockGameResult,
        message: 'Game result updated successfully. 2 picks evaluated.'
      });

      expect(mockValidateAdminAuth).toHaveBeenCalledWith(request);
      expect(mockFinalizeGameResult).toHaveBeenCalledWith(1, 28, 21);
    });

    test('should reject non-admin users', async () => {
      mockValidateAdminAuth.mockResolvedValue({ 
        isValid: false, 
        error: 'Unauthorized' 
      });

      const request = new NextRequest('http://localhost:3000/api/admin/games/1/result', {
        method: 'PUT',
        body: JSON.stringify({
          homeScore: 28,
          awayScore: 21
        })
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({
        success: false,
        error: 'Unauthorized'
      });

      expect(mockFinalizeGameResult).not.toHaveBeenCalled();
    });

    test('should validate request body for missing fields', async () => {
      mockValidateAdminAuth.mockResolvedValue({ isValid: true });

      const request = new NextRequest('http://localhost:3000/api/admin/games/1/result', {
        method: 'PUT',
        body: JSON.stringify({
          homeScore: 28
          // Missing awayScore
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({
        success: false,
        error: 'homeScore and awayScore are required and must be numbers'
      });

      expect(mockFinalizeGameResult).not.toHaveBeenCalled();
    });

    test('should validate score values are valid numbers', async () => {
      mockValidateAdminAuth.mockResolvedValue({ isValid: true });

      const request = new NextRequest('http://localhost:3000/api/admin/games/1/result', {
        method: 'PUT',
        body: JSON.stringify({
          homeScore: 'invalid',
          awayScore: 21
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({
        success: false,
        error: 'homeScore and awayScore are required and must be numbers'
      });
    });

    test('should validate score values are non-negative integers', async () => {
      mockValidateAdminAuth.mockResolvedValue({ isValid: true });

      const request = new NextRequest('http://localhost:3000/api/admin/games/1/result', {
        method: 'PUT',
        body: JSON.stringify({
          homeScore: -5,
          awayScore: 21
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({
        success: false,
        error: 'Scores must be non-negative integers'
      });
    });

    test('should validate game ID is a valid number', async () => {
      mockValidateAdminAuth.mockResolvedValue({ isValid: true });

      const request = new NextRequest('http://localhost:3000/api/admin/games/invalid/result', {
        method: 'PUT',
        body: JSON.stringify({
          homeScore: 28,
          awayScore: 21
        })
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'invalid' }) });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({
        success: false,
        error: 'Invalid game ID'
      });
    });

    test('should handle finalizeGameResult errors', async () => {
      mockValidateAdminAuth.mockResolvedValue({ isValid: true });
      mockFinalizeGameResult.mockRejectedValue(new Error('Game not found'));

      const request = new NextRequest('http://localhost:3000/api/admin/games/999/result', {
        method: 'PUT',
        body: JSON.stringify({
          homeScore: 28,
          awayScore: 21
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '999' }) });
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({
        success: false,
        error: 'Failed to update game result'
      });
    });

    test('should validate decimal scores are rejected', async () => {
      mockValidateAdminAuth.mockResolvedValue({ isValid: true });

      const request = new NextRequest('http://localhost:3000/api/admin/games/1/result', {
        method: 'PUT',
        body: JSON.stringify({
          homeScore: 28.5,
          awayScore: 21
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({
        success: false,
        error: 'Scores must be non-negative integers'
      });
    });

    test('should handle zero scores correctly', async () => {
      mockValidateAdminAuth.mockResolvedValue({ isValid: true });
      
      const mockGameResult = {
        game: { id: 1, home_score: 0, away_score: 0 },
        pickEvaluations: [],
        picksUpdated: 0
      };
      mockFinalizeGameResult.mockResolvedValue(mockGameResult);

      const request = new NextRequest('http://localhost:3000/api/admin/games/1/result', {
        method: 'PUT',
        body: JSON.stringify({
          homeScore: 0,
          awayScore: 0
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(200);
      expect(mockFinalizeGameResult).toHaveBeenCalledWith(1, 0, 0);
    });

    test('should handle invalid JSON in request body', async () => {
      mockValidateAdminAuth.mockResolvedValue({ isValid: true });

      const request = new NextRequest('http://localhost:3000/api/admin/games/1/result', {
        method: 'PUT',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to update game result');
    });

  });

  describe('POST - Re-evaluate Game Picks', () => {
    test('should successfully re-evaluate picks for a game', async () => {
      mockValidateAdminAuth.mockResolvedValue({ isValid: true });
      
      const mockPickEvaluations = [
        { pickId: 1, result: 'win', actualMargin: 7, requiredMargin: 3 },
        { pickId: 2, result: 'loss', actualMargin: 7, requiredMargin: -3 }
      ];
      mockReevaluateGamePicks.mockResolvedValue(mockPickEvaluations);

      const request = new NextRequest('http://localhost:3000/api/admin/games/1/result', {
        method: 'POST'
      });

      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        success: true,
        data: {
          pickEvaluations: mockPickEvaluations,
          picksUpdated: 2
        },
        message: '2 picks re-evaluated successfully.'
      });

      expect(mockReevaluateGamePicks).toHaveBeenCalledWith(1);
    });

    test('should reject non-admin users for re-evaluation', async () => {
      mockValidateAdminAuth.mockResolvedValue({ isValid: false, error: 'Not authorized' });

      const request = new NextRequest('http://localhost:3000/api/admin/games/1/result', {
        method: 'POST'
      });

      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({
        success: false,
        error: 'Not authorized'
      });

      expect(mockReevaluateGamePicks).not.toHaveBeenCalled();
    });

    test('should validate game ID for re-evaluation', async () => {
      mockValidateAdminAuth.mockResolvedValue({ isValid: true });

      const request = new NextRequest('http://localhost:3000/api/admin/games/invalid/result', {
        method: 'POST'
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'invalid' }) });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({
        success: false,
        error: 'Invalid game ID'
      });
    });

    test('should handle re-evaluation errors', async () => {
      mockValidateAdminAuth.mockResolvedValue({ isValid: true });
      mockReevaluateGamePicks.mockRejectedValue(new Error('No game found'));

      const request = new NextRequest('http://localhost:3000/api/admin/games/999/result', {
        method: 'POST'
      });

      const response = await POST(request, { params: Promise.resolve({ id: '999' }) });
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({
        success: false,
        error: 'Failed to re-evaluate picks'
      });
    });

    test('should handle no picks to re-evaluate', async () => {
      mockValidateAdminAuth.mockResolvedValue({ isValid: true });
      mockReevaluateGamePicks.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/games/1/result', {
        method: 'POST'
      });

      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        success: true,
        data: {
          pickEvaluations: [],
          picksUpdated: 0
        },
        message: '0 picks re-evaluated successfully.'
      });
    });
  });
});