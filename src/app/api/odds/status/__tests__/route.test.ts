/**
 * @jest-environment node
 */

// Mock dependencies BEFORE imports
jest.mock('../../../../../lib/games', () => ({
  getLastOddsUpdateTime: jest.fn(),
  oddsNeedUpdate: jest.fn(),
}));

import { GET } from '../route';
import { getLastOddsUpdateTime, oddsNeedUpdate } from '../../../../../lib/games';

const mockGetLastOddsUpdateTime = getLastOddsUpdateTime as jest.MockedFunction<typeof getLastOddsUpdateTime>;
const mockOddsNeedUpdate = oddsNeedUpdate as jest.MockedFunction<typeof oddsNeedUpdate>;

describe('/api/odds/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    
    // Mock current time to ensure consistent test results
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T15:30:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('GET', () => {
    test('should return odds status with no previous update', async () => {
      mockGetLastOddsUpdateTime.mockResolvedValue(null);
      mockOddsNeedUpdate.mockResolvedValue(true);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        success: true,
        data: {
          lastUpdated: null,
          needsUpdate: true,
          nextUpdateDue: null,
          timeSinceUpdate: null
        }
      });

      expect(mockGetLastOddsUpdateTime).toHaveBeenCalledTimes(1);
      expect(mockOddsNeedUpdate).toHaveBeenCalledTimes(1);
    });

    test('should return odds status with recent update', async () => {
      const lastUpdate = new Date('2024-01-01T14:00:00Z'); // 1.5 hours ago
      mockGetLastOddsUpdateTime.mockResolvedValue(lastUpdate);
      mockOddsNeedUpdate.mockResolvedValue(false);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        success: true,
        data: {
          lastUpdated: '2024-01-01T14:00:00.000Z',
          needsUpdate: false,
          nextUpdateDue: '2024-01-01T17:00:00.000Z', // 3 hours after last update
          timeSinceUpdate: '1h 30m ago'
        }
      });
    });

    test('should format time correctly for updates less than 1 hour ago', async () => {
      const lastUpdate = new Date('2024-01-01T15:05:00Z'); // 25 minutes ago
      mockGetLastOddsUpdateTime.mockResolvedValue(lastUpdate);
      mockOddsNeedUpdate.mockResolvedValue(false);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.timeSinceUpdate).toBe('25m ago');
    });

    test('should format time correctly for updates exactly 1 hour ago', async () => {
      const lastUpdate = new Date('2024-01-01T14:30:00Z'); // Exactly 1 hour ago
      mockGetLastOddsUpdateTime.mockResolvedValue(lastUpdate);
      mockOddsNeedUpdate.mockResolvedValue(false);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.timeSinceUpdate).toBe('1h 0m ago');
    });

    test('should format time correctly for updates multiple hours ago', async () => {
      const lastUpdate = new Date('2024-01-01T10:15:00Z'); // 5 hours 15 minutes ago
      mockGetLastOddsUpdateTime.mockResolvedValue(lastUpdate);
      mockOddsNeedUpdate.mockResolvedValue(true);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.timeSinceUpdate).toBe('5h 15m ago');
      expect(body.data.needsUpdate).toBe(true);
    });

    test('should handle nextUpdateDue calculation correctly', async () => {
      const lastUpdate = new Date('2024-01-01T12:00:00Z');
      mockGetLastOddsUpdateTime.mockResolvedValue(lastUpdate);
      mockOddsNeedUpdate.mockResolvedValue(false);

      const response = await GET();
      const body = await response.json();

      // Next update should be 3 hours after last update
      expect(body.data.nextUpdateDue).toBe('2024-01-01T15:00:00.000Z');
    });

    test('should handle error when getLastOddsUpdateTime fails', async () => {
      mockGetLastOddsUpdateTime.mockRejectedValue(new Error('Database connection failed'));

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({
        success: false,
        error: 'Failed to get odds status'
      });

      expect(console.error).toHaveBeenCalledWith('Error getting odds status:', expect.any(Error));
    });

    test('should handle error when oddsNeedUpdate fails', async () => {
      mockGetLastOddsUpdateTime.mockResolvedValue(new Date());
      mockOddsNeedUpdate.mockRejectedValue(new Error('Query failed'));

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({
        success: false,
        error: 'Failed to get odds status'
      });
    });

    test('should return needsUpdate true when appropriate', async () => {
      const oldUpdate = new Date('2024-01-01T08:00:00Z'); // Very old update
      mockGetLastOddsUpdateTime.mockResolvedValue(oldUpdate);
      mockOddsNeedUpdate.mockResolvedValue(true);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.needsUpdate).toBe(true);
      expect(body.data.timeSinceUpdate).toBe('7h 30m ago');
    });

    test('should handle both functions returning data successfully', async () => {
      const recentUpdate = new Date('2024-01-01T15:00:00Z'); // 30 minutes ago
      mockGetLastOddsUpdateTime.mockResolvedValue(recentUpdate);
      mockOddsNeedUpdate.mockResolvedValue(false);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.lastUpdated).toBe('2024-01-01T15:00:00.000Z');
      expect(body.data.needsUpdate).toBe(false);
      expect(body.data.nextUpdateDue).toBe('2024-01-01T18:00:00.000Z');
      expect(body.data.timeSinceUpdate).toBe('30m ago');
    });

    test('should handle edge case of update exactly at current time', async () => {
      const currentTime = new Date('2024-01-01T15:30:00Z'); // Same as mocked current time
      mockGetLastOddsUpdateTime.mockResolvedValue(currentTime);
      mockOddsNeedUpdate.mockResolvedValue(false);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.timeSinceUpdate).toBe('0m ago');
      expect(body.data.nextUpdateDue).toBe('2024-01-01T18:30:00.000Z');
    });

    test('should handle non-Error exceptions', async () => {
      mockGetLastOddsUpdateTime.mockRejectedValue('String error');

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({
        success: false,
        error: 'Failed to get odds status'
      });

      expect(console.error).toHaveBeenCalledWith('Error getting odds status:', 'String error');
    });
  });
});