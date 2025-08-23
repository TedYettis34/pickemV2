import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdatePick, validatePick, hasSubmittedPicksForWeek } from '../../../../lib/picks';
import { ApiResponse, CreatePickInput } from '../../../../types/pick';
import { query } from '../../../../lib/database';
import { syncUserFromCognito, getUserByCognitoId } from '../../../../lib/users';

/**
 * Validates picker's choice limits for bulk pick submission
 * This ensures the entire set of picks doesn't exceed the week's picker's choice limit
 */
async function validateBulkPickerChoiceLimits(
  userId: string, 
  weekId: number, 
  picks: Array<{ game_id: number; pick_type: string; spread_value?: number }>
): Promise<void> {
  // Get all games for the picks being submitted
  const gameIds = picks.map(p => p.game_id);
  if (gameIds.length === 0) return;

  // Get game details to determine which are must_pick vs picker's choice
  const gameDetails = await query<{ id: number; must_pick: boolean; week_id: number }>(
    `SELECT id, must_pick, week_id FROM games WHERE id = ANY($1)`,
    [gameIds]
  );

  // Verify all games belong to the specified week
  const invalidGames = gameDetails.filter(game => game.week_id !== weekId);
  if (invalidGames.length > 0) {
    throw new Error(`Games ${invalidGames.map(g => g.id).join(', ')} do not belong to week ${weekId}`);
  }

  // Count picker's choice games being submitted (non-must-pick games)
  const pickerChoiceGamesInSubmission = gameDetails.filter(game => !game.must_pick).length;
  
  
  if (pickerChoiceGamesInSubmission === 0) {
    // No picker's choice games in submission, no limit to check
    return;
  }

  // Get week's picker's choice limit
  const weeks = await query<{ max_picker_choice_games: number | null }>(
    'SELECT max_picker_choice_games FROM weeks WHERE id = $1',
    [weekId]
  );

  if (weeks.length === 0) {
    throw new Error(`Week ${weekId} not found`);
  }

  const maxPickerChoiceGames = weeks[0].max_picker_choice_games;
  if (maxPickerChoiceGames === null) {
    // No limit set, all picks allowed
    return;
  }

  // Get current count of existing picker's choice picks for this user/week
  // excluding games that are being resubmitted in this bulk operation
  const currentPicksResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count 
     FROM picks p
     JOIN games g ON p.game_id = g.id
     WHERE p.user_id = $1 AND g.week_id = $2 AND g.must_pick = false 
     AND g.id NOT IN (${gameIds.map((_, i) => `$${i + 3}`).join(', ')})`,
    [userId, weekId, ...gameIds]
  );

  const currentPickerChoicePicks = parseInt(currentPicksResult[0].count);
  const totalPickerChoicePicks = currentPickerChoicePicks + pickerChoiceGamesInSubmission;


  if (totalPickerChoicePicks > maxPickerChoiceGames) {
    throw new Error(
      `Cannot submit picks: Would exceed picker's choice limit of ${maxPickerChoiceGames} games. ` +
      `Current: ${currentPickerChoicePicks}, Attempting to add: ${pickerChoiceGamesInSubmission}, ` +
      `Total would be: ${totalPickerChoicePicks}`
    );
  }
}

/**
 * Validates that all must-pick games for a week are included in the submission
 */
async function validateMustPickGames(
  weekId: number,
  picks: Array<{ game_id: number; pick_type: string; spread_value?: number }>
): Promise<void> {
  // Get all must-pick games for this week
  const mustPickGames = await query<{ id: number }>(
    'SELECT id FROM games WHERE week_id = $1 AND must_pick = true',
    [weekId]
  );

  if (mustPickGames.length === 0) {
    // No must-pick games for this week, validation passes
    return;
  }

  // Get game IDs from the submission
  const submittedGameIds = picks.map(p => p.game_id);
  
  // Check if all must-pick games are included
  const missingMustPickGames = mustPickGames.filter(
    game => !submittedGameIds.includes(game.id)
  );


  if (missingMustPickGames.length > 0) {
    throw new Error(
      `You must pick all required games for this week. Missing must-pick games: ${missingMustPickGames.map(g => g.id).join(', ')}`
    );
  }
}

/**
 * Validates triple play limits for bulk pick submission
 * This ensures the entire set of picks doesn't exceed the week's triple play limit
 */
async function validateBulkTriplePlayLimits(
  userId: string,
  weekId: number,
  picks: Array<{ game_id: number; pick_type: string; spread_value?: number; is_triple_play?: boolean }>
): Promise<void> {
  // Count triple plays in the submission
  const triplePlayCount = picks.filter(p => p.is_triple_play === true).length;
  
  if (triplePlayCount === 0) {
    // No triple plays in submission, validation passes
    return;
  }

  // Get week's triple play limit
  const weeks = await query<{ max_triple_plays: number | null }>(
    'SELECT max_triple_plays FROM weeks WHERE id = $1',
    [weekId]
  );

  if (weeks.length === 0) {
    throw new Error('Week not found');
  }

  const maxTriplePlays = weeks[0].max_triple_plays;
  if (maxTriplePlays === null || maxTriplePlays === undefined) {
    // No limit set, validation passes
    return;
  }

  // Get current triple play count for this user/week
  const currentResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count 
     FROM picks p
     JOIN games g ON p.game_id = g.id
     WHERE p.user_id = $1 AND g.week_id = $2 AND p.is_triple_play = true`,
    [userId, weekId]
  );

  const currentTriplePlays = parseInt(currentResult[0].count);
  const totalTriplePlays = currentTriplePlays + triplePlayCount;

  if (totalTriplePlays > maxTriplePlays) {
    throw new Error(
      `Cannot submit picks: Would exceed triple play limit of ${maxTriplePlays} picks. ` +
      `Current: ${currentTriplePlays}, Attempting to add: ${triplePlayCount}, ` +
      `Total would be: ${totalTriplePlays}`
    );
  }
}

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

    // Ensure user exists in database (sync from Cognito if needed)
    let existingUser;
    try {
      console.log('Looking up user with Cognito ID:', userId);
      existingUser = await getUserByCognitoId(userId);
      console.log('Found existing user:', existingUser ? { id: existingUser.id, email: existingUser.email, cognitoUserId: existingUser.cognito_user_id } : null);
      
      if (!existingUser) {
        console.log('User not found, attempting to sync from Cognito...');
        // Try to sync user from Cognito using the access token
        const accessToken = authHeader.replace('Bearer ', '');
        existingUser = await syncUserFromCognito(accessToken);
        console.log('Synced user from Cognito:', existingUser ? { id: existingUser.id, email: existingUser.email, cognitoUserId: existingUser.cognito_user_id } : null);
      }
      
      if (!existingUser) {
        throw new Error('User not found and could not be synced from Cognito');
      }
    } catch (userError) {
      console.error('Error ensuring user exists:', userError);
      console.error('Error details:', {
        message: userError instanceof Error ? userError.message : 'Unknown error',
        stack: userError instanceof Error ? userError.stack : undefined,
        userId,
        hasAuthHeader: !!authHeader,
        authHeaderLength: authHeader ? authHeader.length : 0
      });
      const response: ApiResponse<never> = {
        success: false,
        error: `User authentication failed: ${userError instanceof Error ? userError.message : 'Unknown error'}`,
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
    console.log('Bulk submit request:', { weekId, picksCount: picks?.length, userId });

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

    // Get the database user ID for all operations
    const databaseUserId = existingUser.id.toString();

    // Check if picks have already been submitted for this week using database user ID
    const alreadySubmitted = await hasSubmittedPicksForWeek(databaseUserId, weekIdNum);
    if (alreadySubmitted) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Picks have already been submitted for this week',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Bulk validation: Check picker's choice limits for all picks being submitted
    try {
      await validateBulkPickerChoiceLimits(databaseUserId, weekIdNum, picks);
    } catch (validationError) {
      const response: ApiResponse<never> = {
        success: false,
        error: validationError instanceof Error ? validationError.message : 'Picker choice limit validation failed',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Bulk validation: Check triple play limits for all picks being submitted
    try {
      await validateBulkTriplePlayLimits(databaseUserId, weekIdNum, picks);
    } catch (validationError) {
      const response: ApiResponse<never> = {
        success: false,
        error: validationError instanceof Error ? validationError.message : 'Triple play limit validation failed',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate that all must-pick games are included
    try {
      await validateMustPickGames(weekIdNum, picks);
    } catch (validationError) {
      const response: ApiResponse<never> = {
        success: false,
        error: validationError instanceof Error ? validationError.message : 'Must-pick game validation failed',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate each pick
    const validatedPicks: CreatePickInput[] = [];
    
    for (const pick of picks) {
      const { game_id, pick_type, spread_value, is_triple_play } = pick;

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

      // Validate the pick is allowed using the database user ID
      const validation = await validatePick(databaseUserId, game_id, is_triple_play || false);
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
        is_triple_play,
      });
    }

    // Create all picks as submitted using the database user ID
    console.log(`Creating ${validatedPicks.length} picks for user ${userId} (database ID: ${databaseUserId})`);
    const createdPicks = [];
    
    for (let i = 0; i < validatedPicks.length; i++) {
      const pickData = validatedPicks[i];
      console.log(`Creating pick ${i + 1}/${validatedPicks.length}: game ${pickData.game_id}, type ${pickData.pick_type}`);
      
      try {
        const createdPick = await createOrUpdatePick(databaseUserId, pickData.game_id, {
          ...pickData,
          submitted: true, // Mark as submitted immediately
        });
        
        console.log(`Successfully created pick for game ${pickData.game_id}`);
        createdPicks.push(createdPick);
      } catch (pickError) {
        console.error(`Error creating pick for game ${pickData.game_id}:`, pickError);
        throw pickError; // Re-throw to be caught by outer catch
      }
    }
    
    console.log(`Successfully created all ${createdPicks.length} picks`);

    const response: ApiResponse<typeof createdPicks> = {
      success: true,
      data: createdPicks,
      message: `Successfully submitted ${createdPicks.length} picks`,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error bulk submitting picks:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      errorObject: error
    });
    
    const response: ApiResponse<never> = {
      success: false,
      error: `Failed to submit picks: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
    return NextResponse.json(response, { status: 500 });
  }
}