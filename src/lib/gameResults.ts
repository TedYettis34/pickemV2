import { query } from './database';
import { Game } from '../types/game';
import { Pick } from '../types/pick';
import { evaluateGamePicks, GamePickEvaluation } from './pickEvaluation';

/**
 * Update game with final score and status
 */
export async function updateGameResult(
  gameId: number,
  homeScore: number,
  awayScore: number,
  gameStatus: 'final' | 'cancelled' = 'final'
): Promise<Game> {
  try {
    const result = await query<Game>(
      `UPDATE games 
       SET home_score = $1, away_score = $2, game_status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [homeScore, awayScore, gameStatus, gameId]
    );
    
    if (result.length === 0) {
      throw new Error('Game not found');
    }
    
    return result[0];
  } catch (error) {
    console.error('Error updating game result:', error);
    throw error;
  }
}

/**
 * Get all picks for a specific game
 */
export async function getPicksForGame(gameId: number): Promise<Pick[]> {
  try {
    const picks = await query<Pick>(
      'SELECT * FROM picks WHERE game_id = $1',
      [gameId]
    );
    return picks;
  } catch (error) {
    console.error('Error getting picks for game:', error);
    throw error;
  }
}

/**
 * Update pick results after game completion
 */
export async function updatePickResults(evaluations: GamePickEvaluation[]): Promise<void> {
  try {
    if (evaluations.length === 0) return;
    
    // Use a transaction to update all picks atomically
    for (const evaluation of evaluations) {
      await query(
        `UPDATE picks 
         SET result = $1, evaluated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [evaluation.result, evaluation.pickId]
      );
    }
  } catch (error) {
    console.error('Error updating pick results:', error);
    throw error;
  }
}

/**
 * Complete workflow: Update game result and evaluate all picks
 */
export async function finalizeGameResult(
  gameId: number,
  homeScore: number,
  awayScore: number
): Promise<{
  game: Game;
  pickEvaluations: GamePickEvaluation[];
  picksUpdated: number;
}> {
  try {
    // Update the game result
    const game = await updateGameResult(gameId, homeScore, awayScore, 'final');
    
    // Get all picks for this game
    const picks = await getPicksForGame(gameId);
    
    // Evaluate all picks
    const pickEvaluations = evaluateGamePicks(picks, homeScore, awayScore);
    
    // Update pick results in database
    await updatePickResults(pickEvaluations);
    
    return {
      game,
      pickEvaluations,
      picksUpdated: pickEvaluations.length
    };
  } catch (error) {
    console.error('Error finalizing game result:', error);
    throw error;
  }
}

/**
 * Get games that need results (final but no score entered)
 */
export async function getGamesNeedingResults(weekId?: number): Promise<Game[]> {
  try {
    let sql = `
      SELECT * FROM games 
      WHERE game_status IN ('final', 'in_progress') 
        AND (home_score IS NULL OR away_score IS NULL)
      ORDER BY commence_time ASC
    `;
    const params: (number | string)[] = [];
    
    if (weekId) {
      sql = `
        SELECT * FROM games 
        WHERE week_id = $1 
          AND game_status IN ('final', 'in_progress')
          AND (home_score IS NULL OR away_score IS NULL)
        ORDER BY commence_time ASC
      `;
      params.push(weekId);
    }
    
    const games = await query<Game>(sql, params);
    return games;
  } catch (error) {
    console.error('Error getting games needing results:', error);
    throw error;
  }
}

/**
 * Get completed games with results
 */
export async function getCompletedGames(weekId?: number): Promise<Game[]> {
  try {
    let sql = `
      SELECT * FROM games 
      WHERE game_status = 'final' 
        AND home_score IS NOT NULL 
        AND away_score IS NOT NULL
      ORDER BY commence_time DESC
    `;
    const params: (number | string)[] = [];
    
    if (weekId) {
      sql = `
        SELECT * FROM games 
        WHERE week_id = $1 
          AND game_status = 'final' 
          AND home_score IS NOT NULL 
          AND away_score IS NOT NULL
        ORDER BY commence_time DESC
      `;
      params.push(weekId);
    }
    
    const games = await query<Game>(sql, params);
    return games;
  } catch (error) {
    console.error('Error getting completed games:', error);
    throw error;
  }
}

/**
 * Re-evaluate picks for a game (useful if scores were entered incorrectly)
 */
export async function reevaluateGamePicks(gameId: number): Promise<GamePickEvaluation[]> {
  try {
    // Get game with scores
    const games = await query<Game>(
      'SELECT * FROM games WHERE id = $1 AND home_score IS NOT NULL AND away_score IS NOT NULL',
      [gameId]
    );
    
    if (games.length === 0) {
      throw new Error('Game not found or scores not available');
    }
    
    const game = games[0];
    const picks = await getPicksForGame(gameId);
    
    // Evaluate picks
    const pickEvaluations = evaluateGamePicks(picks, game.home_score!, game.away_score!);
    
    // Update results
    await updatePickResults(pickEvaluations);
    
    return pickEvaluations;
  } catch (error) {
    console.error('Error re-evaluating game picks:', error);
    throw error;
  }
}