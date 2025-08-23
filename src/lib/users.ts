import { query } from './database';
import { CognitoIdentityProviderClient, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: process.env.NODE_ENV === 'production' ? undefined : {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock',
  }
});

export interface User {
  id: number;
  cognito_user_id: string;
  email: string;
  name: string;
  timezone: string;
  is_admin: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get user by Cognito User ID
 */
export async function getUserByCognitoId(cognitoUserId: string): Promise<User | null> {
  try {
    const users = await query<User>(
      'SELECT * FROM users WHERE cognito_user_id = $1',
      [cognitoUserId]
    );
    return users[0] || null;
  } catch (error) {
    console.error('Error getting user by Cognito ID:', error);
    throw error;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const users = await query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return users[0] || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}

/**
 * Create or update user from Cognito data
 * This function syncs user data between Cognito and the local database
 */
export async function syncUserFromCognito(accessToken: string): Promise<User> {
  try {
    
    // Basic token validation
    if (!accessToken) {
      throw new Error('Access token is required');
    }
    
    // Only validate token in production
    if (process.env.NODE_ENV === 'production') {
      if (accessToken === 'mock-jwt-token') {
        throw new Error('Invalid access token: cannot use mock token in production');
      }
      
      if (accessToken.length < 100) {
        throw new Error('Access token appears to be too short - possible corruption');
      }
    }
    
    // Get user data from Cognito
    const getUserCommand = new GetUserCommand({
      AccessToken: accessToken,
    });
    
    const cognitoUser = await client.send(getUserCommand);
    
    if (!cognitoUser || !cognitoUser.Username) {
      throw new Error('No username found in Cognito response');
    }

    // Extract user attributes
    const email = cognitoUser.UserAttributes?.find(attr => attr.Name === 'email')?.Value;
    const name = cognitoUser.UserAttributes?.find(attr => attr.Name === 'name')?.Value;

    if (!email || !name) {
      const availableAttributes = cognitoUser.UserAttributes?.map(attr => attr.Name) || [];
      throw new Error(`Email and name are required from Cognito. Available attributes: ${availableAttributes.join(', ')}`);
    }

    // Check if user exists in database
    const existingUser = await getUserByCognitoId(cognitoUser.Username);

    if (existingUser) {
      // Update existing user
      const updatedUsers = await query<User>(
        `UPDATE users 
         SET email = $2, name = $3, last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE cognito_user_id = $1
         RETURNING *`,
        [cognitoUser.Username, email, name]
      );
      return updatedUsers[0];
    } else {
      // Create new user
      const newUsers = await query<User>(
        `INSERT INTO users (cognito_user_id, email, name, last_login_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         RETURNING *`,
        [cognitoUser.Username, email, name]
      );
      return newUsers[0];
    }
  } catch (error) {
    console.error('Error syncing user from Cognito:', error);
    
    // Provide more specific error messages
    if (error && typeof error === 'object' && 'name' in error) {
      const awsError = error as { name: string; message: string };
      if (awsError.name === 'NotAuthorizedException') {
        throw new Error('Access token is invalid or expired');
      } else if (awsError.name === 'UserNotFoundException') {
        throw new Error('User not found in Cognito');
      } else if (awsError.name === 'TooManyRequestsException') {
        throw new Error('Too many requests to Cognito API');
      } else if (awsError.name === 'InvalidParameterException') {
        throw new Error('Invalid access token format');
      }
    }
    
    throw error;
  }
}

/**
 * Get all users (for admin purposes)
 */
export async function getAllUsers(limit: number = 50): Promise<User[]> {
  try {
    const users = await query<User>(
      `SELECT id, cognito_user_id, email, name, timezone, is_admin, last_login_at, created_at
       FROM users 
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

/**
 * Update user admin status
 */
export async function updateUserAdminStatus(userId: number, isAdmin: boolean): Promise<User> {
  try {
    const updatedUsers = await query<User>(
      `UPDATE users 
       SET is_admin = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [userId, isAdmin]
    );
    
    if (updatedUsers.length === 0) {
      throw new Error('User not found');
    }
    
    return updatedUsers[0];
  } catch (error) {
    console.error('Error updating user admin status:', error);
    throw error;
  }
}