import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdatePick, validatePick } from '../../../lib/picks';
import { CreatePickInput, ApiResponse } from '../../../types/pick';
import { syncUserFromCognito, getUserByCognitoId } from '../../../lib/users';

/**
 * Create or update a pick
 */
export async function POST(request: NextRequest) {
  try {
    // Get user ID from authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Authorization header required',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // TODO: Validate the JWT token and extract user ID
    // For now, we'll extract from a custom header (this will be implemented in auth task)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'User ID required',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Ensure user exists in database (sync from Cognito if needed)
    let existingUser;
    try {
      console.log('Looking up user with Cognito ID:', userId);
      existingUser = await getUserByCognitoId(userId);
      console.log('Found existing user:', existingUser ? { id: existingUser.id, email: existingUser.email, cognitoUserId: existingUser.cognito_user_id } : null);
      
      if (!existingUser) {
        console.log('User not found, attempting to sync from Cognito...');
        // Try to sync user from Cognito using the access token
        const accessToken = authHeader.replace('Bearer ', '');
        existingUser = await syncUserFromCognito(accessToken);
        console.log('Synced user from Cognito:', existingUser ? { id: existingUser.id, email: existingUser.email, cognitoUserId: existingUser.cognito_user_id } : null);
      }
      
      if (!existingUser) {
        throw new Error('User not found and could not be synced from Cognito');
      }
    } catch (userError) {
      console.error('Error ensuring user exists:', userError);
      const response: ApiResponse<never> = {
        success: false,
        error: `User authentication failed: ${userError instanceof Error ? userError.message : 'Unknown error'}`,
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get the database user ID for all operations
    const databaseUserId = existingUser.id.toString();

    const body = await request.json();
    const { game_id, pick_type, spread_value, is_triple_play }: CreatePickInput = body;

    // Validate required fields
    if (!game_id || !pick_type) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Game ID and pick type are required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (!['home_spread', 'away_spread'].includes(pick_type)) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid pick type',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate the pick using database user ID
    const validation = await validatePick(databaseUserId, game_id, is_triple_play || false);
    if (!validation.isValid) {
      const response: ApiResponse<never> = {
        success: false,
        error: validation.error || 'Invalid pick',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create or update the pick using database user ID
    console.log(`Creating/updating pick for user ${userId} (database ID: ${databaseUserId}), game ${game_id}`);
    const pick = await createOrUpdatePick(databaseUserId, game_id, {
      game_id,
      pick_type,
      spread_value,
      is_triple_play,
    });

    const response: ApiResponse<typeof pick> = {
      success: true,
      data: pick,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error creating/updating pick:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to create pick',
    };
    return NextResponse.json(response, { status: 500 });
  }
}