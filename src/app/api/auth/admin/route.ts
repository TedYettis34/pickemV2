import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔥 ADMIN ROUTE HIT - THIS SHOULD ALWAYS SHOW');
  console.log('🔥 Time:', new Date().toISOString());
  console.log('🔥 URL:', request.url);
  console.log('🔥 Method:', request.method);
  console.log('🚀 ===== ADMIN API ROUTE HIT =====');
  console.log('🔍 Admin API called - starting validation');
  try {
    const authHeader = request.headers.get('authorization');
    console.log('  Auth header present:', !!authHeader);
    console.log('  Auth header starts with Bearer:', authHeader?.startsWith('Bearer '));
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header must start with Bearer' }, { status: 401 });
    }

    const accessToken = authHeader.substring(7).trim();

    // Validate access token format
    if (!accessToken || !/^[A-Za-z0-9\-_.=]+$/.test(accessToken)) {
      return NextResponse.json({ error: 'Invalid access token format' }, { status: 401 });
    }

    // For OAuth tokens, we need to decode the access token directly
    // since they don't have the scopes needed for GetUserCommand
    let payload;
    try {
      // JWT tokens have 3 parts separated by '.'
      const parts = accessToken.split('.');
      if (parts.length !== 3) {
        return NextResponse.json({ error: 'Invalid token format' }, { status: 401 });
      }
      
      // Decode the payload (middle part)
      const base64Payload = parts[1];
      const jsonPayload = Buffer.from(base64Payload, 'base64').toString();
      payload = JSON.parse(jsonPayload);
      
      console.log('🔍 Decoded token payload:');
      console.log('  Subject (sub):', payload.sub);
      console.log('  Username:', payload.username || payload['cognito:username']);
      console.log('  Email:', payload.email);
      console.log('  Groups:', payload['cognito:groups'] || []);
      console.log('  Token use:', payload.token_use);
      console.log('  Client ID:', payload.client_id || payload.aud);
      
    } catch (error) {
      console.error('Error decoding token:', error);
      return NextResponse.json({ error: 'Invalid token format' }, { status: 401 });
    }

    // Validate token
    if (!payload.sub) {
      return NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
    }

    // Extract user info from token
    const username = payload.username || payload['cognito:username'] || payload.sub;
    const email = payload.email || '';
    const name = payload.name || payload.given_name || '';
    const groups = payload['cognito:groups'] || [];
    
    // Check if user is in admin group (case-insensitive)
    const isAdmin = groups.some((group: string) => group.toLowerCase() === 'admin');
    
    // Debug logging
    console.log('🔍 Admin Debug Info:');
    console.log('  Username:', username);
    console.log('  Email:', email);
    console.log('  Name:', name);
    console.log('  Groups:', groups);
    console.log('  Token length:', accessToken.length);
    console.log('  Token starts with:', accessToken.substring(0, 20));
    console.log('  Is Admin:', isAdmin);

    const user = {
      username,
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