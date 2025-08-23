import { NextRequest, NextResponse } from 'next/server';
import { getUserByCognitoId, syncUserFromCognito } from '../../../../lib/users';

/**
 * Debug endpoint to check authentication and user sync
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const userId = request.headers.get('x-user-id');
    
    if (!authHeader || !userId) {
      return NextResponse.json({
        error: 'Missing auth headers',
        hasAuth: !!authHeader,
        hasUserId: !!userId
      }, { status: 400 });
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    // Check if user exists in database
    let existingUser;
    try {
      existingUser = await getUserByCognitoId(userId);
    } catch (dbError) {
      console.error('Database lookup failed:', dbError);
    }
    
    // Try to get user info from Cognito
    let cognitoSync;
    try {
      cognitoSync = await syncUserFromCognito(accessToken);
    } catch (cognitoError) {
      console.error('Cognito sync failed:', cognitoError);
      cognitoSync = { error: cognitoError instanceof Error ? cognitoError.message : 'Unknown error' };
    }
    
    return NextResponse.json({
      debug: {
        userId,
        tokenLength: accessToken.length,
        existingUser: existingUser ? {
          id: existingUser.id,
          email: existingUser.email,
          cognitoUserId: existingUser.cognito_user_id
        } : null,
        cognitoSync: cognitoSync && 'error' in cognitoSync ? { error: cognitoSync.error } : cognitoSync ? {
          id: cognitoSync.id,
          email: cognitoSync.email,
          cognitoUserId: cognitoSync.cognito_user_id
        } : null
      }
    });
    
  } catch (error) {
    console.error('Debug auth error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}