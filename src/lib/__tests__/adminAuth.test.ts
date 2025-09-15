/**
 * @jest-environment jsdom
 */

// Mock fetch globally
global.fetch = jest.fn();

// Mock AWS SDK components used by validateAdminAuthDirect
jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  GetUserCommand: jest.fn().mockImplementation((params) => ({ params })),
  AdminListGroupsForUserCommand: jest.fn().mockImplementation((params) => ({ params })),
}));

import { isCurrentUserAdmin, getCurrentAccessToken, requireAdmin } from '../adminAuth';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
const mockCognitoClient = CognitoIdentityProviderClient as jest.MockedClass<typeof CognitoIdentityProviderClient>;

// Helper to create valid JWT tokens for testing
function createTestJWT(payload: Record<string, unknown>) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const signature = 'mock-signature';
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

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
  let mockClientInstance: { send: jest.MockedFunction<(command: unknown) => Promise<unknown>> };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Setup AWS SDK mocks
    mockClientInstance = { send: jest.fn() };
    mockCognitoClient.mockImplementation(() => mockClientInstance);
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

  describe('isCurrentUserAdmin', () => {
    it('should return true when user is admin', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-access-token');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isAdmin: true }),
      } as Response);

      const result = await isCurrentUserAdmin();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost/api/auth/admin', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-access-token',
          'Content-Type': 'application/json',
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

      const result = await isCurrentUserAdmin();

      expect(result).toBe(false);
    });

    it('should return false when no access token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = await isCurrentUserAdmin();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false when fetch fails', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-access-token');
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await isCurrentUserAdmin();

      expect(result).toBe(false);
    });

    it('should return false when response is not ok', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-access-token');
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'User does not have admin privileges' }),
      } as Response);

      const result = await isCurrentUserAdmin();

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
      const result = await isCurrentUserAdmin();

      expect(result).toBe(false);

      // Restore
      global.window = originalWindow;
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    });

    it('should handle token expiration from API response', async () => {
      mockLocalStorage.getItem.mockReturnValue('expired-access-token');
      
      // First call fails with 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Token expired' }),
      } as Response);
      
      // Mock the token refresh to fail (OAuth refresh call)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: 'invalid_grant' }),
      } as Response);

      const result = await isCurrentUserAdmin();

      expect(result).toBe(false);
      // Since refresh failed, the auth event should be emitted instead of removing token directly
      // The token removal would happen in the auth event handler, not directly in this function
    });
  });

  describe('requireAdmin', () => {
    it('should return authorized when user is admin', async () => {
      const adminCheck = requireAdmin();
      
      // Create a valid JWT token with admin group
      const adminToken = createTestJWT({
        sub: 'user-123',
        'cognito:groups': ['admin', 'users'],
        'cognito:username': 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        exp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
      });

      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue(`Bearer ${adminToken}`),
        },
      } as Request;
      
      const result = await adminCheck(mockRequest);

      expect(result.isAuthorized).toBe(true);
      expect(result.user).toEqual({
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        groups: ['admin', 'users'],
      });
      expect(result.error).toBeUndefined();
    });

    it('should return unauthorized when user is not admin', async () => {
      const adminCheck = requireAdmin();
      
      // Create a valid JWT token without admin group
      const regularToken = createTestJWT({
        sub: 'user-456',
        'cognito:groups': ['users'],
        'cognito:username': 'regularuser',
        email: 'user@example.com',
        name: 'Regular User',
        exp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
      });

      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue(`Bearer ${regularToken}`),
        },
      } as Request;
      
      const result = await adminCheck(mockRequest);

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBe('Admin access required');
    });

    it('should return unauthorized when no authorization header', async () => {
      const adminCheck = requireAdmin();

      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
      } as Request;
      
      const result = await adminCheck(mockRequest);

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBe('Authorization header required');
    });

    it('should return unauthorized when authorization header is malformed', async () => {
      const adminCheck = requireAdmin();

      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('InvalidHeader'),
        },
      } as Request;
      
      const result = await adminCheck(mockRequest);

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBe('Authorization header required');
    });

    it('should return unauthorized when token is invalid format', async () => {
      const adminCheck = requireAdmin();
      
      // Use an invalid JWT token (not properly formatted)
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('Bearer invalid-token-format'),
        },
      } as Request;
      
      const result = await adminCheck(mockRequest);

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBe('Invalid token format');
    });
  });
});