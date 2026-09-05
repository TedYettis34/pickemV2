import { getCachedIdToken } from './firebase/auth';

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

export interface AdminAuthResult {
  isAdmin: boolean;
  user: AuthUser | null;
  error?: string;
}

// NOTE: Server-side verification (validateAdminAuth / requireAdmin) lives in
// ./adminAuth.server.ts, which imports the Firebase Admin SDK. That SDK
// relies on Node built-ins (fs/net/http2) and must never be imported from
// client-side code, so it is kept out of this file (which client hooks
// import for validateAdminAuthClient / isCurrentUserAdmin below).

/**
 * Client-side helper: calls the /api/auth/admin endpoint with the given
 * Firebase ID token to check admin status.
 */
export async function validateAdminAuthClient(idToken: string): Promise<AdminAuthResult> {
  try {
    if (!idToken || typeof idToken !== 'string') {
      return { isAdmin: false, user: null, error: 'Invalid access token' };
    }

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/auth/admin`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 401) {
        return {
          isAdmin: false,
          user: null,
          error: errorData.error || 'User does not have admin privileges',
        };
      }

      return {
        isAdmin: false,
        user: null,
        error: errorData.error || 'Authentication failed',
      };
    }

    const data = await response.json();

    return {
      isAdmin: data.isAdmin,
      user: data.user,
    };
  } catch (error) {
    console.error('Error validating admin auth:', error);
    return {
      isAdmin: false,
      user: null,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

/**
 * Client-side helper to check if the currently signed-in user is an admin.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const token = getCurrentAccessToken();
    if (!token) {
      return false;
    }

    const authResult = await validateAdminAuthClient(token);
    return authResult.isAdmin;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get the current user's cached Firebase ID token, synchronously.
 * May be null if the initial auth state hasn't resolved yet or no user is
 * signed in.
 */
export function getCurrentAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return getCachedIdToken();
}
