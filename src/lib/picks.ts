import { query } from './database';
import { Pick, CreatePickInput, UpdatePickInput, PickWithGame, PickValidation, PicksSummary, PickWithSpreadChange } from '../types/pick';
import { Game } from '../types/game';
import { enhancePicksWithSpreadChanges } from './spreadChanges';

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
    
    if (existingPick) {
      // Update existing pick
      const updatedPicks = await query<Pick>(
        `UPDATE picks 
         SET pick_type = $1, spread_value = $2, submitted = $3, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $4 AND game_id = $5
         RETURNING *`,
        [pickData.pick_type, pickData.spread_value, submitted, userId, gameId]
      );
      return updatedPicks[0];
    } else {
      // Create new pick
      const newPicks = await query<Pick>(
        `INSERT INTO picks (user_id, game_id, pick_type, spread_value, submitted)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, gameId, pickData.pick_type, pickData.spread_value, submitted]
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
 * Validate a pick before creating/updating
 */
export async function validatePick(
  userId: string, 
  gameId: number
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
    
    // Check if game has already started
    const gameStartTime = new Date(game.commence_time);
    const now = new Date();
    
    if (gameStartTime <= now) {
      return { isValid: false, error: 'Cannot pick on games that have already started' };
    }
    
    // Check if user has already submitted picks for this week
    const hasSubmitted = await hasSubmittedPicksForWeek(userId, game.week_id);
    if (hasSubmitted) {
      return { isValid: false, error: 'Picks have already been submitted for this week' };
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
    const weeks = await query<{ id: number; name: string }>(
      'SELECT id, name FROM weeks WHERE id = $1',
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
    
    // Check if picks are submitted
    const hasSubmitted = await hasSubmittedPicksForWeek(userId, weekId);
    
    // Get submission timestamp if submitted
    let submittedAt: string | undefined;
    if (hasSubmitted && picks.length > 0) {
      submittedAt = picks[0].updated_at; // All picks updated at same time when submitted
    }
    
    return {
      weekId: week.id,
      weekName: week.name,
      picks,
      totalPicks: picks.length,
      totalGames,
      submittedAt
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