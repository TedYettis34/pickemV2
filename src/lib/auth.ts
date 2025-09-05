import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
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

  // Force clear all tokens issued before token revocation fix (2025-09-05)
  forceTokenClearForRevocationFix();

  // Automatic cleanup of stale tokens from old client ID
  detectAndClearStaleTokens();
}

export async function signUp(email: string, password: string, name: string) {
  const command = new SignUpCommand({
    ClientId: CLIENT_ID,
    Username: name, // Use name as username since email is an alias
    Password: password,
    UserAttributes: [
      {
        Name: 'email',
        Value: email,
      },
    ],
  });

  try {
    const response = await client.send(command);
    return response;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
}

export async function confirmSignUp(username: string, confirmationCode: string) {
  const command = new ConfirmSignUpCommand({
    ClientId: CLIENT_ID,
    Username: username,
    ConfirmationCode: confirmationCode,
  });

  try {
    const response = await client.send(command);
    return response;
  } catch (error) {
    console.error('Error confirming sign up:', error);
    throw error;
  }
}

export async function signIn(email: string, password: string) {
  const command = new InitiateAuthCommand({
    ClientId: CLIENT_ID,
    AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  try {
    const response = await client.send(command);

    if (response.AuthenticationResult?.AccessToken) {
      // Store tokens in localStorage with debugging
      localStorage.setItem('accessToken', response.AuthenticationResult.AccessToken);
      localStorage.setItem('idToken', response.AuthenticationResult.IdToken || '');

      const refreshToken = response.AuthenticationResult.RefreshToken || '';
      localStorage.setItem('refreshToken', refreshToken);

      // Store login timestamp for token age tracking
      localStorage.setItem('lastLoginTime', new Date().toISOString());

      console.log('Sign-in tokens stored:', {
        hasAccessToken: !!response.AuthenticationResult.AccessToken,
        hasIdToken: !!response.AuthenticationResult.IdToken,
        hasRefreshToken: !!refreshToken,
        refreshTokenLength: refreshToken.length,
        loginTime: new Date().toISOString()
      });
    }

    return response;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}

export async function resendConfirmationCode(username: string) {
  const command = new ResendConfirmationCodeCommand({
    ClientId: CLIENT_ID,
    Username: username,
  });

  try {
    const response = await client.send(command);
    return response;
  } catch (error) {
    console.error('Error resending confirmation code:', error);
    throw error;
  }
}

export function signOut() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('idToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('lastLoginTime');
}

// Global variable to track refresh promise and prevent race conditions
let refreshPromise: Promise<boolean> | null = null;

export async function refreshTokens(): Promise<boolean> {
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

  // Check if we have token timestamps to detect very old tokens
  const lastLoginTime = localStorage.getItem('lastLoginTime');
  if (lastLoginTime) {
    const lastLogin = new Date(lastLoginTime);
    const hoursSinceLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60);

    console.log('Token age analysis:', {
      lastLogin: lastLogin.toISOString(),
      hoursSinceLogin: Math.round(hoursSinceLogin * 100) / 100,
      daysSinceLogin: Math.round(hoursSinceLogin / 24 * 100) / 100
    });

    // If tokens are older than 25 days, they're likely expired (Cognito default is 30 days)
    if (hoursSinceLogin > (25 * 24)) {
      console.warn('Refresh token likely expired due to age, clearing tokens');
      signOut();
      return false;
    }
  }

  console.log('Starting new token refresh:', {
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

      console.log('Refresh response received:', {
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

        console.log('Token refresh successful:', {
          timestamp: new Date().toISOString(),
          requestId: response.$metadata?.requestId
        });
        return true;
      } else {
        console.warn('No access token in refresh response');
        return false;
      }
    } catch (error) {
      console.error('Error refreshing tokens:', error);

      // Enhanced logging for debugging AWS Cognito errors
      if (error && typeof error === 'object') {
        const awsError = error as Record<string, unknown> & {
          name?: string;
          message?: string;
          stack?: string;
          $metadata?: Record<string, unknown>;
          $service?: Record<string, unknown>;
          Code?: string;
        };

        console.error('Detailed error information:', {
          name: awsError.name,
          message: awsError.message,
          code: awsError.Code || awsError.$metadata?.httpStatusCode,
          requestId: awsError.$metadata?.requestId,
          httpStatusCode: awsError.$metadata?.httpStatusCode,
          attempts: awsError.$metadata?.attempts,
          totalRetryDelay: awsError.$metadata?.totalRetryDelay,
          cfId: awsError.$metadata?.cfId,
          extendedRequestId: awsError.$metadata?.extendedRequestId,
          timestamp: new Date().toISOString(),
          refreshTokenLength: localStorage.getItem('refreshToken')?.length || 'not found',
          refreshTokenStart: localStorage.getItem('refreshToken')?.substring(0, 20) || 'not found',
          userAgent: navigator?.userAgent?.substring(0, 100) || 'unknown'
        });

        // Log stack trace if available
        if (awsError.stack) {
          console.error('Error stack trace:', awsError.stack);
        }

        // Log specific AWS service errors
        if (awsError.$service) {
          console.error('AWS Service info:', awsError.$service);
        }

        // Check for common error types
        if (awsError.name === 'NotAuthorizedException') {
          console.error('NotAuthorized details - likely causes:', {
            possibleCauses: [
              'Refresh token expired (30 days max)',
              'Token revoked by AWS (EnableTokenRevocation: true)',
              'Multiple device login detected',
              'Password changed elsewhere',
              'Suspicious activity detected'
            ],
            tokenRevocationEnabled: true,
            userPoolConfig: {
              refreshTokenValidity: '30 days',
              accessTokenValidity: '60 minutes',
              enableTokenRevocation: true
            },
            troubleshooting: 'User needs to sign in again - tokens cannot be recovered when revoked'
          });
        }
      }

      // Track refresh failures for stale token detection
      localStorage.setItem('lastRefreshFailure', new Date().toISOString());

      // If refresh fails, clear tokens to force re-authentication
      signOut();
      return false;
    } finally {
      // Clear the refresh promise when done (success or failure)
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('accessToken');
}

/**
 * Force clear all tokens issued before the revocation fix was applied
 * This ensures all users get fresh tokens from the corrected configuration
 */
function forceTokenClearForRevocationFix(): void {
  if (typeof window === 'undefined') return;

  const TOKEN_CLEAR_DATE = '2025-09-05'; // Date when revocation fix was applied
  const clearMarker = localStorage.getItem('tokensClearedForRevocationFix');
  
  if (!clearMarker || clearMarker !== TOKEN_CLEAR_DATE) {
    const refreshToken = localStorage.getItem('refreshToken');
    const accessToken = localStorage.getItem('accessToken');
    
    if (refreshToken || accessToken) {
      console.log('🔧 Clearing all tokens due to revocation configuration fix');
      console.log('This is a one-time operation to ensure all users have fresh tokens');
      
      // Clear all auth-related data
      signOut();
      localStorage.removeItem('lastRefreshFailure');
      
      // Mark that we've done this cleanup
      localStorage.setItem('tokensClearedForRevocationFix', TOKEN_CLEAR_DATE);
      
      console.log('✅ Token cleanup complete. Please sign in again.');
      
      // Optional: Show user message or redirect
      if (typeof window !== 'undefined' && window.location && window.location.pathname !== '/') {
        console.log('📱 Redirecting to home page for fresh authentication...');
        window.location.href = '/';
      }
    } else {
      // No tokens to clear, just mark as done
      localStorage.setItem('tokensClearedForRevocationFix', TOKEN_CLEAR_DATE);
      console.log('ℹ️ No existing tokens to clear for revocation fix');
    }
  }
}

/**
 * Detect and automatically clear tokens that were issued by the old client ID
 * This prevents "Invalid Refresh Token" errors when the client ID changed
 */
function detectAndClearStaleTokens(): void {
  if (typeof window === 'undefined') return;

  const refreshToken = localStorage.getItem('refreshToken');
  const accessToken = localStorage.getItem('accessToken');

  if (!refreshToken && !accessToken) {
    // No tokens to check
    return;
  }

  // Check if we can decode the tokens to inspect their client ID
  // Cognito tokens are JWTs with client ID in the payload
  let shouldClearTokens = false;
  let detectionMethod = '';

  try {
    if (accessToken) {
      // Parse JWT payload (second part of JWT, base64 decoded)
      const tokenParts = accessToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        const tokenClientId = payload.client_id || payload.aud;

        console.log('🔍 Token analysis:', {
          tokenClientId: tokenClientId?.substring(0, 12) + '...',
          currentClientId: CLIENT_ID?.substring(0, 12) + '...',
          tokensMatch: tokenClientId === CLIENT_ID
        });

        if (tokenClientId && tokenClientId !== CLIENT_ID) {
          shouldClearTokens = true;
          detectionMethod = 'client_id_mismatch';
          console.warn('⚠️ Stale tokens detected: Client ID mismatch');
          console.warn('Token client ID:', tokenClientId);
          console.warn('Current client ID:', CLIENT_ID);
        }
      }
    }
  } catch (error) {
    console.warn('Could not parse access token for client ID check:', error);

    // Fallback: Check for suspicious token patterns or known old client ID patterns
    if (refreshToken && refreshToken.includes('77jac49eg6pt81jv9mjglmo9hj')) {
      shouldClearTokens = true;
      detectionMethod = 'old_client_pattern';
      console.warn('⚠️ Stale tokens detected: Old client ID pattern in refresh token');
    }
  }

  // Additional heuristic: Check for refresh token failures in recent history
  const lastRefreshFailure = localStorage.getItem('lastRefreshFailure');
  const lastLoginTime = localStorage.getItem('lastLoginTime');

  if (lastRefreshFailure && lastLoginTime) {
    const failureTime = new Date(lastRefreshFailure);
    const loginTime = new Date(lastLoginTime);
    const hoursSinceLogin = (Date.now() - loginTime.getTime()) / (1000 * 60 * 60);
    const hoursSinceFailure = (Date.now() - failureTime.getTime()) / (1000 * 60 * 60);

    // If tokens are relatively new (< 48 hours) but refresh is consistently failing
    if (hoursSinceLogin < 48 && hoursSinceFailure < 1) {
      shouldClearTokens = true;
      detectionMethod = 'recent_refresh_failures';
      console.warn('⚠️ Stale tokens detected: Recent refresh failures with relatively new tokens');
    }
  }

  if (shouldClearTokens) {
    console.log('🧨 Automatically clearing stale tokens to prevent refresh errors');
    console.log('Detection method:', detectionMethod);

    // Clear all auth-related localStorage
    signOut();

    // Clear additional tracking items
    localStorage.removeItem('lastRefreshFailure');

    console.log('✅ Stale tokens cleared. User will need to log in again.');

    // Optional: Show a user-friendly message
    if (typeof window !== 'undefined' && window.location) {
      console.log('📱 Redirecting to login due to authentication update...');
      // Force page reload to reset auth state
      window.location.reload();
    }
  } else {
    console.log('✅ Token validation passed - no stale tokens detected');
  }
}
