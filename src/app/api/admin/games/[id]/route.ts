import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/adminAuth';
import { getDatabase } from '../../../../../lib/database';
import { ApiResponse } from '../../../../../types/api';
import { Game } from '../../../../../types/game';

// Update individual game properties (like must_pick)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminAuth = requireAdmin();
  const authResult = await adminAuth(request);

  if (!authResult.isAuthorized) {
    return NextResponse.json(
      { success: false, error: authResult.error || 'Unauthorized' } as ApiResponse<never>,
      { status: 401 }
    );
  }

  try {
    const resolvedParams = await params;
    const gameId = parseInt(resolvedParams.id);
    if (isNaN(gameId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid game ID' } as ApiResponse<never>,
        { status: 400 }
      );
    }

    const body = await request.json();
    const { must_pick } = body;

    // Validate that must_pick is a boolean
    if (must_pick !== undefined && typeof must_pick !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'must_pick must be a boolean' } as ApiResponse<never>,
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if game exists
    const existingGameQuery = 'SELECT id FROM games WHERE id = $1';
    const existingGameResult = await db.query(existingGameQuery, [gameId]);

    if (existingGameResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Game not found' } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // Update the game's must_pick status
    const updateQuery = `
      UPDATE games 
      SET must_pick = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const updateResult = await db.query(updateQuery, [must_pick, gameId]);
    const updatedGame = updateResult.rows[0];

    const response: ApiResponse<Game> = {
      success: true,
      data: updatedGame,
      message: `Game must_pick status updated to ${must_pick}`,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error updating game:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to update game',
    };
    return NextResponse.json(response, { status: 500 });
  }
}