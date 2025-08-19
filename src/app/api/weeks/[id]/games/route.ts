import { NextRequest, NextResponse } from 'next/server';
import { Game } from '../../../../../types/game';
import { ApiResponse } from '../../../../../types/week';
import { getGamesByWeekId } from '../../../../../lib/games';
import { withOddsUpdate } from '../../../../../lib/oddsUpdater';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const weekId = parseInt(id);
    
    if (isNaN(weekId) || weekId <= 0) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid week ID',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get auth token for odds update (if present)
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : 'user-request';

    // Use withOddsUpdate to check and update odds if needed (runs in background)
    const games = await withOddsUpdate(authToken, async () => {
      return await getGamesByWeekId(weekId);
    });

    const response: ApiResponse<Game[]> = {
      success: true,
      data: games,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching games for week:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch games',
    };
    return NextResponse.json(response, { status: 500 });
  }
}