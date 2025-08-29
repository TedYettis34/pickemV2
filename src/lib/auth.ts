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
      
      console.log('Sign-in tokens stored:', {
        hasAccessToken: !!response.AuthenticationResult.AccessToken,
        hasIdToken: !!response.AuthenticationResult.IdToken,
        hasRefreshToken: !!refreshToken,
        refreshTokenLength: refreshToken.length
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

  console.log('Starting new token refresh:', {
    refreshTokenLength: refreshToken.length,
    refreshTokenStart: refreshToken.substring(0, 20),
    timestamp: new Date().toISOString(),
    clientId: CLIENT_ID?.substring(0, 10) + '...',
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
              'Refresh token expired (check Cognito settings)',
              'Refresh token rotation conflict',
              'User pool configuration issue',
              'Token has been revoked'
            ],
            troubleshooting: 'Check AWS Cognito User Pool > App integration > App client settings'
          });
        }
      }
      
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