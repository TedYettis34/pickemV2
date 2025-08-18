import { NextRequest, NextResponse } from 'next/server';
import { WeekRepository, WeekValidator } from '../../../../lib/weeks';
import { requireAdmin } from '../../../../lib/adminAuth';
import { CreateWeekInput, WeekFilters, ApiResponse, Week } from '../../../../types/week';
import { oddsApiService } from '../../../../lib/oddsApi';
import { createGamesForWeek } from '../../../../lib/games';

interface GameData {
  external_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  sport: string;
  spread_home?: number;
  spread_away?: number;
  total_over_under?: number;
  moneyline_home?: number;
  moneyline_away?: number;
  bookmaker?: string;
  odds_last_updated?: string;
}

// GET /api/admin/weeks - Get all weeks with optional filtering
export async function GET(req: NextRequest) {
  try {
    // Check admin authorization
    const adminCheck = await requireAdmin();
    const authResult = await adminCheck(req);
    
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(req.url);
    const filters: WeekFilters = {};

    if (searchParams.get('name')) {
      filters.name = searchParams.get('name')!;
    }
    if (searchParams.get('start_date_from')) {
      filters.start_date_from = searchParams.get('start_date_from')!;
    }
    if (searchParams.get('start_date_to')) {
      filters.start_date_to = searchParams.get('start_date_to')!;
    }
    if (searchParams.get('end_date_from')) {
      filters.end_date_from = searchParams.get('end_date_from')!;
    }
    if (searchParams.get('end_date_to')) {
      filters.end_date_to = searchParams.get('end_date_to')!;
    }
    if (searchParams.get('active_on')) {
      filters.active_on = searchParams.get('active_on')!;
    }

    const weeks = await WeekRepository.findAll(filters);

    const response: ApiResponse<Week[]> = {
      success: true,
      data: weeks,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching weeks:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    const response: ApiResponse<never> = {
      success: false,
      error: `Failed to fetch weeks: ${error instanceof Error ? error.message : String(error)}`,
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/admin/weeks - Create a new week
export async function POST(req: NextRequest) {
  try {
    // Check admin authorization
    const adminCheck = await requireAdmin();
    const authResult = await adminCheck(req);
    
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const weekData: CreateWeekInput = {
      name: body?.name || '',
      start_date: body?.start_date || '',
      end_date: body?.end_date || '',
      description: body?.description,
    };
    
    // Optional games data from wizard
    const gamesData = body?.games;

    // Validate input
    const validationErrors = WeekValidator.validateCreateInput(weekData);
    if (validationErrors && validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: validationErrors.join(', '),
        },
        { status: 400 }
      );
    }

    // Check if name already exists
    const existingWeek = await WeekRepository.findByName(weekData.name);
    if (existingWeek) {
      return NextResponse.json(
        {
          success: false,
          error: 'Week name already exists',
        },
        { status: 409 }
      );
    }

    // Check for date conflicts
    const conflictingWeek = await WeekRepository.hasDateConflict(
      weekData.start_date,
      weekData.end_date
    );
    if (conflictingWeek) {
      return NextResponse.json(
        {
          success: false,
          error: `Date range conflicts with existing week: ${conflictingWeek.name}`,
        },
        { status: 409 }
      );
    }

    // Fetch games preview before creating the week
    let gamesPreview = null;
    try {
      const gamesData = await oddsApiService.getAllFootballGames(
        weekData.start_date,
        weekData.end_date
      );

      gamesPreview = {
        nfl: gamesData.nfl.map(event => ({
          external_id: event.id,
          home_team: event.home_team,
          away_team: event.away_team,
          commence_time: event.commence_time,
          sport: event.sport_key
        })),
        college: gamesData.college.map(event => ({
          external_id: event.id,
          home_team: event.home_team,
          away_team: event.away_team,
          commence_time: event.commence_time,
          sport: event.sport_key
        }))
      };

      console.log(`Found ${gamesPreview.nfl.length} NFL games and ${gamesPreview.college.length} college games for new week`);
    } catch (error) {
      console.warn('Could not fetch games preview:', error);
      // Continue with week creation even if games fetch fails
    }

    // Create the week
    const newWeek = await WeekRepository.create(weekData);
    
    let savedGamesCount = 0;
    
    // If games data is provided (from wizard), save the games
    if (gamesData && newWeek) {
      try {
        const allGames = [
          ...(gamesData.nfl || []).map((game: GameData) => ({
            week_id: newWeek.id,
            sport: game.sport || 'americanfootball_nfl',
            external_id: game.external_id,
            home_team: game.home_team,
            away_team: game.away_team,
            commence_time: game.commence_time,
            spread_home: game.spread_home || null,
            spread_away: game.spread_away || null,
            total_over_under: game.total_over_under || null,
            moneyline_home: game.moneyline_home || null,
            moneyline_away: game.moneyline_away || null,
            bookmaker: game.bookmaker || null,
            odds_last_updated: game.odds_last_updated || null,
          })),
          ...(gamesData.college || []).map((game: GameData) => ({
            week_id: newWeek.id,
            sport: game.sport || 'americanfootball_ncaaf',
            external_id: game.external_id,
            home_team: game.home_team,
            away_team: game.away_team,
            commence_time: game.commence_time,
            spread_home: game.spread_home || null,
            spread_away: game.spread_away || null,
            total_over_under: game.total_over_under || null,
            moneyline_home: game.moneyline_home || null,
            moneyline_away: game.moneyline_away || null,
            bookmaker: game.bookmaker || null,
            odds_last_updated: game.odds_last_updated || null,
          }))
        ];
        
        if (allGames.length > 0) {
          const savedGames = await createGamesForWeek(allGames);
          savedGamesCount = savedGames.length;
          console.log(`Saved ${savedGamesCount} games for week "${newWeek.name}"`);
        }
      } catch (error) {
        console.error('Error saving games for week:', error);
        // Don't fail the entire request if games saving fails
      }
    }

    const response: ApiResponse<Week & { gamesPreview?: { nfl: GameData[]; college: GameData[] }; savedGamesCount?: number }> = {
      success: true,
      data: {
        ...newWeek,
        gamesPreview: gamesPreview || undefined,
        savedGamesCount: gamesData ? savedGamesCount : undefined
      },
      message: gamesData 
        ? `Week created successfully with ${savedGamesCount} games saved`
        : `Week created successfully${gamesPreview ? ` with ${gamesPreview.nfl.length + gamesPreview.college.length} games available` : ''}`,
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Error creating week:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to create week',
    };
    return NextResponse.json(response, { status: 500 });
  }
}