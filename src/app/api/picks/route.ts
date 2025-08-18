import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdatePick, validatePick } from '../../../lib/picks';
import { CreatePickInput, ApiResponse } from '../../../types/pick';

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

    const body = await request.json();
    const { game_id, pick_type, spread_value }: CreatePickInput = body;

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

    // Validate the pick
    const validation = await validatePick(userId, game_id);
    if (!validation.isValid) {
      const response: ApiResponse<never> = {
        success: false,
        error: validation.error || 'Invalid pick',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create or update the pick
    const pick = await createOrUpdatePick(userId, game_id, {
      game_id,
      pick_type,
      spread_value,
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