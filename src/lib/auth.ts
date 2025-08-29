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

export async function refreshTokens(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    console.warn('No refresh token available');
    return false;
  }

  const command = new InitiateAuthCommand({
    ClientId: CLIENT_ID,
    AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });

  try {
    console.log('Attempting token refresh with InitiateAuth...');
    const response = await client.send(command);

    console.log('Refresh response received:', {
      hasAccessToken: !!response.AuthenticationResult?.AccessToken,
      hasIdToken: !!response.AuthenticationResult?.IdToken,
      hasNewRefreshToken: !!response.AuthenticationResult?.RefreshToken,
    });

    if (response.AuthenticationResult?.AccessToken) {
      // Update tokens in localStorage
      localStorage.setItem('accessToken', response.AuthenticationResult.AccessToken);
      localStorage.setItem('idToken', response.AuthenticationResult.IdToken || '');
      
      // Handle refresh token rotation
      if (response.AuthenticationResult.RefreshToken) {
        console.log('Updating refresh token (rotation detected)');
        localStorage.setItem('refreshToken', response.AuthenticationResult.RefreshToken);
      } else {
        console.log('No new refresh token returned, keeping existing one');
      }
      
      console.log('Token refresh successful');
      return true;
    } else {
      console.warn('No access token in refresh response');
      return false;
    }
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    
    // Log additional error details for debugging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
    }
    
    // If refresh fails, clear tokens to force re-authentication
    signOut();
    return false;
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('accessToken');
}