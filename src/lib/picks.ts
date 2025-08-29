import { query } from './database';
import { Pick, CreatePickInput, UpdatePickInput, PickWithGame, PickValidation, PicksSummary, PickWithSpreadChange } from '../types/pick';
import { Game } from '../types/game';
import { enhancePicksWithSpreadChanges } from './spreadChanges';

/**
 * Check if the cutoff time has passed for a given week
 */
export async function isWeekCutoffPassed(weekId: number): Promise<boolean> {
  try {
    const weeks = await query<{ cutoff_time: string | null }>(
      'SELECT cutoff_time FROM weeks WHERE id = $1',
      [weekId]
    );

    if (weeks.length === 0) {
      throw new Error(`Week ${weekId} not found`);
    }

    const cutoffTime = weeks[0].cutoff_time;
    
    // If no cutoff time is set, allow submissions
    if (!cutoffTime) {
      return false;
    }

    const now = new Date();
    const cutoff = new Date(cutoffTime);
    
    return now > cutoff;
  } catch (error) {
    console.error('Error checking week cutoff time:', error);
    throw error;
  }
}

/**
 * Get all picks for a user in a specific week
 */
export async function getUserPicksForWeek(userId: string, weekId: number): Promise<PickWithGame[]> {
  try {
    const picks = await query<Pick & Game & { game_id: number; game_created_at: string; game_updated_at: string }>(
      `SELECT 
        p.*,
        g.id as game_id,
        g.week_id,
        g.sport,
        g.external_id,
        g.home_team,
        g.away_team,
        g.commence_time,
        g.spread_home,
        g.spread_away,
        g.total_over_under,
        g.moneyline_home,
        g.moneyline_away,
        g.bookmaker,
        g.odds_last_updated,
        g.must_pick,
        g.home_score,
        g.away_score,
        g.game_status,
        g.created_at as game_created_at,
        g.updated_at as game_updated_at
      FROM picks p
      JOIN games g ON p.game_id = g.id
      WHERE p.user_id = $1 AND g.week_id = $2
      ORDER BY g.must_pick DESC, g.commence_time ASC, g.sport ASC`,
      [userId, weekId]
    );

    // Transform the flattened result to include game object
    return picks.map(row => ({
      id: row.id,
      user_id: row.user_id,
      game_id: row.game_id,
      pick_type: row.pick_type,
      spread_value: row.spread_value,
      submitted: row.submitted,
      is_triple_play: row.is_triple_play,
      created_at: row.created_at,
      updated_at: row.updated_at,
      game: {
        id: row.game_id,
        week_id: row.week_id,
        sport: row.sport,
        external_id: row.external_id,
        home_team: row.home_team,
        away_team: row.away_team,
        commence_time: row.commence_time,
        spread_home: row.spread_home,
        spread_away: row.spread_away,
        total_over_under: row.total_over_under,
        moneyline_home: row.moneyline_home,
        moneyline_away: row.moneyline_away,
        bookmaker: row.bookmaker,
        odds_last_updated: row.odds_last_updated,
        must_pick: row.must_pick,
        home_score: row.home_score,
        away_score: row.away_score,
        game_status: row.game_status,
        created_at: row.game_created_at,
        updated_at: row.game_updated_at,
      }
    }));
  } catch (error) {
    console.error('Error fetching user picks for week:', error);
    throw error;
  }
}

/**
 * Get a specific pick for a user and game
 */
export async function getUserPickForGame(userId: string, gameId: number): Promise<Pick | null> {
  try {
    const picks = await query<Pick>(
      'SELECT * FROM picks WHERE user_id = $1 AND game_id = $2',
      [userId, gameId]
    );
    return picks[0] || null;
  } catch (error) {
    console.error('Error fetching user pick for game:', error);
    throw error;
  }
}

/**
 * Create or update a pick for a user
 */
export async function createOrUpdatePick(
  userId: string, 
  gameId: number, 
  pickData: CreatePickInput | UpdatePickInput & { submitted?: boolean }
): Promise<Pick> {
  try {
    // Check if pick already exists
    const existingPick = await getUserPickForGame(userId, gameId);
    
    const submitted = (pickData as CreatePickInput & { submitted?: boolean }).submitted ?? false;
    const isTriplePlay = pickData.is_triple_play ?? false;
    
    if (existingPick) {
      // Update existing pick
      const updatedPicks = await query<Pick>(
        `UPDATE picks 
         SET pick_type = $1, spread_value = $2, submitted = $3, is_triple_play = $4, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $5 AND game_id = $6
         RETURNING *`,
        [pickData.pick_type, pickData.spread_value, submitted, isTriplePlay, userId, gameId]
      );
      return updatedPicks[0];
    } else {
      // Create new pick
      const newPicks = await query<Pick>(
        `INSERT INTO picks (user_id, game_id, pick_type, spread_value, submitted, is_triple_play)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, gameId, pickData.pick_type, pickData.spread_value, submitted, isTriplePlay]
      );
      return newPicks[0];
    }
  } catch (error) {
    console.error('Error creating/updating pick:', error);
    throw error;
  }
}

/**
 * Delete a pick
 */
export async function deletePick(userId: string, gameId: number): Promise<void> {
  try {
    await query(
      'DELETE FROM picks WHERE user_id = $1 AND game_id = $2',
      [userId, gameId]
    );
  } catch (error) {
    console.error('Error deleting pick:', error);
    throw error;
  }
}

/**
 * Submit all picks for a user in a specific week
 */
export async function submitPicksForWeek(userId: string, weekId: number): Promise<Pick[]> {
  try {
    const submittedPicks = await query<Pick>(
      `UPDATE picks 
       SET submitted = true, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 
         AND game_id IN (SELECT id FROM games WHERE week_id = $2)
         AND submitted = false
       RETURNING *`,
      [userId, weekId]
    );
    return submittedPicks;
  } catch (error) {
    console.error('Error submitting picks for week:', error);
    throw error;
  }
}

/**
 * Check if a user has submitted picks for a week
 */
export async function hasSubmittedPicksForWeek(userId: string, weekId: number): Promise<boolean> {
  try {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM picks p
       JOIN games g ON p.game_id = g.id
       WHERE p.user_id = $1 AND g.week_id = $2 AND p.submitted = true`,
      [userId, weekId]
    );
    return parseInt(result[0].count) > 0;
  } catch (error) {
    console.error('Error checking if user has submitted picks:', error);
    throw error;
  }
}

/**
 * Validate a pick before creating/updating/deleting
 */
export async function validatePick(
  userId: string, 
  gameId: number,
  isTriplePlay: boolean = false,
  operation: 'create' | 'update' | 'delete' = 'create'
): Promise<PickValidation> {
  try {
    // Check if game exists and get game info
    const games = await query<Game>(
      'SELECT * FROM games WHERE id = $1',
      [gameId]
    );
    
    if (games.length === 0) {
      return { isValid: false, error: 'Game not found' };
    }
    
    const game = games[0];
    
    // Check if the cutoff time has passed for this week
    const cutoffPassed = await isWeekCutoffPassed(game.week_id);
    if (cutoffPassed) {
      return { isValid: false, error: 'Pick submission cutoff time has passed for this week' };
    }
    
    // Check if game has already started
    const gameStartTime = new Date(game.commence_time);
    const now = new Date();
    
    if (gameStartTime <= now) {
      // For deletion operations, allow deletion of unsubmitted picks even after game start
      if (operation === 'delete') {
        const existingPick = await getUserPickForGame(userId, gameId);
        if (existingPick && !existingPick.submitted) {
          // Allow deletion of unsubmitted picks for started games
          return { isValid: true };
        }
      }
      return { isValid: false, error: 'Cannot pick on games that have already started' };
    }
    
    // Check if user has already submitted picks for this week
    // Only prevent new picks if ALL eligible picks (for games that haven't started) are submitted
    const userPicksForWeek = await getUserPicksForWeek(userId, game.week_id);
    const eligiblePicks = userPicksForWeek.filter(pick => new Date(pick.game.commence_time) > now);
    const submittedEligiblePicks = eligiblePicks.filter(pick => pick.submitted);
    
    const allEligiblePicksSubmitted = eligiblePicks.length > 0 && submittedEligiblePicks.length === eligiblePicks.length;
    if (allEligiblePicksSubmitted) {
      return { isValid: false, error: 'All picks for eligible games have already been submitted for this week' };
    }
    
    // Check if user already has a pick for this game
    const existingPick = await getUserPickForGame(userId, gameId);
    
    // If updating existing pick, ensure it's not submitted
    if (existingPick && existingPick.submitted) {
      return { isValid: false, error: 'Cannot modify submitted picks' };
    }
    
    // Check picker choice limit (only for new picks on non-must-pick games)
    if (!existingPick && !game.must_pick) {
      // Get week info to check limits
      const weeks = await query<{ max_picker_choice_games: number | null }>(
        'SELECT max_picker_choice_games FROM weeks WHERE id = $1',
        [game.week_id]
      );
      
      if (weeks.length > 0 && weeks[0].max_picker_choice_games !== null) {
        const maxPickerChoiceGames = weeks[0].max_picker_choice_games;
        
        // Get current picker choice picks count (non-must-pick games)
        const currentPicksResult = await query<{ count: string }>(
          `SELECT COUNT(*) as count 
           FROM picks p
           JOIN games g ON p.game_id = g.id
           WHERE p.user_id = $1 AND g.week_id = $2 AND g.must_pick = false`,
          [userId, game.week_id]
        );
        
        const currentPickerChoicePicks = parseInt(currentPicksResult[0].count);
        
        if (currentPickerChoicePicks >= maxPickerChoiceGames) {
          return { 
            isValid: false, 
            error: `You can only pick ${maxPickerChoiceGames} picker's choice games (excluding must-pick games). You have already picked ${currentPickerChoicePicks}.`
          };
        }
      }
    }

    // Check triple play limit if this pick is marked as a triple play
    if (isTriplePlay) {
      // Get week info to check triple play limits
      const weeks = await query<{ max_triple_plays: number | null }>(
        'SELECT max_triple_plays FROM weeks WHERE id = $1',
        [game.week_id]
      );
      
      if (weeks.length > 0 && weeks[0].max_triple_plays !== null && !game.must_pick) {
        const maxTriplePlays = weeks[0].max_triple_plays;
        
        // Get current triple play picks count for this week (only count submitted picks)
        const currentTriplePlayResult = await query<{ count: string }>(
          `SELECT COUNT(*) as count 
           FROM picks p
           JOIN games g ON p.game_id = g.id
           WHERE p.user_id = $1 AND g.week_id = $2 AND p.is_triple_play = true AND p.submitted = true`,
          [userId, game.week_id]
        );
        
        const currentTriplePlays = parseInt(currentTriplePlayResult[0].count);
        
        // If this is an update to an existing pick, don't count it against the limit
        const adjustedCount = existingPick && existingPick.is_triple_play ? currentTriplePlays - 1 : currentTriplePlays;
        
        if (adjustedCount >= maxTriplePlays) {
          return { 
            isValid: false, 
            error: `You can only mark ${maxTriplePlays} picks as triple plays per week. You have already marked ${currentTriplePlays}.`
          };
        }
      }
    }
    
    return { isValid: true };
  } catch (error) {
    console.error('Error validating pick:', error);
    return { isValid: false, error: 'Failed to validate pick' };
  }
}

/**
 * Get picks summary for review
 */
export async function getPicksSummaryForWeek(userId: string, weekId: number): Promise<PicksSummary | null> {
  try {
    // Get week info
    const weeks = await query<{ id: number; name: string; cutoff_time: string | null }>(
      'SELECT id, name, cutoff_time FROM weeks WHERE id = $1',
      [weekId]
    );
    
    if (weeks.length === 0) {
      return null;
    }
    
    const week = weeks[0];
    
    // Get all picks for the week
    const picks = await getUserPicksForWeek(userId, weekId);
    
    // Get total number of games for the week
    const gamesResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM games WHERE week_id = $1',
      [weekId]
    );
    const totalGames = parseInt(gamesResult[0].count);
    
    // Check if picks are submitted - only consider picks as submitted if all eligible picks are submitted
    // (picks for games that haven't started should be considered for submission status)
    const now = new Date();
    const eligiblePicks = picks.filter(pick => new Date(pick.game.commence_time) > now);
    const submittedEligiblePicks = eligiblePicks.filter(pick => pick.submitted);
    
    const hasSubmitted = eligiblePicks.length > 0 && submittedEligiblePicks.length === eligiblePicks.length;
    
    // Get submission timestamp if submitted
    let submittedAt: string | undefined;
    if (hasSubmitted && submittedEligiblePicks.length > 0) {
      submittedAt = submittedEligiblePicks[0].updated_at; // All picks updated at same time when submitted
    }
    
    return {
      weekId: week.id,
      weekName: week.name,
      picks,
      totalPicks: picks.length,
      totalGames,
      submittedAt,
      cutoffTime: week.cutoff_time
    };
  } catch (error) {
    console.error('Error getting picks summary:', error);
    throw error;
  }
}

/**
 * Get count of picks for a week
 */
export async function getPicksCountForWeek(userId: string, weekId: number): Promise<number> {
  try {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM picks p
       JOIN games g ON p.game_id = g.id
       WHERE p.user_id = $1 AND g.week_id = $2`,
      [userId, weekId]
    );
    return parseInt(result[0].count);
  } catch (error) {
    console.error('Error getting picks count:', error);
    throw error;
  }
}

/**
 * Get picks with spread change information
 */
export async function getUserPicksWithSpreadChanges(userId: string, weekId: number): Promise<PickWithSpreadChange[]> {
  try {
    const picks = await getUserPicksForWeek(userId, weekId);
    return enhancePicksWithSpreadChanges(picks);
  } catch (error) {
    console.error('Error getting picks with spread changes:', error);
    throw error;
  }
}

/**
 * Update a pick to the current spread (for when user wants to follow line movement)
 */
export async function updatePickToCurrentSpread(userId: string, gameId: number): Promise<Pick | null> {
  try {
    // First, get the current pick and game info
    const picks = await query<Pick & Game & { game_id: number; game_created_at: string; game_updated_at: string }>(
      `SELECT 
        p.*,
        g.id as game_id,
        g.spread_home,
        g.spread_away,
        g.commence_time
      FROM picks p
      JOIN games g ON p.game_id = g.id
      WHERE p.user_id = $1 AND p.game_id = $2`,
      [userId, gameId]
    );

    if (picks.length === 0) {
      throw new Error('Pick not found');
    }

    const pick = picks[0];

    // Check if game has started
    const gameStartTime = new Date(pick.commence_time);
    const now = new Date();
    if (gameStartTime <= now) {
      throw new Error('Cannot update picks for games that have started');
    }

    // Check if pick is already submitted
    if (pick.submitted) {
      throw new Error('Cannot update submitted picks');
    }

    // Get the current spread for the pick type
    let currentSpread: number | null = null;
    if (pick.pick_type === 'home_spread') {
      currentSpread = pick.spread_home ?? null;
    } else if (pick.pick_type === 'away_spread') {
      currentSpread = pick.spread_away ?? null;
    }

    if (currentSpread === null) {
      throw new Error('Current spread not available');
    }

    // Update the pick with the current spread
    const result = await query<Pick>(
      `UPDATE picks 
       SET spread_value = $1, updated_at = NOW()
       WHERE user_id = $2 AND game_id = $3
       RETURNING *`,
      [currentSpread, userId, gameId]
    );

    return result[0] || null;
  } catch (error) {
    console.error('Error updating pick to current spread:', error);
    throw error;
  }
}