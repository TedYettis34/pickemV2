/**
 * User authentication utilities for picks functionality.
 * Provides the current user context and auth headers, backed by Firebase
 * Auth on the client.
 */
import { firebaseAuth } from './firebase/client';
import { getCachedIdToken } from './firebase/auth';

export interface UserContext {
  userId: string;
  email: string;
  name: string;
  accessToken: string;
}

/**
 * Get the current user context from Firebase Auth's client-side state.
 * Returns null if no user is signed in, or if the current ID token hasn't
 * been cached yet (e.g. immediately after page load, before Firebase's
 * async auth-state resolution completes).
 */
export function getCurrentUserContext(): UserContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const user = firebaseAuth.currentUser;
  const token = getCachedIdToken();

  if (!user || !token) {
    return null;
  }

  return {
    userId: user.uid,
    email: user.email || '',
    name: user.displayName || user.email || 'User',
    accessToken: token,
  };
}

/**
 * Get authentication headers for API requests. Always fetches a fresh
 * (auto-refreshed if needed) ID token from the Firebase SDK.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window === 'undefined') {
    return {};
  }

  const user = firebaseAuth.currentUser;
  if (!user) {
    return {};
  }

  try {
    const token = await user.getIdToken();
    return {
      Authorization: `Bearer ${token}`,
      'x-user-id': user.uid,
    };
  } catch (error) {
    console.error('Error getting auth headers:', error);
    return {};
  }
}

/**
 * Synchronous variant of getAuthHeaders(), using the last cached ID token.
 * Prefer getAuthHeaders() where an async call site is available.
 */
export function getAuthHeadersSync(): Record<string, string> {
  const userContext = getCurrentUserContext();

  if (!userContext) {
    return {};
  }

  return {
    Authorization: `Bearer ${userContext.accessToken}`,
    'x-user-id': userContext.userId,
  };
}

/**
 * Check if a user is currently authenticated.
 */
export function isUserAuthenticated(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return firebaseAuth.currentUser !== null;
}

/**
 * Get the current user's Firebase UID.
 */
export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return firebaseAuth.currentUser?.uid || null;
}
