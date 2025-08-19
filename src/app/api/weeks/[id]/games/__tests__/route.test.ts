import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock NextResponse and NextRequest
jest.mock('next/server', () => {
  const mockHeaders = {
    get: jest.fn(() => null), // Default to null for headers
  };
  
  return {
    NextRequest: jest.fn().mockImplementation(() => ({
      headers: mockHeaders,
    })),
    NextResponse: {
      json: jest.fn((data, options) => ({
        status: options?.status || 200,
        json: async () => data,
      })),
    },
  };
});

// Mock the games library
jest.mock('../../../../../../lib/games', () => ({
  getGamesByWeekId: jest.fn(),
}));

// Mock the oddsUpdater
jest.mock('../../../../../../lib/oddsUpdater', () => ({
  withOddsUpdate: jest.fn((authToken, fn) => fn()),
}));

import { getGamesByWeekId } from '../../../../../../lib/games';

const mockGetGamesByWeekId = getGamesByWeekId as jest.MockedFunction<typeof getGamesByWeekId>;

describe('/api/weeks/[id]/games', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return games for valid week ID', async () => {
    const mockGames = [
      {
        id: 1,
        week_id: 1,
        sport: 'americanfootball_nfl' as const,
        external_id: 'game1',
        home_team: 'Chiefs',
        away_team: 'Bills',
        commence_time: '2024-01-01T18:00:00Z',
        spread_home: -3.5,
        total_over_under: 47.5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 2,
        week_id: 1,
        sport: 'americanfootball_ncaaf' as const,
        external_id: 'game2',
        home_team: 'Alabama',
        away_team: 'Georgia',
        commence_time: '2024-01-02T20:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    mockGetGamesByWeekId.mockResolvedValue(mockGames);

    const request = new NextRequest('http://localhost/api/weeks/1/games');
    const params = Promise.resolve({ id: '1' });
    
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      data: mockGames,
    });
    expect(mockGetGamesByWeekId).toHaveBeenCalledWith(1);
  });

  it('should return empty array when no games exist for week', async () => {
    mockGetGamesByWeekId.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/weeks/1/games');
    const params = Promise.resolve({ id: '1' });
    
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      data: [],
    });
    expect(mockGetGamesByWeekId).toHaveBeenCalledWith(1);
  });

  it('should return 400 for invalid week ID', async () => {
    const request = new NextRequest('http://localhost/api/weeks/invalid/games');
    const params = Promise.resolve({ id: 'invalid' });
    
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Invalid week ID',
    });
    expect(mockGetGamesByWeekId).not.toHaveBeenCalled();
  });

  it('should return 400 for negative week ID', async () => {
    const request = new NextRequest('http://localhost/api/weeks/-1/games');
    const params = Promise.resolve({ id: '-1' });
    
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Invalid week ID',
    });
    expect(mockGetGamesByWeekId).not.toHaveBeenCalled();
  });

  it('should return 400 for zero week ID', async () => {
    const request = new NextRequest('http://localhost/api/weeks/0/games');
    const params = Promise.resolve({ id: '0' });
    
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Invalid week ID',
    });
    expect(mockGetGamesByWeekId).not.toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetGamesByWeekId.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost/api/weeks/1/games');
    const params = Promise.resolve({ id: '1' });
    
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to fetch games',
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching games for week:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should handle unexpected errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetGamesByWeekId.mockRejectedValue('Unexpected error');

    const request = new NextRequest('http://localhost/api/weeks/1/games');
    const params = Promise.resolve({ id: '1' });
    
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to fetch games',
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching games for week:',
      'Unexpected error'
    );

    consoleErrorSpy.mockRestore();
  });

  it('should handle large week IDs', async () => {
    mockGetGamesByWeekId.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/weeks/999999/games');
    const params = Promise.resolve({ id: '999999' });
    
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      data: [],
    });
    expect(mockGetGamesByWeekId).toHaveBeenCalledWith(999999);
  });
});