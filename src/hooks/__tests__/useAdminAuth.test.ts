import { renderHook, waitFor } from '@testing-library/react';
import { useAdminAuth } from '../useAdminAuth';

// Mock adminAuth
jest.mock('../../lib/adminAuth', () => ({
  isAdmin: jest.fn(),
  getCurrentAccessToken: jest.fn(),
}));

import { isAdmin, getCurrentAccessToken } from '../../lib/adminAuth';

const mockIsAdmin = isAdmin as jest.MockedFunction<typeof isAdmin>;
const mockGetCurrentAccessToken = getCurrentAccessToken as jest.MockedFunction<typeof getCurrentAccessToken>;

describe('useAdminAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return admin status when user is admin', async () => {
    mockGetCurrentAccessToken.mockReturnValue('test-access-token');
    mockIsAdmin.mockResolvedValue(true);

    const { result } = renderHook(() => useAdminAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAdmin).toBe(false);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(mockIsAdmin).toHaveBeenCalledTimes(1);
  });

  it('should return false when user is not admin', async () => {
    mockGetCurrentAccessToken.mockReturnValue('test-access-token');
    mockIsAdmin.mockResolvedValue(false);

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
    expect(mockIsAdmin).not.toHaveBeenCalled();
  });

  it('should handle isAdmin error gracefully', async () => {
    mockGetCurrentAccessToken.mockReturnValue('test-access-token');
    mockIsAdmin.mockRejectedValue(new Error('Network error'));

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
    expect(mockIsAdmin).not.toHaveBeenCalled();

    // Restore window
    global.window = originalWindow;
  });
});