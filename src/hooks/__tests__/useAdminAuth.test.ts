import { renderHook, waitFor } from '@testing-library/react';
import { useAdminAuth } from '../useAdminAuth';

// Mock adminAuth
jest.mock('../../lib/adminAuth', () => ({
  isCurrentUserAdmin: jest.fn(),
  getCurrentAccessToken: jest.fn(),
  authEventEmitter: {
    subscribe: jest.fn(() => jest.fn()), // Returns unsubscribe function
    emit: jest.fn(),
  },
}));

import { isCurrentUserAdmin, getCurrentAccessToken } from '../../lib/adminAuth';

const mockIsCurrentUserAdmin = isCurrentUserAdmin as jest.MockedFunction<typeof isCurrentUserAdmin>;
const mockGetCurrentAccessToken = getCurrentAccessToken as jest.MockedFunction<typeof getCurrentAccessToken>;

// Helper to create valid JWT tokens for testing
function createTestJWT(payload: Record<string, unknown>) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const signature = 'mock-signature';
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

describe('useAdminAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset module-level cache variables
    jest.resetModules();
    
    // Clear any timeouts/intervals
    jest.clearAllTimers();
  });

  it('should return admin status when user is admin', async () => {
    const adminToken = createTestJWT({
      sub: 'user-123',
      'cognito:groups': ['admin', 'users'],
      'cognito:username': 'testuser',
      email: 'test@example.com'
    });
    
    mockGetCurrentAccessToken.mockReturnValue(adminToken);
    mockIsCurrentUserAdmin.mockResolvedValue(true);

    const { result } = renderHook(() => useAdminAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAdmin).toBe(false);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(mockIsCurrentUserAdmin).toHaveBeenCalledTimes(1);
  });

  it('should return false when user is not admin', async () => {
    const regularToken = createTestJWT({
      sub: 'user-456',
      'cognito:groups': ['users'],
      'cognito:username': 'regularuser',
      email: 'user@example.com'
    });
    
    mockGetCurrentAccessToken.mockReturnValue(regularToken);
    mockIsCurrentUserAdmin.mockResolvedValue(false);

    const { result } = renderHook(() => useAdminAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
  });

  it('should return false when no access token', async () => {
    mockGetCurrentAccessToken.mockReturnValue(null);

    const { result } = renderHook(() => useAdminAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
    expect(mockIsCurrentUserAdmin).not.toHaveBeenCalled();
  });

  it('should handle isAdmin error gracefully', async () => {
    const validToken = createTestJWT({
      sub: 'user-789',
      'cognito:groups': ['users'],
      'cognito:username': 'erroruser',
      email: 'error@example.com'
    });
    
    mockGetCurrentAccessToken.mockReturnValue(validToken);
    mockIsCurrentUserAdmin.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAdminAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
  });

  it('should return false in server environment', async () => {
    // Mock window being undefined (server environment)
    const originalWindow = global.window;
    delete (global as unknown as { window?: unknown }).window;

    mockGetCurrentAccessToken.mockReturnValue(null);

    const { result } = renderHook(() => useAdminAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
    expect(mockIsCurrentUserAdmin).not.toHaveBeenCalled();

    // Restore window
    global.window = originalWindow;
  });
});