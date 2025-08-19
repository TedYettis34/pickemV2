import { NextRequest, NextResponse } from 'next/server';
import { getActiveWeek } from '../../../../../lib/weeks';
import { getGamesByWeekId, updateGameOdds } from '../../../../../lib/games';
import { oddsApiService } from '../../../../../lib/oddsApi';

export async function POST(request: NextRequest) {
  try {
    // Check authorization - accept either admin token or user auth for on-demand updates
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Authorization header required'
      }, { status: 401 });
    }

    // For manual admin updates, check admin token
    // For user-triggered updates, we'll accept any valid auth header
    const token = authHeader.substring(7);
    const adminToken = process.env.ADMIN_TOKEN;
    
    // If it's not an admin token, just verify user has some auth
    const isAdminUpdate = adminToken && token === adminToken;
    if (!isAdminUpdate && !token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log('Starting odds update process...');

    // Get the active week
    const activeWeek = await getActiveWeek();
    if (!activeWeek) {
      console.log('No active week found');
      return NextResponse.json({
        success: true,
        message: 'No active week found - no odds to update',
        summary: {
          activeWeeks: 0,
          totalGamesUpdated: 0,
          weekDetails: []
        }
      });
    }

    console.log(`Found active week: ${activeWeek.name}`);

    let totalUpdated = 0;
    const updateSummary = [];

    const week = activeWeek;
    console.log(`Processing week ${week.id}: ${week.name}`);
    
    // Get existing games for this week
    const existingGames = await getGamesByWeekId(week.id);
    console.log(`Found ${existingGames.length} games for week ${week.id}`);

    if (existingGames.length === 0) {
      console.log(`No games found for week ${week.id}`);
      return NextResponse.json({
        success: true,
        message: 'No games found in active week - no odds to update',
        summary: {
          activeWeeks: 1,
          totalGamesUpdated: 0,
          weekDetails: [{
            weekId: week.id,
            weekName: week.name,
            gamesProcessed: 0,
            gamesUpdated: 0
          }]
        }
      });
    }

    // Fetch latest odds from API for the week's date range
    const weekStartDate = new Date(week.start_date);
    const weekEndDate = new Date(week.end_date);
    
    // Add some buffer to ensure we catch all games
    const fetchStartDate = new Date(weekStartDate.getTime() - 24 * 60 * 60 * 1000);
    const fetchEndDate = new Date(weekEndDate.getTime() + 24 * 60 * 60 * 1000);

    try {
      const latestOdds = await oddsApiService.getAllFootballGames(
        fetchStartDate.toISOString(),
        fetchEndDate.toISOString()
      );

      // Combine all games
      const allLatestGames = [...latestOdds.nfl, ...latestOdds.college];
      console.log(`Fetched ${allLatestGames.length} games from odds API for week ${week.id}`);

      let weekUpdated = 0;

      // Update odds for each existing game
      for (const existingGame of existingGames) {
        // Find matching game in latest odds by external_id
        const latestGame = allLatestGames.find(g => g.id === existingGame.external_id);
        
        if (!latestGame) {
          console.log(`No matching game found for external_id: ${existingGame.external_id}`);
          continue;
        }

        // Transform latest odds to our format
        const transformedGame = oddsApiService.transformToGameData(latestGame, week.id);
        
        // Check if odds have actually changed
        const hasChanged = 
          existingGame.spread_home !== transformedGame.spread_home ||
          existingGame.spread_away !== transformedGame.spread_away ||
          existingGame.total_over_under !== transformedGame.total_over_under ||
          existingGame.moneyline_home !== transformedGame.moneyline_home ||
          existingGame.moneyline_away !== transformedGame.moneyline_away;

        if (hasChanged) {
          console.log(`Updating odds for game: ${existingGame.away_team} @ ${existingGame.home_team}`);
          console.log(`Old spread: ${existingGame.spread_home}, New spread: ${transformedGame.spread_home}`);
          
          await updateGameOdds(existingGame.id, {
            spread_home: transformedGame.spread_home,
            spread_away: transformedGame.spread_away,
            total_over_under: transformedGame.total_over_under,
            moneyline_home: transformedGame.moneyline_home,
            moneyline_away: transformedGame.moneyline_away,
            bookmaker: transformedGame.bookmaker,
            odds_last_updated: transformedGame.odds_last_updated
          });
          
          weekUpdated++;
        } else {
          console.log(`No changes for game: ${existingGame.away_team} @ ${existingGame.home_team}`);
        }
      }

      updateSummary.push({
        weekId: week.id,
        weekName: week.name,
        gamesProcessed: existingGames.length,
        gamesUpdated: weekUpdated
      });

      totalUpdated += weekUpdated;
      console.log(`Updated ${weekUpdated} games for week ${week.id}`);

    } catch (error) {
      console.error(`Error fetching odds for week ${week.id}:`, error);
      updateSummary.push({
        weekId: week.id,
        weekName: week.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    console.log(`Odds update complete. Total games updated: ${totalUpdated}`);

    return NextResponse.json({
      success: true,
      message: 'Odds update completed',
      summary: {
        activeWeeks: 1,
        totalGamesUpdated: totalUpdated,
        weekDetails: updateSummary
      }
    });

  } catch (error) {
    console.error('Error during odds update:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update odds'
    }, { status: 500 });
  }
}