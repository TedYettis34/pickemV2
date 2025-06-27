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

//const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID || 'us-east-1_pGEqzqfTn';
const CLIENT_ID = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID;

if (!CLIENT_ID) {
  throw new Error('NEXT_PUBLIC_USER_POOL_CLIENT_ID environment variable is required');
}

export async function signUp(email: string, password: string, name: string) {
  const command = new SignUpCommand({
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [
      {
        Name: 'email',
        Value: email,
      },
      {
        Name: 'name',
        Value: name,
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

export async function confirmSignUp(email: string, confirmationCode: string) {
  const command = new ConfirmSignUpCommand({
    ClientId: CLIENT_ID,
    Username: email,
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
      // Store tokens in localStorage
      localStorage.setItem('accessToken', response.AuthenticationResult.AccessToken);
      localStorage.setItem('idToken', response.AuthenticationResult.IdToken || '');
      localStorage.setItem('refreshToken', response.AuthenticationResult.RefreshToken || '');
    }

    return response;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}

export async function resendConfirmationCode(email: string) {
  const command = new ResendConfirmationCodeCommand({
    ClientId: CLIENT_ID,
    Username: email,
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

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('accessToken');
}