import { NextRequest, NextResponse } from 'next/server';
import { deletePick, validatePick } from '../../../../lib/picks';
import { ApiResponse } from '../../../../types/pick';

/**
 * Delete a pick for a specific game
 */
export async function DELETE(
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

    // Validate that the pick can be deleted
    const validation = await validatePick(userId, gameIdNum, false, 'delete');
    if (!validation.isValid) {
      const response: ApiResponse<never> = {
        success: false,
        error: validation.error || 'Cannot delete pick',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Delete the pick
    await deletePick(userId, gameIdNum);

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: 'Pick deleted successfully',
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error deleting pick:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to delete pick',
    };
    return NextResponse.json(response, { status: 500 });
  }
}