import { NextResponse } from 'next/server';
import { query } from '../../../../lib/database';

export async function GET() {
  try {
    console.log('Debug: Checking picks table data...');
    
    // Check total picks
    const totalPicks = await query('SELECT COUNT(*) as count FROM picks');
    console.log('Total picks:', totalPicks[0]);
    
    // Check pick details
    const allPicks = await query('SELECT id, user_id, game_id, submitted FROM picks LIMIT 5');
    console.log('Sample picks:', allPicks);
    
    // Check if users table has data
    const totalUsers = await query('SELECT COUNT(*) as count FROM users');
    console.log('Total users:', totalUsers[0]);
    
    // Check if we can find any user records
    const sampleUsers = await query('SELECT cognito_user_id, name FROM users');
    console.log('All users:', sampleUsers);
    
    // Check if any user matches the pick user IDs
    const pickUserIds = await query('SELECT DISTINCT user_id FROM picks');
    console.log('Pick user IDs:', pickUserIds);
    
    const matchingUsers = await query('SELECT cognito_user_id, name FROM users WHERE cognito_user_id = ANY($1)', [pickUserIds.map((p: { user_id: string }) => p.user_id)]);
    console.log('Matching users:', matchingUsers);
    
    // Check games
    const totalGames = await query('SELECT COUNT(*) as count FROM games');
    console.log('Total games:', totalGames[0]);
    
    return NextResponse.json({
      success: true,
      data: {
        totalPicks: totalPicks[0],
        samplePicks: allPicks,
        totalUsers: totalUsers[0],
        sampleUsers: sampleUsers,
        totalGames: totalGames[0]
      }
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Debug failed'
    }, { status: 500 });
  }
}
