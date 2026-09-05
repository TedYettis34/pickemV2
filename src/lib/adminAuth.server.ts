import 'server-only';
import { adminAuth as firebaseAdminAuth } from './firebase/admin';
import type { AuthUser } from './adminAuth';

/**
 * Server-side validation of an admin request using the Firebase Admin SDK.
 * Verifies the ID token's signature/expiry and checks the `admin` custom
 * claim. Accepts a NextRequest-like object so it works in Route Handlers.
 *
 * IMPORTANT: This file must only be imported from server-side code (API
 * routes). It pulls in firebase-admin, which relies on Node built-ins
 * (fs/net/http2) that cannot be bundled for the browser.
 */
export async function validateAdminAuth(
  request: Request | { headers: { get(name: string): string | null } }
): Promise<{ isValid: boolean; user?: AuthUser; error?: string }> {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isValid: false, error: 'Authorization header required' };
    }

    const idToken = authHeader.substring(7).trim();
    if (!idToken) {
      return { isValid: false, error: 'Invalid access token format' };
    }

    let decoded;
    try {
      decoded = await firebaseAdminAuth.verifyIdToken(idToken);
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : undefined;
      if (code === 'auth/id-token-expired') {
        return { isValid: false, error: 'Token expired' };
      }
      return { isValid: false, error: 'Invalid access token' };
    }

    const isAdmin = decoded.admin === true;
    if (!isAdmin) {
      return { isValid: false, error: 'Admin access required' };
    }

    const user: AuthUser = {
      uid: decoded.uid,
      email: decoded.email || '',
      name: (decoded.name as string) || '',
      isAdmin: true,
    };

    return { isValid: true, user };
  } catch (error) {
    console.error('Error validating admin auth:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

/**
 * Middleware-style helper for API routes.
 */
export function requireAdmin() {
  return async (req: Request): Promise<{ isAuthorized: boolean; user?: AuthUser; error?: string }> => {
    const result = await validateAdminAuth(req);
    return {
      isAuthorized: result.isValid,
      user: result.user,
      error: result.error,
    };
  };
}
