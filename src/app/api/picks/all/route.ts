import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/database';
import { PickWithGame } from '../../../../types/pick';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const weekId = searchParams.get('weekId');
    
    // Base query to fetch all picks with game and user info
    let sql = `
      SELECT 
        p.id,
        p.user_id,
        p.game_id,
        p.pick_type,
        p.spread_value,
        p.submitted,
        p.is_triple_play,
        p.result,
        p.evaluated_at,
        p.created_at,
        p.updated_at,
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
        g.updated_at as game_updated_at,
        u.name as username,
        u.name as display_name,
        w.name as week_name
      FROM picks p
      JOIN games g ON p.game_id = g.id
      LEFT JOIN users u ON p.user_id = u.cognito_user_id
      JOIN weeks w ON g.week_id = w.id
      WHERE p.submitted = true
    `;
    
    const params: (string | number)[] = [];
    
    // Add week filter if specified
    if (weekId) {
      const weekIdNum = parseInt(weekId, 10);
      if (isNaN(weekIdNum)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid week ID'
        }, { status: 400 });
      }
      sql += ` AND g.week_id = $1`;
      params.push(weekIdNum);
    }
    
    // Order by game commence time and user
    sql += ` ORDER BY g.commence_time DESC, u.name ASC`;
    
    console.log('Fetching all user picks with SQL:', sql, 'params:', params);
    
    // Debug: Check if there are any picks at all
    const allPicksCount = await query('SELECT COUNT(*) as count FROM picks');
    console.log('Total picks in database:', allPicksCount[0]);
    
    const submittedPicksCount = await query('SELECT COUNT(*) as count FROM picks WHERE submitted = true');
    console.log('Submitted picks in database:', submittedPicksCount[0]);
    
    const rows = await query(sql, params);
    
    // Transform the rows into PickWithGame objects
    const picksWithGames: (PickWithGame & { username: string; display_name: string | null; week_name: string })[] = (rows as Record<string, unknown>[]).map((row: Record<string, unknown>) => ({
      id: row.id as number,
      user_id: row.user_id as string,
      game_id: row.game_id as number,
      pick_type: row.pick_type as 'home_spread' | 'away_spread',
      spread_value: row.spread_value as number | null,
      submitted: row.submitted as boolean,
      is_triple_play: row.is_triple_play as boolean,
      result: row.result as 'win' | 'loss' | 'push' | null,
      evaluated_at: row.evaluated_at as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      username: (row.username as string) || row.user_id as string,
      display_name: row.display_name as string | null,
      week_name: row.week_name as string,
      game: {
        id: row.game_id as number,
        week_id: row.week_id as number,
        sport: row.sport as 'americanfootball_nfl' | 'americanfootball_ncaaf',
        external_id: row.external_id as string,
        home_team: row.home_team as string,
        away_team: row.away_team as string,
        commence_time: row.commence_time as string,
        spread_home: row.spread_home as number | undefined,
        spread_away: row.spread_away as number | undefined,
        total_over_under: row.total_over_under as number | undefined,
        moneyline_home: row.moneyline_home as number | undefined,
        moneyline_away: row.moneyline_away as number | undefined,
        bookmaker: row.bookmaker as string | undefined,
        odds_last_updated: row.odds_last_updated as string | undefined,
        must_pick: row.must_pick as boolean,
        home_score: row.home_score as number | null | undefined,
        away_score: row.away_score as number | null | undefined,
        game_status: row.game_status as 'scheduled' | 'in_progress' | 'final' | 'cancelled' | 'postponed',
        created_at: row.game_created_at as string,
        updated_at: row.game_updated_at as string
      }
    }));
    
    console.log(`Found ${picksWithGames.length} submitted picks`);
    
    return NextResponse.json({
      success: true,
      data: picksWithGames
    });
    
  } catch (error) {
    console.error('Error fetching all picks:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch picks'
    }, { status: 500 });
  }
}