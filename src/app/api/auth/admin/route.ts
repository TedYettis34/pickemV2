import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, GetUserCommand, AdminListGroupsForUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header must start with Bearer' }, { status: 401 });
    }

    if (!USER_POOL_ID) {
      return NextResponse.json({ error: 'USER_POOL_ID not configured' }, { status: 500 });
    }

    const accessToken = authHeader.substring(7).trim();

    // Validate access token format
    if (!accessToken || !/^[A-Za-z0-9\-_.=]+$/.test(accessToken)) {
      // Don't log the actual token for security
      return NextResponse.json({ error: 'Invalid access token format' }, { status: 401 });
    }

    // Get user info from access token
    const getUserCommand = new GetUserCommand({
      AccessToken: accessToken,
    });

    const userResult = await client.send(getUserCommand);
    
    if (!userResult || !userResult.Username) {
      return NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
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
    
    // Debug logging - remove after testing
    console.log('User groups for', email, ':', groups);
    
    // Check if user is in admin group (case-insensitive)
    const isAdmin = groups.some(group => group.toLowerCase() === 'admin');

    const user = {
      username: userResult.Username,
      email,
      name,
      groups,
    };

    return NextResponse.json({
      isAdmin,
      user,
    });

  } catch (error) {
    console.error('Error validating admin auth:', error);
    
    // Handle common Cognito errors with appropriate status codes
    if (error instanceof Error) {
      if (error.name === 'NotAuthorizedException' || 
          error.name === 'TokenExpiredException') {
        return NextResponse.json({ error: 'Token expired' }, { status: 401 });
      }
      if (error.name === 'UserNotFoundException') {
        return NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
      }
    }
    
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}