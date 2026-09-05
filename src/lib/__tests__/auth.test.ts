const mockSignOut = jest.fn();

jest.mock('../firebase/client', () => ({
  firebaseAuth: {
    get currentUser() {
      return (global as unknown as { __mockCurrentUser: unknown }).__mockCurrentUser ?? null;
    },
  },
}));

jest.mock('../firebase/auth', () => ({
  signOut: () => mockSignOut(),
}));

import { isAuthenticated, logout } from '../auth';

describe('Firebase-backed auth helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as unknown as { __mockCurrentUser: unknown }).__mockCurrentUser = null;
  });

  describe('isAuthenticated', () => {
    it('should return true when a user is signed in', () => {
      (global as unknown as { __mockCurrentUser: unknown }).__mockCurrentUser = { uid: 'user-123' };

      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when no user is signed in', () => {
      expect(isAuthenticated()).toBe(false);
    });

    it('should return false in server environment', () => {
      const originalWindow = global.window;
      delete (global as unknown as { window?: unknown }).window;

      expect(isAuthenticated()).toBe(false);

      global.window = originalWindow;
    });
  });

  describe('logout', () => {
    it('should call Firebase sign out', async () => {
      await logout();

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });
});
