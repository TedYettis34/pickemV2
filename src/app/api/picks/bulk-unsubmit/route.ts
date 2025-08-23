import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/database';
import { ApiResponse } from '../../../../types/pick';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ message: string; picksUnsubmitted: number }>>> {
  try {
    // Get user ID from authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Authorization header required'
      }, { status: 401 });
    }

    // TODO: Validate the JWT token and extract user ID
    // For now, we'll extract from a custom header (this will be implemented in auth task)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID required'
      }, { status: 401 });
    }
    const body = await request.json();
    const { weekId } = body;

    if (!weekId || typeof weekId !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'Valid weekId is required'
      }, { status: 400 });
    }

    // Check if user has submitted picks for this week
    const existingPicks = await query<{
      id: number;
      game_id: number;
      pick_type: string;
      spread_value: number;
      submitted: boolean;
      commence_time: string;
    }>(
      `SELECT p.id, p.game_id, p.pick_type, p.spread_value, p.submitted, g.commence_time
       FROM picks p
       JOIN games g ON p.game_id = g.id
       WHERE p.user_id = $1 AND g.week_id = $2`,
      [userId, weekId]
    );

    if (existingPicks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No picks found for this week'
      }, { status: 404 });
    }

    // Check if any picks are submitted
    const submittedPicks = existingPicks.filter(pick => pick.submitted);
    if (submittedPicks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No submitted picks found for this week'
      }, { status: 400 });
    }

    // Check which games have started and which haven't
    const now = new Date();
    const startedGames = existingPicks.filter(pick => new Date(pick.commence_time) <= now);
    const unstartedGames = existingPicks.filter(pick => new Date(pick.commence_time) > now);
    
    // If no games are eligible for unsubmission, return error
    const unstartedSubmittedPicks = unstartedGames.filter(pick => pick.submitted);
    if (unstartedSubmittedPicks.length === 0) {
      if (startedGames.length > 0 && unstartedGames.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Cannot unsubmit picks - all games have already started'
        }, { status: 400 });
      } else {
        return NextResponse.json({
          success: false,
          error: 'No submitted picks found that can be unsubmitted'
        }, { status: 400 });
      }
    }

    // Update only picks for games that haven't started
    const updateResult = await query<{ id: number }>(
      `UPDATE picks 
       SET submitted = false, updated_at = CURRENT_TIMESTAMP
       FROM games g
       WHERE picks.game_id = g.id 
         AND picks.user_id = $1 
         AND g.week_id = $2
         AND picks.submitted = true
         AND g.commence_time > $3
       RETURNING picks.id`,
      [userId, weekId, now.toISOString()]
    );

    const picksUnsubmitted = updateResult.length;

    // Create informative message based on what happened
    let message = `Successfully unsubmitted ${picksUnsubmitted} picks`;
    if (startedGames.length > 0) {
      const startedSubmittedCount = startedGames.filter(pick => pick.submitted).length;
      if (startedSubmittedCount > 0) {
        message += ` (${startedSubmittedCount} picks for started games remain submitted)`;
      }
    }

    console.log(`User ${userId} unsubmitted ${picksUnsubmitted} picks for week ${weekId} (${startedGames.length} games had already started)`);

    return NextResponse.json({
      success: true,
      data: {
        message,
        picksUnsubmitted,
        startedGamesCount: startedGames.length,
        totalPicksCount: existingPicks.length
      }
    });

  } catch (error) {
    console.error('Error unsubmitting picks:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to unsubmit picks'
    }, { status: 500 });
  }
}