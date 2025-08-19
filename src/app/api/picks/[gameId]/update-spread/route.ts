import { NextRequest, NextResponse } from 'next/server';
import { updatePickToCurrentSpread } from '../../../../../lib/picks';
import { ApiResponse } from '../../../../../types/pick';

/**
 * Update a pick to use the current spread
 * POST /api/picks/[gameId]/update-spread
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const gameIdNum = parseInt(gameId);
    
    if (isNaN(gameIdNum) || gameIdNum <= 0) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid game ID',
      };
      return NextResponse.json(response, { status: 400 });
    }

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

    // Update the pick to current spread
    const updatedPick = await updatePickToCurrentSpread(userId, gameIdNum);

    if (!updatedPick) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Failed to update pick',
      };
      return NextResponse.json(response, { status: 500 });
    }

    const response: ApiResponse<typeof updatedPick> = {
      success: true,
      data: updatedPick,
      message: 'Pick updated to current spread'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error updating pick to current spread:', error);
    
    // Handle specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Failed to update pick';
    let statusCode = 500;
    
    if (errorMessage.includes('not found')) {
      statusCode = 404;
    } else if (errorMessage.includes('Cannot update') || errorMessage.includes('have started') || errorMessage.includes('submitted')) {
      statusCode = 400;
    }

    const response: ApiResponse<never> = {
      success: false,
      error: errorMessage,
    };
    return NextResponse.json(response, { status: statusCode });
  }
}