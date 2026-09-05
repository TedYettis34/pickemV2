import { firebaseAuth } from './firebase/client';
import { signOut as firebaseSignOut } from './firebase/auth';

/**
 * Check if a user is currently authenticated (synchronous, based on
 * Firebase's client-side cached auth state).
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return firebaseAuth.currentUser !== null;
}

/**
 * Sign the current user out.
 */
export async function logout(): Promise<void> {
  await firebaseSignOut();
}
