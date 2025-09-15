
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

// Auth event system for token expiration notifications
type AuthEventType = 'token-expired' | 'auth-error' | 'logout';

interface AuthEvent {
  type: AuthEventType;
  message?: string;
}

type AuthEventListener = (event: AuthEvent) => void;

class AuthEventEmitter {
  private listeners: AuthEventListener[] = [];

  subscribe(listener: AuthEventListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  emit(event: AuthEvent) {
    this.listeners.forEach(listener => listener(event));
  }
}

export const authEventEmitter = new AuthEventEmitter();

// Cooldown mechanism to prevent infinite validation loops
// Note: These would be used for preventing validation spam in production

// Utility to handle token expiration - attempts refresh before logout
async function handleTokenExpiration(): Promise<AdminAuthResult> {
  if (typeof window !== 'undefined') {
    try {
      // Import the refresh function
      const { refreshTokens } = await import('./auth');
      
      // Attempt to refresh tokens
      const refreshSuccess = await refreshTokens();
      
      if (refreshSuccess) {
        // Get the new access token and retry
        const newAccessToken = localStorage.getItem('accessToken');
        if (newAccessToken) {
          // Return success - let the caller retry with new token
          return {
            isAdmin: false, // This will be determined by the retry
            user: null,
            error: 'TOKEN_REFRESHED', // Special flag for retry
          };
        }
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
    
    // If refresh failed, emit event but don't clear tokens automatically
    authEventEmitter.emit({ 
      type: 'token-expired', 
      message: 'Your session has expired. Please log in again.' 
    });
  }
  
  return {
    isAdmin: false,
    user: null,
    error: 'Session expired. Please log in again.',
  };
}

// Check if user is authenticated and is an admin (client-side)
export async function validateAdminAuthClient(accessToken: string, retryCount = 0): Promise<AdminAuthResult> {
  // Prevent infinite recursion with retry limit
  
  try {
    // Validate input
    if (!accessToken || typeof accessToken !== 'string') {
      return {
        isAdmin: false,
        user: null,
        error: 'Invalid access token',
      };
    }

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const url = `${baseUrl}/api/auth/admin`;
    
    console.log('🔍 Client: Making admin API request');
    console.log('  URL:', url);
    console.log('  Base URL:', baseUrl);
    console.log('  Token length:', accessToken.length);
    console.log('  Token starts with:', accessToken.substring(0, 20));
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
    
    console.log('🔍 Client: Request headers:', headers);
    console.log('🔍 Client: Authorization header:', headers.Authorization.substring(0, 30) + '...');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });
    
    console.log('🔍 Client: Response received');
    console.log('  Status:', response.status);
    console.log('  Status text:', response.statusText);
    console.log('  OK:', response.ok);

    if (!response.ok) {
      const errorData = await response.json();
      
      // Check if the error indicates token expiration and we haven't retried yet
      if (response.status === 401 && retryCount === 0 && 
          (errorData.error === 'Token expired' || 
           errorData.error?.includes('expired') ||
           errorData.error?.includes('Access Token has expired'))) {
        const refreshResult = await handleTokenExpiration();
        
        // If token was refreshed, retry the original request ONCE
        if (refreshResult.error === 'TOKEN_REFRESHED') {
          const newAccessToken = localStorage.getItem('accessToken');
          if (newAccessToken && newAccessToken !== accessToken) {
            return await validateAdminAuthClient(newAccessToken, retryCount + 1);
          }
        }
        
        return refreshResult;
      }
      
      // For 401 errors that aren't token expiration (or after retry), user likely isn't admin
      if (response.status === 401) {
        return {
          isAdmin: false,
          user: null,
          error: 'User does not have admin privileges',
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
    
    // If token is expired and we haven't retried yet, handle it properly
    if (retryCount === 0 && error instanceof Error && 
        (error.name === 'NotAuthorizedException' || 
         error.message.includes('expired') ||
         error.message.includes('Access Token has expired'))) {
      const refreshResult = await handleTokenExpiration();
      
      // If token was refreshed, retry the original request ONCE
      if (refreshResult.error === 'TOKEN_REFRESHED') {
        const newAccessToken = localStorage.getItem('accessToken');
        if (newAccessToken && newAccessToken !== accessToken) {
          return await validateAdminAuthClient(newAccessToken, retryCount + 1);
        }
      }
      
      return refreshResult;
    }
    
    // For other errors, emit auth error event
    authEventEmitter.emit({ 
      type: 'auth-error', 
      message: error instanceof Error ? error.message : 'Authentication failed' 
    });
    
    return {
      isAdmin: false,
      user: null,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

// Direct validation function for server-side use (avoids HTTP calls)
async function validateAdminAuthDirect(accessToken: string): Promise<AdminAuthResult> {
  try {
    const { CognitoIdentityProviderClient, GetUserCommand, AdminListGroupsForUserCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    
    const client = new CognitoIdentityProviderClient({
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID;
    
    if (!USER_POOL_ID) {
      return {
        isAdmin: false,
        user: null,
        error: 'USER_POOL_ID not configured',
      };
    }

    // Get user info from access token
    const getUserCommand = new GetUserCommand({
      AccessToken: accessToken,
    });

    const userResult = await client.send(getUserCommand);
    
    if (!userResult || !userResult.Username) {
      return {
        isAdmin: false,
        user: null,
        error: 'Invalid user token',
      };
    }

    // Get user's groups
    const getGroupsCommand = new AdminListGroupsForUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: userResult.Username,
    });

    const groupsResult = await client.send(getGroupsCommand);
    const groups = groupsResult.Groups?.map(group => group.GroupName || '') || [];
    
    // Extract user attributes
    const attributes = userResult.UserAttributes || [];
    const email = attributes.find(attr => attr.Name === 'email')?.Value || '';
    const name = attributes.find(attr => attr.Name === 'name')?.Value || '';
    
    // Check if user is in admin group (case-insensitive)
    const isAdmin = groups.some(group => group.toLowerCase() === 'admin');

    const user = {
      username: userResult.Username,
      email,
      name,
      groups,
    };

    return {
      isAdmin,
      user,
    };

  } catch (error) {
    // Handle token expiration for server-side validation too
    if (error instanceof Error && 
        (error.name === 'NotAuthorizedException' || 
         error.message.includes('expired') ||
         error.message.includes('Access Token has expired'))) {
      return {
        isAdmin: false,
        user: null,
        error: 'Session expired. Please log in again.',
      };
    }
    
    return {
      isAdmin: false,
      user: null,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

// Server-side validation for NextRequest
export async function validateAdminAuth(request: Request | { headers: { get(name: string): string | null } }): Promise<{ isValid: boolean; user?: CognitoUser; error?: string }> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        isValid: false,
        error: 'Authorization header required',
      };
    }

    const accessToken = authHeader.substring(7).trim(); // Remove 'Bearer ' prefix
    
    // Validate access token format
    if (!accessToken || !/^[A-Za-z0-9\-_.=]+$/.test(accessToken)) {
      return {
        isValid: false,
        error: 'Invalid access token format',
      };
    }

    const authResult = await validateAdminAuthDirect(accessToken);

    if (!authResult.isAdmin) {
      return {
        isValid: false,
        error: authResult.error || 'Admin access required',
      };
    }

    return {
      isValid: true,
      user: authResult.user || undefined,
    };
  } catch (error) {
    console.error('Error validating admin auth:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

// Middleware helper for API routes (legacy)
export function requireAdmin() {
  return async (req: Request): Promise<{ isAuthorized: boolean; user?: CognitoUser; error?: string }> => {
    const result = await validateAdminAuth(req);
    return {
      isAuthorized: result.isValid,
      user: result.user,
      error: result.error,
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

    const authResult = await validateAdminAuthClient(accessToken);
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