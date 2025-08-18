import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/adminAuth';
import { oddsApiService } from '../../../../../lib/oddsApi';
import { ApiResponse } from '../../../../../types/week';

// POST /api/admin/games/preview - Preview games for a date range from Odds API
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { start_date, end_date } = body;

    // Validate required fields
    if (!start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'start_date and end_date are required' },
        { status: 400 }
      );
    }

    // Validate date format
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { success: false, error: 'start_date must be before end_date' },
        { status: 400 }
      );
    }

    // Fetch games from Odds API
    const gamesData = await oddsApiService.getAllFootballGames(
      start_date,
      end_date
    );

    // Transform games for preview (don't save, just return preview data)
    const previewGames = {
      nfl: gamesData.nfl.map(event => {
        const gameData = oddsApiService.transformToGameData(event, 0);
        return {
          external_id: event.id,
          sport: event.sport_key,
          home_team: event.home_team,
          away_team: event.away_team,
          commence_time: event.commence_time,
          // Extract spread info for preview
          spread_home: gameData.spread_home,
          spread_away: gameData.spread_away,
          total_over_under: gameData.total_over_under,
          moneyline_home: gameData.moneyline_home,
          moneyline_away: gameData.moneyline_away,
          bookmaker: gameData.bookmaker,
          odds_last_updated: gameData.odds_last_updated
        };
      }),
      college: gamesData.college.map(event => {
        const gameData = oddsApiService.transformToGameData(event, 0);
        return {
          external_id: event.id,
          sport: event.sport_key,
          home_team: event.home_team,
          away_team: event.away_team,
          commence_time: event.commence_time,
          // Extract spread info for preview
          spread_home: gameData.spread_home,
          spread_away: gameData.spread_away,
          total_over_under: gameData.total_over_under,
          moneyline_home: gameData.moneyline_home,
          moneyline_away: gameData.moneyline_away,
          bookmaker: gameData.bookmaker,
          odds_last_updated: gameData.odds_last_updated
        };
      })
    };

    const response: ApiResponse<typeof previewGames> = {
      success: true,
      data: previewGames,
      message: `Found ${previewGames.nfl.length} NFL games and ${previewGames.college.length} college games`
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error previewing games:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to preview games',
    };
    return NextResponse.json(response, { status: 500 });
  }
}