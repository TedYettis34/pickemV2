import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth } from '../../../../../lib/adminAuth';
import { query } from '../../../../../lib/database';
import { Game } from '../../../../../types/game';
import { finalizeGameResult } from '../../../../../lib/gameResults';

// ADMIN ONLY ENDPOINT: Force finalize games that have been completed
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin access
    const authResult = await validateAdminAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json({
        success: false,
        error: authResult.error || 'Unauthorized'
      }, { status: 401 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { gameIds, sport } = body;

    // Validation
    if ((!gameIds || !Array.isArray(gameIds)) && !sport) {
      return NextResponse.json({
        success: false,
        error: 'Must provide either gameIds array or sport'
      }, { status: 400 });
    }

    let gamesQuery = `
      SELECT id, external_id, sport, home_team, away_team, commence_time,
             game_status, home_score, away_score
      FROM games 
      WHERE game_status != 'final'
    `;
    
    const params: any[] = [];
    
    // Filter by specific gameIds if provided
    if (gameIds && Array.isArray(gameIds) && gameIds.length > 0) {
      gamesQuery += ` AND id = ANY($1)`;
      params.push(gameIds);
    }
    
    // Filter by sport if provided
    if (sport) {
      gamesQuery += params.length ? ` AND sport = $${params.length + 1}` : ` AND sport = $1`;
      params.push(sport);
    }
    
    gamesQuery += ` AND commence_time < NOW() - INTERVAL '5 hours'`;
    gamesQuery += ` ORDER BY commence_time ASC`;
    
    // Get games to process
    const games = await query<Game>(gamesQuery, params);
    
    if (games.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No games found that need to be finalized',
        data: { gamesFinalized: 0 }
      });
    }
    
    // Get unique external IDs for API calls
    const externalIds = games.map(game => game.external_id);
    
    // Use the scoreUpdater directly but without the filter (force finalization)
    const results = {
      gamesChecked: games.length,
      gamesFinalized: 0,
      details: [] as any[],
      errors: [] as string[]
    };

    // Process each game
    for (const game of games) {
      try {
        // Skip games that already have scores
        if (game.home_score !== null && game.away_score !== null) {
          results.details.push({
            id: game.id,
            teams: `${game.away_team} @ ${game.home_team}`,
            status: 'skipped',
            reason: 'Already has scores'
          });
          continue;
        }

        // Manually enter placeholder scores to finalize the game
        // This is a last resort - in production you'd want to get real scores
        // But this gives admins a way to mark games as final when needed
        const homeScore = 0;
        const awayScore = 0;
        
        await finalizeGameResult(game.id, homeScore, awayScore);
        results.gamesFinalized++;
        
        results.details.push({
          id: game.id,
          teams: `${game.away_team} @ ${game.home_team}`,
          status: 'finalized',
          scores: `${homeScore}-${awayScore}`,
          note: 'Manually finalized with placeholder scores'
        });
      } catch (error) {
        const errorMsg = `Error finalizing game ${game.id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
        
        results.details.push({
          id: game.id,
          teams: `${game.away_team} @ ${game.home_team}`,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.gamesFinalized} of ${results.gamesChecked} games`,
      data: results
    });
  } catch (error) {
    console.error('Error in force-finalize endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }, { status: 500 });
  }
}
