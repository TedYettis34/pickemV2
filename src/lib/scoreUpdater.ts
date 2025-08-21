import { Game, OddsApiScore } from '../types/game';
import { query } from './database';
import { oddsApiService } from './oddsApi';
import { finalizeGameResult } from './gameResults';

/**
 * Service for automatically fetching and updating game scores from the Odds API
 */

/**
 * Check if a game needs automatic score update
 * Criteria:
 * 1. Game started more than 4 hours ago
 * 2. Admin hasn't manually set the score (home_score/away_score are null)
 * 3. Game is not already marked as final
 */
export function shouldFetchScore(game: Game): boolean {
  const now = new Date();
  const gameStartTime = new Date(game.commence_time);
  const fourHoursInMs = 4 * 60 * 60 * 1000;
  
  // Check if game started more than 4 hours ago
  const gameStartedMoreThan4HoursAgo = (now.getTime() - gameStartTime.getTime()) > fourHoursInMs;
  
  // Check if admin hasn't set scores manually
  const noManualScoreSet = game.home_score === null && game.away_score === null;
  
  // Only fetch if game started 4+ hours ago, no manual score, and not already final
  return gameStartedMoreThan4HoursAgo && noManualScoreSet && game.game_status !== 'final';
}

/**
 * Get all games that need score updates
 */
export async function getGamesNeedingScoreUpdates(): Promise<Game[]> {
  try {
    const games = await query<Game>(`
      SELECT * FROM games 
      WHERE game_status != 'final' 
        AND home_score IS NULL 
        AND away_score IS NULL
        AND commence_time < NOW() - INTERVAL '4 hours'
      ORDER BY commence_time ASC
    `);
    
    return games.filter(game => shouldFetchScore(game));
  } catch (error) {
    console.error('Error fetching games needing score updates:', error);
    throw error;
  }
}

/**
 * Transform OddsApiScore to home/away scores
 */
export function extractScoresFromApiResponse(scoreData: OddsApiScore): {
  homeScore: number;
  awayScore: number;
} | null {
  if (!scoreData.completed || !scoreData.scores) {
    return null;
  }

  const homeScoreEntry = scoreData.scores.find(s => s.name === scoreData.home_team);
  const awayScoreEntry = scoreData.scores.find(s => s.name === scoreData.away_team);

  if (!homeScoreEntry || !awayScoreEntry) {
    console.warn(`Could not find scores for ${scoreData.home_team} vs ${scoreData.away_team}`);
    return null;
  }

  const homeScore = parseInt(homeScoreEntry.score, 10);
  const awayScore = parseInt(awayScoreEntry.score, 10);

  if (isNaN(homeScore) || isNaN(awayScore)) {
    console.warn(`Invalid scores for ${scoreData.home_team} vs ${scoreData.away_team}: ${homeScoreEntry.score} - ${awayScoreEntry.score}`);
    return null;
  }

  return { homeScore, awayScore };
}

/**
 * Update scores for games that need automatic updates
 */
export async function updateScoresFromApi(): Promise<{
  gamesChecked: number;
  gamesUpdated: number;
  errors: string[];
}> {
  const result = {
    gamesChecked: 0,
    gamesUpdated: 0,
    errors: [] as string[]
  };

  try {
    // Get games that need score updates
    const games = await getGamesNeedingScoreUpdates();
    result.gamesChecked = games.length;

    if (games.length === 0) {
      console.log('No games need score updates');
      return result;
    }

    console.log(`Found ${games.length} games needing score updates`);

    // Group games by sport for efficient API calls
    const nflGames = games.filter(g => g.sport === 'americanfootball_nfl');
    const collegeGames = games.filter(g => g.sport === 'americanfootball_ncaaf');

    // Fetch scores for each sport
    const nflGameIds = nflGames.map(g => g.external_id);
    const collegeGameIds = collegeGames.map(g => g.external_id);

    let allScores: OddsApiScore[] = [];

    try {
      const scoresResponse = await oddsApiService.getAllFootballScores([...nflGameIds, ...collegeGameIds]);
      allScores = [...scoresResponse.nfl, ...scoresResponse.college];
    } catch (error) {
      const errorMsg = `Failed to fetch scores from API: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
      return result;
    }

    console.log(`Fetched ${allScores.length} scores from API`);

    // Process each game that has score data
    for (const game of games) {
      try {
        const scoreData = allScores.find(s => s.id === game.external_id);
        
        if (!scoreData) {
          console.log(`No score data found for game ${game.external_id} (${game.away_team} @ ${game.home_team})`);
          continue;
        }

        if (!scoreData.completed) {
          console.log(`Game ${game.external_id} is not completed yet`);
          continue;
        }

        const scores = extractScoresFromApiResponse(scoreData);
        if (!scores) {
          result.errors.push(`Could not extract valid scores for game ${game.external_id}`);
          continue;
        }

        console.log(`Updating game ${game.external_id}: ${game.away_team} ${scores.awayScore} - ${game.home_team} ${scores.homeScore}`);

        // Update the game with scores and evaluate picks
        await finalizeGameResult(game.id, scores.homeScore, scores.awayScore);
        result.gamesUpdated++;

      } catch (error) {
        const errorMsg = `Error updating game ${game.id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    console.log(`Score update complete: ${result.gamesUpdated}/${result.gamesChecked} games updated`);
    return result;

  } catch (error) {
    const errorMsg = `Error in updateScoresFromApi: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
    return result;
  }
}

/**
 * Check and update scores for a specific game (used for on-demand updates)
 */
export async function updateScoreForGame(gameId: number): Promise<{
  updated: boolean;
  error?: string;
}> {
  try {
    const games = await query<Game>('SELECT * FROM games WHERE id = $1', [gameId]);
    
    if (games.length === 0) {
      return { updated: false, error: 'Game not found' };
    }

    const game = games[0];
    
    if (!shouldFetchScore(game)) {
      return { updated: false, error: 'Game does not meet criteria for automatic score update' };
    }

    // Get scores for this specific game
    const scoresResponse = await oddsApiService.getScores(game.sport, [game.external_id]);
    const scoreData = scoresResponse.find(s => s.id === game.external_id);

    if (!scoreData || !scoreData.completed) {
      return { updated: false, error: 'Score not available or game not completed' };
    }

    const scores = extractScoresFromApiResponse(scoreData);
    if (!scores) {
      return { updated: false, error: 'Could not extract valid scores' };
    }

    // Update the game with scores and evaluate picks
    await finalizeGameResult(game.id, scores.homeScore, scores.awayScore);
    
    return { updated: true };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error updating score for game ${gameId}:`, errorMsg);
    return { updated: false, error: errorMsg };
  }
}