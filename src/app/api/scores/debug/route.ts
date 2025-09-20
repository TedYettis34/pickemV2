import { NextResponse } from 'next/server';
import { getGamesNeedingScoreUpdates } from '../../../../lib/scoreUpdater';
import { query } from '../../../../lib/database';
import { Game } from '../../../../types/game';

export async function GET(): Promise<NextResponse> {
  try {
    console.log('Score update debug requested');
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      currentTime: new Date().toLocaleString(),
      databaseConnection: 'unknown',
      allActiveGames: [] as any[],
      candidateGames: [] as any[],
      gamesNeedingUpdates: [] as any[],
      errors: [] as string[]
    };
    
    // Test database connection
    try {
      await query('SELECT 1');
      debugInfo.databaseConnection = 'success';
    } catch (dbError) {
      debugInfo.databaseConnection = 'failed';
      debugInfo.errors.push(`Database connection failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      return NextResponse.json({ success: false, debug: debugInfo });
    }
    
    // Get all active games (not final)
    try {
      const allActiveGames = await query<Game>(`
        SELECT id, external_id, home_team, away_team, commence_time, 
               home_score, away_score, game_status, sport
        FROM games 
        WHERE game_status != 'final' 
        ORDER BY commence_time ASC
      `);
      
      debugInfo.allActiveGames = allActiveGames.map(game => ({
        id: game.id,
        teams: `${game.away_team} @ ${game.home_team}`,
        commence_time: game.commence_time,
        hoursAgo: ((new Date().getTime() - new Date(game.commence_time).getTime()) / (1000 * 60 * 60)).toFixed(1),
        game_status: game.game_status,
        home_score: game.home_score,
        away_score: game.away_score,
        sport: game.sport
      }));
    } catch (error) {
      debugInfo.errors.push(`Failed to get active games: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Get candidate games (5+ hours ago, no manual scores)
    try {
      const candidateGames = await query<Game>(`
        SELECT id, external_id, home_team, away_team, commence_time, 
               home_score, away_score, game_status, sport
        FROM games 
        WHERE game_status != 'final' 
          AND home_score IS NULL 
          AND away_score IS NULL
          AND commence_time < NOW() - INTERVAL '5 hours'
        ORDER BY commence_time ASC
      `);
      
      debugInfo.candidateGames = candidateGames.map(game => ({
        id: game.id,
        teams: `${game.away_team} @ ${game.home_team}`,
        commence_time: game.commence_time,
        hoursAgo: ((new Date().getTime() - new Date(game.commence_time).getTime()) / (1000 * 60 * 60)).toFixed(1),
        game_status: game.game_status,
        sport: game.sport
      }));
    } catch (error) {
      debugInfo.errors.push(`Failed to get candidate games: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Get games that would be processed by the score updater
    try {
      const gamesNeedingUpdates = await getGamesNeedingScoreUpdates();
      debugInfo.gamesNeedingUpdates = gamesNeedingUpdates.map(game => ({
        id: game.id,
        teams: `${game.away_team} @ ${game.home_team}`,
        commence_time: game.commence_time,
        hoursAgo: ((new Date().getTime() - new Date(game.commence_time).getTime()) / (1000 * 60 * 60)).toFixed(1),
        external_id: game.external_id,
        sport: game.sport
      }));
    } catch (error) {
      debugInfo.errors.push(`Failed to get games needing updates: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return NextResponse.json({
      success: true,
      debug: debugInfo,
      summary: {
        allActiveGames: debugInfo.allActiveGames.length,
        candidateGames: debugInfo.candidateGames.length,
        gamesNeedingUpdates: debugInfo.gamesNeedingUpdates.length,
        errors: debugInfo.errors.length
      }
    });
    
  } catch (error) {
    console.error('Error in score update debug:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to debug score updates',
    }, { status: 500 });
  }
}
