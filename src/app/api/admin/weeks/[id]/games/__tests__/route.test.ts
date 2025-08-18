/**
 * @jest-environment node
 */

// Mock dependencies BEFORE imports
jest.mock('../../../../../../../lib/database', () => ({
  getDatabase: jest.fn(),
  closeDatabasePool: jest.fn(),
  query: jest.fn(),
  transaction: jest.fn(),
}));

jest.mock('../../../../../../../lib/weeks', () => ({
  WeekRepository: {
    findById: jest.fn(),
  },
}));

jest.mock('../../../../../../../lib/games', () => ({
  getGamesByWeekId: jest.fn(),
  createGamesForWeek: jest.fn(),
  deleteGamesByWeekId: jest.fn(),
}));

jest.mock('../../../../../../../lib/oddsApi', () => ({
  oddsApiService: {
    getAllFootballGames: jest.fn(),
    transformToGameData: jest.fn(),
  },
}));

jest.mock('../../../../../../../lib/adminAuth');

import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../route';
import { WeekRepository } from '../../../../../../../lib/weeks';
import { getGamesByWeekId, createGamesForWeek, deleteGamesByWeekId } from '../../../../../../../lib/games';
import { oddsApiService } from '../../../../../../../lib/oddsApi';
import { requireAdmin } from '../../../../../../../lib/adminAuth';
import { Week } from '../../../../../../../types/week';
import { Game } from '../../../../../../../types/game';

const mockWeekRepository = WeekRepository as {
  findById: jest.MockedFunction<(id: number) => Promise<Week | null>>;
};

const mockGetGamesByWeekId = getGamesByWeekId as jest.MockedFunction<typeof getGamesByWeekId>;
const mockCreateGamesForWeek = createGamesForWeek as jest.MockedFunction<typeof createGamesForWeek>;
const mockDeleteGamesByWeekId = deleteGamesByWeekId as jest.MockedFunction<typeof deleteGamesByWeekId>;
interface MockOddsResponse {
  nfl: unknown[];
  college: unknown[];
}

const mockOddsApiService = oddsApiService as {
  getAllFootballGames: jest.MockedFunction<(startDate: string, endDate: string) => Promise<MockOddsResponse>>;
  transformToGameData: jest.MockedFunction<(event: unknown, weekId: number) => Game>;
};
const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;

describe('/api/admin/weeks/[id]/games', () => {
  const mockWeek: Week = {
    id: 1,
    name: 'Test Week',
    start_date: '2024-01-01T00:00:00Z',
    end_date: '2024-01-07T23:59:59Z',
    description: 'Test week',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockGame: Game = {
    id: 1,
    external_id: 'game1',
    week_id: 1,
    home_team: 'Team A',
    away_team: 'Team B',
    commence_time: '2024-01-01T20:00:00Z',
    sport: 'americanfootball_nfl',
    spread_home: -3.5,
    spread_away: 3.5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockAdminAuth = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockReturnValue(mockAdminAuth);
  });

  describe('GET', () => {
    it('should return games for a week when authorized', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(mockWeek);
      mockGetGamesByWeekId.mockResolvedValue([mockGame]);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1/games');
      const params = Promise.resolve({ id: '1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([mockGame]);
      expect(mockGetGamesByWeekId).toHaveBeenCalledWith(1);
    });

    it('should return 401 when not authorized', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: false,
        error: 'Unauthorized',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1/games');
      const params = Promise.resolve({ id: '1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid week ID', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/invalid/games');
      const params = Promise.resolve({ id: 'invalid' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid week ID');
    });

    it('should return 404 when week not found', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/999/games');
      const params = Promise.resolve({ id: '999' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Week not found');
    });

    it('should return empty array when no games found', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(mockWeek);
      mockGetGamesByWeekId.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1/games');
      const params = Promise.resolve({ id: '1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });
  });

  describe('POST - Preview Action', () => {
    it('should preview games from Odds API', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(mockWeek);

      const mockApiResponse = {
        nfl: [{ id: 'nfl1', home_team: 'Team A', away_team: 'Team B' }],
        college: [{ id: 'college1', home_team: 'College A', away_team: 'College B' }],
      };

      mockOddsApiService.getAllFootballGames.mockResolvedValue(mockApiResponse);
      mockOddsApiService.transformToGameData.mockReturnValue(mockGame);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1/games', {
        method: 'POST',
        body: JSON.stringify({ action: 'preview' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = Promise.resolve({ id: '1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('nfl');
      expect(data.data).toHaveProperty('college');
      expect(data.message).toContain('Found');
      expect(mockOddsApiService.getAllFootballGames).toHaveBeenCalledWith(
        mockWeek.start_date,
        mockWeek.end_date
      );
    });

    it('should return 404 when week not found for preview', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/999/games', {
        method: 'POST',
        body: JSON.stringify({ action: 'preview' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = Promise.resolve({ id: '999' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Week not found');
    });
  });

  describe('POST - Save Action', () => {
    it('should save games to the week', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(mockWeek);
      mockDeleteGamesByWeekId.mockResolvedValue(undefined);
      mockCreateGamesForWeek.mockResolvedValue([mockGame]);

      const gamesData = {
        nflGames: [mockGame],
        collegeGames: [],
      };

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1/games', {
        method: 'POST',
        body: JSON.stringify({ action: 'save', ...gamesData }),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = Promise.resolve({ id: '1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.games).toEqual([mockGame]);
      expect(data.message).toBe('Saved 1 games to week');
      expect(mockDeleteGamesByWeekId).toHaveBeenCalledWith(1);
      expect(mockCreateGamesForWeek).toHaveBeenCalledWith([mockGame]);
    });

    it('should return 404 when week not found for save', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/999/games', {
        method: 'POST',
        body: JSON.stringify({ action: 'save', nflGames: [], collegeGames: [] }),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = Promise.resolve({ id: '999' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Week not found');
    });

    it('should handle empty games data', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(mockWeek);
      mockDeleteGamesByWeekId.mockResolvedValue(undefined);
      mockCreateGamesForWeek.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1/games', {
        method: 'POST',
        body: JSON.stringify({ action: 'save', nflGames: [], collegeGames: [] }),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = Promise.resolve({ id: '1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Saved 0 games to week');
      expect(mockCreateGamesForWeek).toHaveBeenCalledWith([]);
    });
  });

  describe('POST - Invalid Action', () => {
    it('should return 400 for invalid action', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1/games', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = Promise.resolve({ id: '1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid action. Use "preview" or "save"');
    });
  });

  describe('DELETE', () => {
    it('should delete all games for a week', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(mockWeek);
      mockDeleteGamesByWeekId.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1/games', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: '1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('All games deleted for this week');
      expect(mockDeleteGamesByWeekId).toHaveBeenCalledWith(1);
    });

    it('should return 401 when not authorized for delete', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: false,
        error: 'Unauthorized',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1/games', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: '1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid week ID on delete', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/invalid/games', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: 'invalid' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid week ID');
    });

    it('should return 404 when week not found for delete', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/999/games', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: '999' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Week not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in GET', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1/games');
      const params = Promise.resolve({ id: '1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch games');
    });

    it('should handle API errors gracefully in POST preview', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(mockWeek);
      mockOddsApiService.getAllFootballGames.mockRejectedValue(new Error('API error'));

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1/games', {
        method: 'POST',
        body: JSON.stringify({ action: 'preview' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = Promise.resolve({ id: '1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to process games operation');
    });

    it('should handle save errors gracefully in POST save', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(mockWeek);
      mockCreateGamesForWeek.mockRejectedValue(new Error('Save error'));

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1/games', {
        method: 'POST',
        body: JSON.stringify({ action: 'save', nflGames: [], collegeGames: [] }),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = Promise.resolve({ id: '1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to process games operation');
    });

    it('should handle delete errors gracefully', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(mockWeek);
      mockDeleteGamesByWeekId.mockRejectedValue(new Error('Delete error'));

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1/games', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: '1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to delete games');
    });
  });
});