import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GetTokensFromRefreshTokenCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
});

const CLIENT_ID = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID;

if (!CLIENT_ID && process.env.NODE_ENV !== 'test') {
  throw new Error('NEXT_PUBLIC_USER_POOL_CLIENT_ID environment variable is required');
}

// Debug logging to verify correct client ID in production
if (typeof window !== 'undefined' && CLIENT_ID) {
  console.log('🔑 Auth initialized with client ID:', CLIENT_ID.substring(0, 12) + '...');
  if (CLIENT_ID === '77jac49eg6mm1a38tc8v233stv') {
    console.log('✅ Using CORRECT client ID');
  } else if (CLIENT_ID === '77jac49eg6pt81jv9mjglmo9hj') {
    console.log('❌ Using OLD/INCORRECT client ID - this will cause refresh token errors!');
  } else {
    console.log('⚠️ Using unknown client ID');
  }
  // Important: Do not clear tokens automatically on load. We keep existing tokens
  // and only refresh when needed. Any token reset should be an explicit user action.
}

// OAuth URL builders for redirecting to Cognito hosted UI
export function buildOAuthSignInUrl(email?: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID!,
    scope: 'email openid profile',
    redirect_uri: `${window.location.origin}/auth/callback`,
  });
  
  if (email) {
    params.append('login_hint', email);
  }
  
  return `https://pickem-dev-auth.auth.us-east-1.amazoncognito.com/oauth2/authorize?${params.toString()}`;
}

export function buildOAuthSignUpUrl(email?: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID!,
    scope: 'email openid profile',
    redirect_uri: `${window.location.origin}/auth/callback`,
    signup: 'true', // This parameter tells Cognito to show sign-up form
  });
  
  if (email) {
    params.append('login_hint', email);
  }
  
  return `https://pickem-dev-auth.auth.us-east-1.amazoncognito.com/oauth2/authorize?${params.toString()}`;
}

// Store refresh promise to prevent concurrent refresh calls
let refreshPromise: Promise<boolean> | null = null;

// OAuth-only refresh function (simplified)
export async function refreshTokens(): Promise<boolean> {
  console.log('Using OAuth-only refresh method');
  return refreshOAuthTokens();
}

// Legacy SDK refresh methods kept for testing purposes only
// (not used in the main app anymore)

// Original SDK refresh method (renamed)
export async function refreshTokensSDK(): Promise<boolean> {
  // If a refresh is already in progress, return that promise
  if (refreshPromise) {
    console.log('SDK refresh already in progress, waiting for existing promise');
    return refreshPromise;
  }

  const refreshToken = localStorage.getItem('refreshToken');

  if (!refreshToken) {
    console.warn('No refresh token available for SDK refresh');
    return false;
  }

  console.log('Starting SDK token refresh:', {
    refreshTokenLength: refreshToken.length,
    refreshTokenStart: refreshToken.substring(0, 20),
    timestamp: new Date().toISOString(),
    clientId: CLIENT_ID?.substring(0, 12) + '...',
    userAgent: navigator?.userAgent?.substring(0, 50) || 'unknown'
  });

  const command = new InitiateAuthCommand({
    ClientId: CLIENT_ID,
    AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });

  // Create and store the refresh promise
  refreshPromise = (async () => {
    try {
      console.log('Sending InitiateAuth request to Cognito...', {
        authFlow: 'REFRESH_TOKEN_AUTH',
        timestamp: new Date().toISOString(),
        region: process.env.NEXT_PUBLIC_AWS_REGION
      });

      const response = await client.send(command);

      console.log('SDK refresh response received:', {
        hasAccessToken: !!response.AuthenticationResult?.AccessToken,
        hasIdToken: !!response.AuthenticationResult?.IdToken,
        hasNewRefreshToken: !!response.AuthenticationResult?.RefreshToken,
        timestamp: new Date().toISOString(),
        requestId: response.$metadata?.requestId,
        httpStatusCode: response.$metadata?.httpStatusCode,
        attempts: response.$metadata?.attempts,
        cfId: response.$metadata?.cfId
      });

      if (response.AuthenticationResult?.AccessToken) {
        // Update tokens in localStorage
        localStorage.setItem('accessToken', response.AuthenticationResult.AccessToken);
        localStorage.setItem('idToken', response.AuthenticationResult.IdToken || '');

        // Handle refresh token rotation
        if (response.AuthenticationResult.RefreshToken) {
          const oldTokenStart = refreshToken.substring(0, 20);
          const newTokenStart = response.AuthenticationResult.RefreshToken.substring(0, 20);
          console.log('Updating refresh token (rotation detected):', {
            oldTokenStart,
            newTokenStart,
            tokenChanged: oldTokenStart !== newTokenStart,
            newTokenLength: response.AuthenticationResult.RefreshToken.length
          });
          localStorage.setItem('refreshToken', response.AuthenticationResult.RefreshToken);
        } else {
          console.log('No new refresh token returned, keeping existing one');
        }

        console.log('SDK token refresh successful:', {
          timestamp: new Date().toISOString(),
          requestId: response.$metadata?.requestId
        });
        return true;
      } else {
        console.warn('No access token in SDK refresh response');
        return false;
      }
    } catch (error) {
      console.error('Error refreshing SDK tokens:', error);

      // Log basic AWS error info for debugging without mutating auth state
      if (error && typeof error === 'object') {
        const awsError = error as Record<string, unknown> & { name?: string; message?: string };
        console.warn('SDK refresh failed:', { name: awsError.name, message: awsError.message });
      }

      // Do not clear tokens here. Caller can decide to prompt re-login.
      return false;
    } finally {
      // Clear the refresh promise when done (success or failure)
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Alternative refresh method using GetTokensFromRefreshToken API
export async function refreshTokensAlternative(): Promise<boolean> {
  // If a refresh is already in progress, return that promise
  if (refreshPromise) {
    console.log('Refresh already in progress, waiting for existing promise');
    return refreshPromise;
  }

  const refreshToken = localStorage.getItem('refreshToken');

  if (!refreshToken) {
    console.warn('No refresh token available');
    return false;
  }

  console.log('Starting alternative token refresh with GetTokensFromRefreshToken:', {
    refreshTokenLength: refreshToken.length,
    refreshTokenStart: refreshToken.substring(0, 20),
    timestamp: new Date().toISOString(),
    clientId: CLIENT_ID?.substring(0, 12) + '...',
  });

  const command = new GetTokensFromRefreshTokenCommand({
    ClientId: CLIENT_ID,
    RefreshToken: refreshToken,
  });

  // Create and store the refresh promise
  refreshPromise = (async () => {
    try {
      console.log('Sending GetTokensFromRefreshToken request to Cognito...', {
        timestamp: new Date().toISOString(),
        region: process.env.NEXT_PUBLIC_AWS_REGION
      });

      const response = await client.send(command);

      console.log('Alternative refresh response received:', {
        hasAccessToken: !!response.AccessToken,
        hasIdToken: !!response.IdToken,
        hasNewRefreshToken: !!response.RefreshToken,
        timestamp: new Date().toISOString(),
        requestId: response.$metadata?.requestId,
        httpStatusCode: response.$metadata?.httpStatusCode,
      });

      if (response.AccessToken) {
        // Update tokens in localStorage
        localStorage.setItem('accessToken', response.AccessToken);
        localStorage.setItem('idToken', response.IdToken || '');

        // Handle refresh token rotation
        if (response.RefreshToken) {
          const oldTokenStart = refreshToken.substring(0, 20);
          const newTokenStart = response.RefreshToken.substring(0, 20);
          console.log('Updating refresh token (rotation detected):', {
            oldTokenStart,
            newTokenStart,
            tokenChanged: oldTokenStart !== newTokenStart,
            newTokenLength: response.RefreshToken.length
          });
          localStorage.setItem('refreshToken', response.RefreshToken);
        } else {
          console.log('No new refresh token returned, keeping existing one');
        }

        console.log('Alternative token refresh successful:', {
          timestamp: new Date().toISOString(),
          requestId: response.$metadata?.requestId
        });
        return true;
      } else {
        console.warn('No access token in alternative refresh response');
        return false;
      }
    } catch (error) {
      console.error('Error with alternative refresh tokens:', error);

      // Log basic AWS error info for debugging
      if (error && typeof error === 'object') {
        const awsError = error as Record<string, unknown> & { name?: string; message?: string };
        console.warn('Alternative refresh failed:', { name: awsError.name, message: awsError.message });
      }

      return false;
    } finally {
      // Clear the refresh promise when done
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// OAuth refresh for tokens obtained via Cognito Hosted UI
export async function refreshOAuthTokens(): Promise<boolean> {
  // If a refresh is already in progress, return that promise
  if (refreshPromise) {
    console.log('Refresh already in progress, waiting for existing promise');
    return refreshPromise;
  }

  const refreshToken = localStorage.getItem('refreshToken');

  if (!refreshToken) {
    console.warn('No refresh token available for OAuth refresh');
    return false;
  }

  console.log('Starting OAuth token refresh:', {
    refreshTokenLength: refreshToken.length,
    refreshTokenStart: refreshToken.substring(0, 20),
    timestamp: new Date().toISOString(),
    clientId: CLIENT_ID?.substring(0, 12) + '...',
  });

  // Create and store the refresh promise
  refreshPromise = (async () => {
    try {
      console.log('Sending OAuth token refresh request...');

      const tokenResponse = await fetch('https://pickem-dev-auth.auth.us-east-1.amazoncognito.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: CLIENT_ID!,
          refresh_token: refreshToken,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('OAuth refresh failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorText
        });
        return false;
      }

      const tokens = await tokenResponse.json();
      
      console.log('OAuth refresh response received:', {
        hasAccessToken: !!tokens.access_token,
        hasIdToken: !!tokens.id_token,
        hasRefreshToken: !!tokens.refresh_token,
        tokenType: tokens.token_type,
        expiresIn: tokens.expires_in,
        timestamp: new Date().toISOString()
      });

      if (tokens.access_token) {
        // Update tokens in localStorage
        localStorage.setItem('accessToken', tokens.access_token);
        if (tokens.id_token) {
          localStorage.setItem('idToken', tokens.id_token);
        }
        
        // Handle refresh token rotation (if new one provided)
        if (tokens.refresh_token) {
          console.log('Updating refresh token from OAuth response');
          localStorage.setItem('refreshToken', tokens.refresh_token);
        }

        console.log('OAuth token refresh successful');
        return true;
      } else {
        console.warn('No access token in OAuth refresh response');
        return false;
      }
    } catch (error) {
      console.error('Error during OAuth token refresh:', error);
      return false;
    } finally {
      // Clear the refresh promise when done
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('accessToken');
}

// Logout function that clears tokens and redirects to Cognito logout
export function logout(): void {
  // Clear tokens from localStorage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('idToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('lastLoginTime');
  localStorage.removeItem('loginMethod');
  
  // Redirect to Cognito hosted UI logout endpoint
  const logoutUrl = `https://pickem-dev-auth.auth.us-east-1.amazoncognito.com/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(window.location.origin)}`;
  window.location.href = logoutUrl;
}
