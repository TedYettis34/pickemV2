import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdatePick, validatePick, hasSubmittedPicksForWeek } from '../../../../lib/picks';
import { ApiResponse, CreatePickInput } from '../../../../types/pick';

/**
 * Bulk submit multiple picks for a week
 * This endpoint creates all picks and marks them as submitted in a single operation
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

    let body;
    try {
      body = await request.json();
    } catch {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid request body',
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { weekId, picks } = body;

    // Validate required fields
    if (!weekId || !picks || !Array.isArray(picks)) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Week ID and picks array are required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    const weekIdNum = parseInt(weekId);
    if (isNaN(weekIdNum) || weekIdNum <= 0) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid week ID',
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (picks.length === 0) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'At least one pick is required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if picks have already been submitted for this week
    const alreadySubmitted = await hasSubmittedPicksForWeek(userId, weekIdNum);
    if (alreadySubmitted) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Picks have already been submitted for this week',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate each pick
    const validatedPicks: CreatePickInput[] = [];
    
    for (const pick of picks) {
      const { game_id, pick_type, spread_value } = pick;

      // Validate pick data
      if (!game_id || !pick_type) {
        const response: ApiResponse<never> = {
          success: false,
          error: 'Each pick must have game_id and pick_type',
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

      // Validate the pick is allowed
      const validation = await validatePick(userId, game_id);
      if (!validation.isValid) {
        const response: ApiResponse<never> = {
          success: false,
          error: validation.error || `Invalid pick for game ${game_id}`,
        };
        return NextResponse.json(response, { status: 400 });
      }

      validatedPicks.push({
        game_id,
        pick_type,
        spread_value,
      });
    }

    // Create all picks as submitted
    const createdPicks = [];
    
    for (const pickData of validatedPicks) {
      const createdPick = await createOrUpdatePick(userId, pickData.game_id, {
        ...pickData,
        submitted: true, // Mark as submitted immediately
      });
      
      createdPicks.push(createdPick);
    }

    const response: ApiResponse<typeof createdPicks> = {
      success: true,
      data: createdPicks,
      message: `Successfully submitted ${createdPicks.length} picks`,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error bulk submitting picks:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to submit picks',
    };
    return NextResponse.json(response, { status: 500 });
  }
}