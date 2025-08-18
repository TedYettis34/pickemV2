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

      if (week.is_locked) {
        return NextResponse.json(
          { success: false, error: 'Week is already locked' },
          { status: 400 }
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

    } else if (action === 'lock') {
      // Lock the week and save the games
      const { nflGames, collegeGames, lockedBy } = body;

      if (!lockedBy) {
        return NextResponse.json(
          { success: false, error: 'Admin identifier required for locking' },
          { status: 400 }
        );
      }

      // Check if week exists and is not locked
      const week = await WeekRepository.findById(weekId);
      if (!week) {
        return NextResponse.json(
          { success: false, error: 'Week not found' },
          { status: 404 }
        );
      }

      if (week.is_locked) {
        return NextResponse.json(
          { success: false, error: 'Week is already locked' },
          { status: 400 }
        );
      }

      // Delete existing games (if any) and create new ones
      await deleteGamesByWeekId(weekId);
      
      const allGames = [...(nflGames || []), ...(collegeGames || [])];
      const savedGames = await createGamesForWeek(allGames);

      // Lock the week
      const lockedWeek = await WeekRepository.lockWeek(weekId, lockedBy);

      const response: ApiResponse<{ week: typeof lockedWeek; games: typeof savedGames }> = {
        success: true,
        data: { week: lockedWeek, games: savedGames },
        message: `Week locked with ${savedGames.length} games`
      };

      return NextResponse.json(response);

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "preview" or "lock"' },
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