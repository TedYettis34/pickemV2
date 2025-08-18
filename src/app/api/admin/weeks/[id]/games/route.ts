import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/adminAuth';
import { getGamesByWeekId, createGamesForWeek, deleteGamesByWeekId } from '../../../../../../lib/games';
import { WeekRepository } from '../../../../../../lib/weeks';
import { oddsApiService } from '../../../../../../lib/oddsApi';
import { ApiResponse } from '../../../../../../types/week';
import { Game } from '../../../../../../types/game';

// GET /api/admin/weeks/[id]/games - Get all games for a week
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate admin auth
    const adminCheck = await requireAdmin();
    const authResult = await adminCheck(request);
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { id } = await params;
    const weekId = parseInt(id);
    if (isNaN(weekId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid week ID' },
        { status: 400 }
      );
    }

    // Check if week exists
    const week = await WeekRepository.findById(weekId);
    if (!week) {
      return NextResponse.json(
        { success: false, error: 'Week not found' },
        { status: 404 }
      );
    }

    const games = await getGamesByWeekId(weekId);

    const response: ApiResponse<Game[]> = {
      success: true,
      data: games
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

// POST /api/admin/weeks/[id]/games/preview - Preview games for a week from Odds API
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate admin auth
    const adminCheck = await requireAdmin();
    const authResult = await adminCheck(request);
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { id } = await params;
    const weekId = parseInt(id);
    if (isNaN(weekId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid week ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'preview') {
      // Fetch games from Odds API for preview
      const week = await WeekRepository.findById(weekId);
      if (!week) {
        return NextResponse.json(
          { success: false, error: 'Week not found' },
          { status: 404 }
        );
      }


      // Fetch games from Odds API
      const gamesData = await oddsApiService.getAllFootballGames(
        week.start_date,
        week.end_date
      );

      // Transform games for preview (don't save yet)
      const previewGames = {
        nfl: gamesData.nfl.map(event => oddsApiService.transformToGameData(event, weekId)),
        college: gamesData.college.map(event => oddsApiService.transformToGameData(event, weekId))
      };

      const response: ApiResponse<typeof previewGames> = {
        success: true,
        data: previewGames,
        message: `Found ${previewGames.nfl.length} NFL games and ${previewGames.college.length} college games`
      };

      return NextResponse.json(response);

    } else if (action === 'save') {
      // Save the games to the week
      const { nflGames, collegeGames } = body;

      // Check if week exists
      const week = await WeekRepository.findById(weekId);
      if (!week) {
        return NextResponse.json(
          { success: false, error: 'Week not found' },
          { status: 404 }
        );
      }

      // Delete existing games (if any) and create new ones
      await deleteGamesByWeekId(weekId);
      
      const allGames = [...(nflGames || []), ...(collegeGames || [])];
      const savedGames = await createGamesForWeek(allGames);

      const response: ApiResponse<{ games: typeof savedGames }> = {
        success: true,
        data: { games: savedGames },
        message: `Saved ${savedGames.length} games to week`
      };

      return NextResponse.json(response);

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "preview" or "save"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error handling games operation:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to process games operation',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/admin/weeks/[id]/games - Delete all games for a week
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate admin auth
    const adminCheck = await requireAdmin();
    const authResult = await adminCheck(request);
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { id } = await params;
    const weekId = parseInt(id);
    if (isNaN(weekId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid week ID' },
        { status: 400 }
      );
    }

    // Check if week exists
    const week = await WeekRepository.findById(weekId);
    if (!week) {
      return NextResponse.json(
        { success: false, error: 'Week not found' },
        { status: 404 }
      );
    }

    // Delete all games for this week
    await deleteGamesByWeekId(weekId);

    const response: ApiResponse<{ deleted: boolean }> = {
      success: true,
      data: { deleted: true },
      message: 'All games deleted for this week'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error deleting games for week:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to delete games',
    };
    return NextResponse.json(response, { status: 500 });
  }
}