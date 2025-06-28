import { CognitoIdentityProviderClient, GetUserCommand, AdminListGroupsForUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
});

const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID;

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
    if (!USER_POOL_ID) {
      throw new Error('USER_POOL_ID environment variable is required');
    }

    // First, get user info from the access token
    const getUserCommand = new GetUserCommand({
      AccessToken: accessToken,
    });

    const userResult = await client.send(getUserCommand);
    
    if (!userResult.Username) {
      return {
        isAdmin: false,
        user: null,
        error: 'Invalid user token',
      };
    }

    // Extract user attributes
    const attributes = userResult.UserAttributes || [];
    const email = attributes.find(attr => attr.Name === 'email')?.Value || '';
    const name = attributes.find(attr => attr.Name === 'name')?.Value || '';

    // Get user's groups
    const getGroupsCommand = new AdminListGroupsForUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: userResult.Username,
    });

    const groupsResult = await client.send(getGroupsCommand);
    const groups = groupsResult.Groups?.map(group => group.GroupName || '') || [];
    
    // Check if user is in admin group
    const isAdmin = groups.includes('admin');

    const user: CognitoUser = {
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