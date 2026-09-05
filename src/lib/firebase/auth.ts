import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  onIdTokenChanged,
  User,
} from 'firebase/auth';
import { firebaseAuth } from './client';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

// Keep a live, synchronously-readable cache of the current user's ID token.
// Firebase's own token retrieval is always async (it may need to refresh),
// but several parts of the app need a token synchronously (e.g. to build
// fetch headers). This listener keeps the cache in sync with sign-in/out
// and automatic background token refreshes.
let cachedIdToken: string | null = null;

if (typeof window !== 'undefined') {
  onIdTokenChanged(firebaseAuth, async (user) => {
    cachedIdToken = user ? await user.getIdToken() : null;
  });
}

/**
 * Synchronously read the last-known ID token without triggering a network
 * request. May be null if no user is signed in or the initial auth state
 * hasn't resolved yet.
 */
export function getCachedIdToken(): string | null {
  return cachedIdToken;
}

/**
 * Sign in an existing user with email and password.
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    return { success: true, user: credential.user };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error) };
  }
}

/**
 * Create a new account with email and password.
 */
export async function signUp(email: string, password: string): Promise<AuthResult> {
  try {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    return { success: true, user: credential.user };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error) };
  }
}

/**
 * Sign in (or sign up) using a Google account via popup.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(firebaseAuth, provider);
    return { success: true, user: credential.user };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error) };
  }
}

/**
 * Sign the current user out.
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(firebaseAuth);
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 */
export function subscribeToAuthChanges(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(firebaseAuth, callback);
}

/**
 * Get the current user's ID token, refreshing it if necessary.
 * Returns null if no user is signed in.
 */
export async function getCurrentIdToken(forceRefresh = false): Promise<string | null> {
  const user = firebaseAuth.currentUser;
  if (!user) {
    return null;
  }
  return user.getIdToken(forceRefresh);
}

function getAuthErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 8 characters.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in was cancelled.';
      default:
        return `Authentication failed (${code}).`;
    }
  }
  return error instanceof Error ? error.message : 'Authentication failed.';
}
