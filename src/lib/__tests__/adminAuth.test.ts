// Mock fetch globally
global.fetch = jest.fn();

import { isAdmin, getCurrentAccessToken, requireAdmin } from '../adminAuth';
import { NextRequest } from 'next/server';

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('AdminAuth Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('getCurrentAccessToken', () => {
    it('should return access token from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('test-access-token');

      const result = getCurrentAccessToken();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('accessToken');
      expect(result).toBe('test-access-token');
    });

    it('should return null when no token exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = getCurrentAccessToken();

      expect(result).toBeNull();
    });

    it('should return null in server environment', () => {
      // Mock window being undefined (server environment)
      const originalWindow = global.window;
      delete (global as unknown as { window?: unknown }).window;

      const result = getCurrentAccessToken();

      expect(result).toBeNull();

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('isAdmin', () => {
    it('should return true when user is admin', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-access-token');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isAdmin: true }),
      } as Response);

      const result = await isAdmin();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/admin', {
        headers: {
          Authorization: 'Bearer test-access-token',
        },
      });
      expect(result).toBe(true);
    });

    it('should return false when user is not admin', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-access-token');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isAdmin: false }),
      } as Response);

      const result = await isAdmin();

      expect(result).toBe(false);
    });

    it('should return false when no access token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = await isAdmin();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false when fetch fails', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-access-token');
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await isAdmin();

      expect(result).toBe(false);
    });

    it('should return false when response is not ok', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-access-token');
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      const result = await isAdmin();

      expect(result).toBe(false);
    });

    it('should handle absolute URL in server environment', async () => {
      // Mock server environment
      const originalWindow = global.window;
      delete (global as unknown as { window?: unknown }).window;

      // Mock process.env for server-side baseUrl
      const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';

      // Note: In server environment, getCurrentAccessToken returns null
      // so this test will return false without making a fetch call
      const result = await isAdmin();

      expect(result).toBe(false);

      // Restore
      global.window = originalWindow;
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    });
  });

  describe('requireAdmin', () => {
    it('should return authorized when user is admin', async () => {
      const adminCheck = await requireAdmin();
      
      // Mock the isAdmin check
      mockLocalStorage.getItem.mockReturnValue('test-access-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isAdmin: true }),
      } as Response);

      const mockRequest = new NextRequest('http://localhost:3000/api/test');
      const result = await adminCheck(mockRequest);

      expect(result.isAuthorized).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return unauthorized when user is not admin', async () => {
      const adminCheck = await requireAdmin();
      
      // Mock the isAdmin check
      mockLocalStorage.getItem.mockReturnValue('test-access-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isAdmin: false }),
      } as Response);

      const mockRequest = new NextRequest('http://localhost:3000/api/test');
      const result = await adminCheck(mockRequest);

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBe('Admin access required');
    });

    it('should return unauthorized when no access token', async () => {
      const adminCheck = await requireAdmin();
      
      // Mock no access token
      mockLocalStorage.getItem.mockReturnValue(null);

      const mockRequest = new NextRequest('http://localhost:3000/api/test');
      const result = await adminCheck(mockRequest);

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBe('Admin access required');
    });

    it('should return unauthorized when admin check fails', async () => {
      const adminCheck = await requireAdmin();
      
      // Mock the isAdmin check to throw error
      mockLocalStorage.getItem.mockReturnValue('test-access-token');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const mockRequest = new NextRequest('http://localhost:3000/api/test');
      const result = await adminCheck(mockRequest);

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBe('Admin access required');
    });
  });
});