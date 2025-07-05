
export interface CognitoUser {
  username: string;
  email: string;
  name: string;
  groups: string[];
}

export interface AdminAuthResult {
  isAdmin: boolean;
  user: CognitoUser | null;
  error?: string;
}

// Check if user is authenticated and is an admin
export async function validateAdminAuth(accessToken: string): Promise<AdminAuthResult> {
  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/auth/admin`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
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

// Middleware helper for API routes
export function requireAdmin() {
  return async (req: Request): Promise<{ isAuthorized: boolean; user?: CognitoUser; error?: string }> => {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        isAuthorized: false,
        error: 'Authorization header required',
      };
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    const authResult = await validateAdminAuth(accessToken);

    if (!authResult.isAdmin) {
      return {
        isAuthorized: false,
        error: authResult.error || 'Admin access required',
      };
    }

    return {
      isAuthorized: true,
      user: authResult.user || undefined,
    };
  };
}

// Client-side helper to check if current user is admin
export async function isCurrentUserAdmin(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false; // Server-side, can't check localStorage
  }

  try {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      return false;
    }

    const authResult = await validateAdminAuth(accessToken);
    return authResult.isAdmin;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// Get current user's access token from localStorage
export function getCurrentAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null; // Server-side
  }

  return localStorage.getItem('accessToken');
}