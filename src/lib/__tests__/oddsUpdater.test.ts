/**
 * @jest-environment node
 */

// Mock dependencies
jest.mock('../games', () => ({
  oddsNeedUpdate: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock console methods to prevent test warnings
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

import { ensureOddsAreCurrent, withOddsUpdate } from '../oddsUpdater';
import { oddsNeedUpdate } from '../games';

const mockOddsNeedUpdate = oddsNeedUpdate as jest.MockedFunction<typeof oddsNeedUpdate>;
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('oddsUpdater', () => {
  const mockAuthToken = 'test-auth-token';
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.VERCEL_URL;
  });

  describe('ensureOddsAreCurrent', () => {
    it('should return false when odds do not need updating', async () => {
      mockOddsNeedUpdate.mockResolvedValueOnce(false);

      const result = await ensureOddsAreCurrent(mockAuthToken);

      expect(result).toBe(false);
      expect(mockOddsNeedUpdate).toHaveBeenCalledTimes(1);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Odds are current, no update needed');
    });

    it('should trigger update when odds need updating (localhost)', async () => {
      mockOddsNeedUpdate.mockResolvedValueOnce(true);
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          summary: 'Updated 10 games'
        })
      };
      mockFetch.mockResolvedValueOnce(mockResponse as unknown as Response);

      const result = await ensureOddsAreCurrent(mockAuthToken);

      expect(result).toBe(true);
      expect(mockOddsNeedUpdate).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/admin/odds/update',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockAuthToken}`
          }
        }
      );
      expect(console.log).toHaveBeenCalledWith('Odds are stale (>3 hours old), triggering update...');
      expect(console.log).toHaveBeenCalledWith('Odds update completed:', 'Updated 10 games');
    });

    it('should use NEXT_PUBLIC_BASE_URL when available', async () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'https://my-app.com';
      mockOddsNeedUpdate.mockResolvedValueOnce(true);
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ summary: 'Updated' })
      };
      mockFetch.mockResolvedValueOnce(mockResponse as unknown as Response);

      await ensureOddsAreCurrent(mockAuthToken);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://my-app.com/api/admin/odds/update',
        expect.any(Object)
      );
    });

    it('should use VERCEL_URL when NEXT_PUBLIC_BASE_URL is not available', async () => {
      process.env.VERCEL_URL = 'my-app.vercel.app';
      mockOddsNeedUpdate.mockResolvedValueOnce(true);
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ summary: 'Updated' })
      };
      mockFetch.mockResolvedValueOnce(mockResponse as unknown as Response);

      await ensureOddsAreCurrent(mockAuthToken);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://my-app.vercel.app/api/admin/odds/update',
        expect.any(Object)
      );
    });

    it('should handle API response errors gracefully', async () => {
      mockOddsNeedUpdate.mockResolvedValueOnce(true);
      
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      };
      mockFetch.mockResolvedValueOnce(mockResponse as unknown as Response);

      const result = await ensureOddsAreCurrent(mockAuthToken);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to update odds:',
        401,
        'Unauthorized'
      );
    });

    it('should handle fetch errors gracefully', async () => {
      mockOddsNeedUpdate.mockResolvedValueOnce(true);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await ensureOddsAreCurrent(mockAuthToken);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Error ensuring odds are current:',
        expect.any(Error)
      );
    });

    it('should handle oddsNeedUpdate errors gracefully', async () => {
      mockOddsNeedUpdate.mockRejectedValueOnce(new Error('Database error'));

      const result = await ensureOddsAreCurrent(mockAuthToken);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Error ensuring odds are current:',
        expect.any(Error)
      );
    });

    it('should handle JSON parsing errors gracefully', async () => {
      mockOddsNeedUpdate.mockResolvedValueOnce(true);
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockRejectedValueOnce(new Error('JSON parse error'))
      };
      mockFetch.mockResolvedValueOnce(mockResponse as unknown as Response);

      const result = await ensureOddsAreCurrent(mockAuthToken);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Error ensuring odds are current:',
        expect.any(Error)
      );
    });
  });

  describe('withOddsUpdate', () => {
    it('should execute operation normally when odds update succeeds', async () => {
      mockOddsNeedUpdate.mockResolvedValueOnce(false); // No update needed
      
      const mockOperation = jest.fn().mockResolvedValueOnce('operation result');
      
      const result = await withOddsUpdate(mockAuthToken, mockOperation);

      expect(result).toBe('operation result');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should execute operation even when odds update fails', async () => {
      mockOddsNeedUpdate.mockRejectedValueOnce(new Error('Update failed'));
      
      const mockOperation = jest.fn().mockResolvedValueOnce('operation result');
      
      const result = await withOddsUpdate(mockAuthToken, mockOperation);

      expect(result).toBe('operation result');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      
      // Wait a bit for the background error to be logged
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(console.error).toHaveBeenCalledWith(
        'Error ensuring odds are current:',
        expect.any(Error)
      );
    });

    it('should execute operation even when odds update throws', async () => {
      // Mock ensureOddsAreCurrent to throw synchronously
      mockOddsNeedUpdate.mockImplementationOnce(() => {
        throw new Error('Sync error');
      });
      
      const mockOperation = jest.fn().mockResolvedValueOnce('operation result');
      
      const result = await withOddsUpdate(mockAuthToken, mockOperation);

      expect(result).toBe('operation result');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      
      // Wait a bit for the background error to be logged
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(console.error).toHaveBeenCalledWith(
        'Error ensuring odds are current:',
        expect.any(Error)
      );
    });

    it('should propagate operation errors', async () => {
      mockOddsNeedUpdate.mockResolvedValueOnce(false);
      
      const mockOperation = jest.fn().mockRejectedValueOnce(new Error('Operation failed'));
      
      await expect(withOddsUpdate(mockAuthToken, mockOperation)).rejects.toThrow('Operation failed');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should handle complex operation return values', async () => {
      mockOddsNeedUpdate.mockResolvedValueOnce(false);
      
      const complexResult = {
        data: [1, 2, 3],
        meta: { count: 3 },
        success: true
      };
      const mockOperation = jest.fn().mockResolvedValueOnce(complexResult);
      
      const result = await withOddsUpdate(mockAuthToken, mockOperation);

      expect(result).toEqual(complexResult);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should run odds update in background without blocking operation', async () => {
      // Make odds update slow
      mockOddsNeedUpdate.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 100))
      );
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ summary: 'Updated' })
      };
      mockFetch.mockResolvedValueOnce(mockResponse as unknown as Response);
      
      const mockOperation = jest.fn().mockResolvedValueOnce('fast result');
      
      const startTime = Date.now();
      const result = await withOddsUpdate(mockAuthToken, mockOperation);
      const endTime = Date.now();

      // Operation should complete quickly (not wait for 100ms odds update)
      expect(endTime - startTime).toBeLessThan(50);
      expect(result).toBe('fast result');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });
});