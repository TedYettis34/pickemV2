import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '../../../../../types/pick';
import { Game } from '../../../../../types/game';
import { getGamesNeedingResults, getCompletedGames } from '../../../../../lib/gameResults';
import { validateAdminAuth } from '../../../../../lib/adminAuth';

interface GamesResultsResponse {
  needingResults: Game[];
  completed: Game[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate admin authentication
    const authResult = await validateAdminAuth(request);
    if (!authResult.isValid) {
      const response: ApiResponse<never> = {
        success: false,
        error: authResult.error || 'Unauthorized',
      };
      return NextResponse.json(response, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekIdParam = searchParams.get('weekId');
    const weekId = weekIdParam ? parseInt(weekIdParam) : undefined;

    if (weekIdParam && isNaN(weekId!)) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid week ID',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get games needing results and completed games
    const [needingResults, completed] = await Promise.all([
      getGamesNeedingResults(weekId),
      getCompletedGames(weekId)
    ]);

    const response: ApiResponse<GamesResultsResponse> = {
      success: true,
      data: {
        needingResults,
        completed
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching games results:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch games results',
    };
    return NextResponse.json(response, { status: 500 });
  }
}