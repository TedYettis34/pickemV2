import { query } from './database';
import { Game, CreateGameInput } from '../types/game';

/**
 * Get all games for a specific week
 */
export async function getGamesByWeekId(weekId: number): Promise<Game[]> {
  try {
    const result = await query<Game>(
      `SELECT * FROM games 
       WHERE week_id = $1
       ORDER BY commence_time ASC, sport ASC`,
      [weekId]
    );
    
    return result;
  } catch (error) {
    console.error('Error fetching games by week ID:', error);
    throw error;
  }
}

/**
 * Create multiple games for a week
 */
export async function createGamesForWeek(games: CreateGameInput[]): Promise<Game[]> {
  try {
    if (games.length === 0) {
      return [];
    }

    // Build the values for bulk insert
    const values = games.map((game, index) => {
      const baseIndex = index * 14; // 14 fields per game
      return `(
        $${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, 
        $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, 
        $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12}, 
        $${baseIndex + 13}, $${baseIndex + 14}
      )`;
    }).join(',');

    // Flatten all game values for the query
    const flatValues = games.flatMap(game => [
      game.week_id,
      game.sport,
      game.external_id,
      game.home_team,
      game.away_team,
      game.commence_time,
      game.spread_home || null,
      game.spread_away || null,
      game.total_over_under || null,
      game.moneyline_home || null,
      game.moneyline_away || null,
      game.bookmaker || null,
      game.odds_last_updated || null,
      new Date().toISOString() // created_at
    ]);

    const queryText = `
      INSERT INTO games (
        week_id, sport, external_id, home_team, away_team, commence_time,
        spread_home, spread_away, total_over_under, moneyline_home, 
        moneyline_away, bookmaker, odds_last_updated, created_at
      ) VALUES ${values}
      RETURNING *
    `;

    const result = await query<Game>(queryText, flatValues);
    return result;
  } catch (error) {
    console.error('Error creating games for week:', error);
    throw error;
  }
}

/**
 * Delete all games for a specific week
 */
export async function deleteGamesByWeekId(weekId: number): Promise<void> {
  try {
    await query('DELETE FROM games WHERE week_id = $1', [weekId]);
  } catch (error) {
    console.error('Error deleting games by week ID:', error);
    throw error;
  }
}

/**
 * Update game odds
 */
export async function updateGameOdds(
  gameId: number, 
  odds: {
    spread_home?: number;
    spread_away?: number;
    total_over_under?: number;
    moneyline_home?: number;
    moneyline_away?: number;
    bookmaker?: string;
    odds_last_updated?: string;
  }
): Promise<Game | null> {
  try {
    const result = await query<Game>(
      `UPDATE games 
       SET 
         spread_home = $1,
         spread_away = $2,
         total_over_under = $3,
         moneyline_home = $4,
         moneyline_away = $5,
         bookmaker = $6,
         odds_last_updated = $7,
         updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        odds.spread_home || null,
        odds.spread_away || null,
        odds.total_over_under || null,
        odds.moneyline_home || null,
        odds.moneyline_away || null,
        odds.bookmaker || null,
        odds.odds_last_updated || null,
        gameId
      ]
    );
    
    return result[0] || null;
  } catch (error) {
    console.error('Error updating game odds:', error);
    throw error;
  }
}

/**
 * Check if games already exist for a week
 */
export async function weekHasGames(weekId: number): Promise<boolean> {
  try {
    const result = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM games WHERE week_id = $1',
      [weekId]
    );
    
    const count = parseInt(result[0].count);
    return count > 0;
  } catch (error) {
    console.error('Error checking if week has games:', error);
    throw error;
  }
}

/**
 * Get games summary for a week (count by sport)
 */
export async function getGamesCountByWeek(weekId: number): Promise<{
  nfl: number;
  college: number;
  total: number;
}> {
  try {
    const result = await query<{ sport: string; count: string }>(
      `SELECT 
         sport,
         COUNT(*) as count
       FROM games 
       WHERE week_id = $1
       GROUP BY sport`,
      [weekId]
    );
    
    let nflCount = 0;
    let collegeCount = 0;
    
    result.forEach(row => {
      if (row.sport === 'americanfootball_nfl') {
        nflCount = parseInt(row.count);
      } else if (row.sport === 'americanfootball_ncaaf') {
        collegeCount = parseInt(row.count);
      }
    });
    
    return {
      nfl: nflCount,
      college: collegeCount,
      total: nflCount + collegeCount
    };
  } catch (error) {
    console.error('Error getting games count by week:', error);
    throw error;
  }
}