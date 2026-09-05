import { renderHook, waitFor } from '@testing-library/react';
import { useAdminAuth } from '../useAdminAuth';

type AuthChangeCallback = (user: { uid: string; getIdToken: () => Promise<string> } | null) => void;

let authChangeCallback: AuthChangeCallback | null = null;
const mockUnsubscribe = jest.fn();

jest.mock('../../lib/firebase/auth', () => ({
  subscribeToAuthChanges: jest.fn((callback: AuthChangeCallback) => {
    authChangeCallback = callback;
    return mockUnsubscribe;
  }),
}));

jest.mock('../../lib/adminAuth', () => ({
  validateAdminAuthClient: jest.fn(),
}));

import { validateAdminAuthClient } from '../../lib/adminAuth';

const mockValidateAdminAuthClient = validateAdminAuthClient as jest.MockedFunction<typeof validateAdminAuthClient>;

function makeUser(idToken: string) {
  return { uid: 'user-123', getIdToken: jest.fn().mockResolvedValue(idToken) };
}

describe('useAdminAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authChangeCallback = null;
  });

  it('should return admin status when the signed-in user is an admin', async () => {
    mockValidateAdminAuthClient.mockResolvedValue({ isAdmin: true, user: null });

    const { result } = renderHook(() => useAdminAuth());

    expect(result.current.isLoading).toBe(true);

    authChangeCallback!(makeUser('test-id-token'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.accessToken).toBe('test-id-token');
  });

  it('should return false when the signed-in user is not an admin', async () => {
    mockValidateAdminAuthClient.mockResolvedValue({ isAdmin: false, user: null, error: 'User does not have admin privileges' });

    const { result } = renderHook(() => useAdminAuth());

    authChangeCallback!(makeUser('test-id-token'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
  });

  it('should return false when no user is signed in', async () => {
    const { result } = renderHook(() => useAdminAuth());

    authChangeCallback!(null);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.accessToken).toBeNull();
    expect(mockValidateAdminAuthClient).not.toHaveBeenCalled();
  });

  it('should handle validation errors gracefully', async () => {
    mockValidateAdminAuthClient.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAdminAuth());

    authChangeCallback!(makeUser('test-id-token'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.authError).toBe('Network error');
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => useAdminAuth());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
