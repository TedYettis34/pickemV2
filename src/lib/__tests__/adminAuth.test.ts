/**
 * @jest-environment jsdom
 */

jest.mock('../firebase/auth', () => ({
  getCachedIdToken: jest.fn(),
}));

import { isCurrentUserAdmin, getCurrentAccessToken, validateAdminAuthClient } from '../adminAuth';
import { getCachedIdToken } from '../firebase/auth';

const mockGetCachedIdToken = getCachedIdToken as jest.MockedFunction<typeof getCachedIdToken>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('AdminAuth Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentAccessToken', () => {
    it('should return the cached ID token', () => {
      mockGetCachedIdToken.mockReturnValue('test-id-token');

      const result = getCurrentAccessToken();

      expect(result).toBe('test-id-token');
    });

    it('should return null when no token is cached', () => {
      mockGetCachedIdToken.mockReturnValue(null);

      const result = getCurrentAccessToken();

      expect(result).toBeNull();
    });

    it('should return null in server environment', () => {
      const originalWindow = global.window;
      delete (global as unknown as { window?: unknown }).window;

      const result = getCurrentAccessToken();

      expect(result).toBeNull();

      global.window = originalWindow;
    });
  });

  describe('validateAdminAuthClient', () => {
    it('should return isAdmin true when the API confirms admin access', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isAdmin: true, user: { uid: 'u1', email: 'a@b.com', name: 'A', isAdmin: true } }),
      } as Response);

      const result = await validateAdminAuthClient('test-id-token');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost/api/auth/admin', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-id-token',
          'Content-Type': 'application/json',
        },
      });
      expect(result.isAdmin).toBe(true);
    });

    it('should return an error when no token is provided', async () => {
      const result = await validateAdminAuthClient('');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual({ isAdmin: false, user: null, error: 'Invalid access token' });
    });

    it('should return isAdmin false with error message on 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'User does not have admin privileges' }),
      } as Response);

      const result = await validateAdminAuthClient('test-id-token');

      expect(result.isAdmin).toBe(false);
      expect(result.error).toBe('User does not have admin privileges');
    });

    it('should handle fetch throwing an error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await validateAdminAuthClient('test-id-token');

      expect(result.isAdmin).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('isCurrentUserAdmin', () => {
    it('should return true when the cached token maps to an admin user', async () => {
      mockGetCachedIdToken.mockReturnValue('test-id-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isAdmin: true }),
      } as Response);

      const result = await isCurrentUserAdmin();

      expect(result).toBe(true);
    });

    it('should return false when there is no cached token', async () => {
      mockGetCachedIdToken.mockReturnValue(null);

      const result = await isCurrentUserAdmin();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false when the API call fails', async () => {
      mockGetCachedIdToken.mockReturnValue('test-id-token');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await isCurrentUserAdmin();

      expect(result).toBe(false);
    });

  });
});
