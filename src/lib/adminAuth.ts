
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


// Server-side validation for NextRequest using JWT parsing
export async function validateAdminAuth(request: Request | { headers: { get(name: string): string | null } }): Promise<{ isValid: boolean; user?: CognitoUser; error?: string }> {
  try {
    console.log('🔍 Server-side admin validation started (JWT parsing)');
    const authHeader = request.headers.get('authorization');
    console.log('🔍 Auth header present:', !!authHeader);
    console.log('🔍 Auth header starts with Bearer:', authHeader?.startsWith('Bearer '));
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid auth header');
      return {
        isValid: false,
        error: 'Authorization header required',
      };
    }

    const accessToken = authHeader.substring(7).trim(); // Remove 'Bearer ' prefix
    console.log('🔍 Token length:', accessToken.length);
    console.log('🔍 Token starts with:', accessToken.substring(0, 20));
    
    // Validate access token format - JWT tokens are base64url encoded with dots
    console.log('🔍 Validating token format...');
    if (!accessToken) {
      console.log('❌ Token is empty');
      return {
        isValid: false,
        error: 'Invalid access token format',
      };
    }
    
    // JWT tokens should have the format: header.payload.signature
    // Each part is base64url encoded (A-Z, a-z, 0-9, -, _, =)
    if (!/^[A-Za-z0-9\-_.=]+$/.test(accessToken)) {
      console.log('❌ Token format validation failed');
      console.log('❌ Token does not match JWT pattern');
      console.log('❌ Token length:', accessToken.length);
      console.log('❌ Token sample:', accessToken.substring(0, 50) + '...');
      return {
        isValid: false,
        error: 'Invalid access token format',
      };
    }
    
    console.log('✅ Token format validation passed');

    // Parse JWT token directly (same approach as /api/auth/admin)
    let payload;
    try {
      console.log('🔍 Starting JWT parsing...');
      // JWT tokens have 3 parts separated by '.'
      const parts = accessToken.split('.');
      console.log('🔍 Token parts count:', parts.length);
      
      if (parts.length !== 3) {
        console.log('❌ Invalid token format - wrong number of parts');
        return {
          isValid: false,
          error: 'Invalid token format',
        };
      }
      
      console.log('🔍 Decoding JWT payload...');
      // Decode the payload (middle part)
      const base64Payload = parts[1];
      console.log('🔍 Base64 payload length:', base64Payload.length);
      
      const jsonPayload = Buffer.from(base64Payload, 'base64').toString();
      console.log('🔍 JSON payload length:', jsonPayload.length);
      console.log('🔍 JSON payload preview:', jsonPayload.substring(0, 100) + '...');
      
      payload = JSON.parse(jsonPayload);
      console.log('🔍 JWT parsing successful');
      
      console.log('🔍 Decoded token payload:');
      console.log('  Subject (sub):', payload.sub);
      console.log('  Username:', payload.username || payload['cognito:username']);
      console.log('  Email:', payload.email);
      console.log('  Groups:', payload['cognito:groups'] || []);
      console.log('  Token use:', payload.token_use);
      console.log('  Client ID:', payload.client_id || payload.aud);
      
    } catch (error) {
      console.error('❌ Error decoding token:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
      return {
        isValid: false,
        error: 'Invalid token format',
      };
    }

    // Validate token
    if (!payload.sub) {
      return {
        isValid: false,
        error: 'Invalid user token',
      };
    }

    // Extract user info from token
    const username = payload.username || payload['cognito:username'] || payload.sub;
    const email = payload.email || '';
    const name = payload.name || payload.given_name || '';
    const groups = payload['cognito:groups'] || [];
    
    console.log('🔍 Extracting user info from JWT:');
    console.log('  Username from payload.username:', payload.username);
    console.log('  Username from payload["cognito:username"]:', payload['cognito:username']);
    console.log('  Username from payload.sub:', payload.sub);
    console.log('  Final username:', username);
    console.log('  Email:', email);
    console.log('  Name:', name);
    console.log('  Raw groups from payload["cognito:groups"]:', payload['cognito:groups']);
    console.log('  Groups type:', typeof groups);
    console.log('  Groups is array:', Array.isArray(groups));
    console.log('  Groups length:', groups?.length || 0);
    console.log('  Groups content:', groups);
    
    // Check if user is in admin group (case-insensitive)
    console.log('🔍 Starting admin group check...');
    if (!Array.isArray(groups)) {
      console.log('❌ Groups is not an array, converting:', groups);
      const groupsArray = groups ? [groups] : [];
      console.log('❌ Converted to array:', groupsArray);
    }
    
    const isAdmin = Array.isArray(groups) && groups.some((group: string) => {
      console.log('  Checking group:', group, 'type:', typeof group);
      const lowercaseGroup = String(group).toLowerCase();
      console.log('  Lowercase group:', lowercaseGroup);
      const isMatch = lowercaseGroup === 'admin';
      console.log('  Matches "admin":', isMatch);
      return isMatch;
    });
    
    console.log('🔍 JWT Admin Check Results:');
    console.log('  Username:', username);
    console.log('  Groups:', groups);
    console.log('  Is Admin:', isAdmin);

    if (!isAdmin) {
      return {
        isValid: false,
        error: 'Admin access required',
      };
    }

    const user: CognitoUser = {
      username,
      email,
      name,
      groups,
    };

    console.log('✅ JWT validation completed successfully');
    return {
      isValid: true,
      user,
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