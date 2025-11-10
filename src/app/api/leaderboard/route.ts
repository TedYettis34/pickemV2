import { NextResponse } from 'next/server';
import { query } from '../../../lib/database';

export interface LeaderboardEntry {
  userId: string;
  name: string;
  email: string;
  totalWins: number;
  totalLosses: number;
  totalPushes: number;
  winPercentage: number;
  gamesBack: number;
  rank: number;
}

export async function GET() {
  try {
    // Get all users with their pick results, calculating triple play scoring
    const sql = `
      WITH user_stats AS (
        SELECT 
          u.cognito_user_id as user_id,
          u.name,
          u.email,
          -- Calculate wins: regular wins (1 point) + triple play wins (3 points)
          COALESCE(SUM(
            CASE 
              WHEN p.result = 'win' AND COALESCE(p.is_triple_play, false) = true THEN 3
              WHEN p.result = 'win' THEN 1
              ELSE 0
            END
          ), 0) as total_wins,
          -- Calculate losses: regular losses (1 point) + triple play losses (3 points)
          COALESCE(SUM(
            CASE 
              WHEN p.result = 'loss' AND COALESCE(p.is_triple_play, false) = true THEN 3
              WHEN p.result = 'loss' THEN 1
              ELSE 0
            END
          ), 0) as total_losses,
          -- Pushes don't count toward record but track for completeness
          COALESCE(SUM(
            CASE 
              WHEN p.result = 'push' AND COALESCE(p.is_triple_play, false) = true THEN 3
              WHEN p.result = 'push' THEN 1
              ELSE 0
            END
          ), 0) as total_pushes
        FROM users u
        LEFT JOIN picks p ON u.cognito_user_id = p.user_id 
          AND p.result IS NOT NULL -- Only include evaluated picks
          AND p.submitted = true -- Only include submitted picks
        GROUP BY u.cognito_user_id, u.name, u.email
      ),
      ranked_users AS (
        SELECT 
          *,
          -- Calculate win percentage (pushes don't count in denominator)
          CASE 
            WHEN (total_wins + total_losses) = 0 THEN 0.0
            ELSE ROUND((total_wins::decimal / (total_wins + total_losses) * 100), 1)
          END as win_percentage,
          -- Rank by win percentage, then by total wins as tiebreaker
          RANK() OVER (
            ORDER BY 
              CASE 
                WHEN (total_wins + total_losses) = 0 THEN 0.0
                ELSE (total_wins::decimal / (total_wins + total_losses))
              END DESC,
              total_wins DESC
          ) as rank
        FROM user_stats
      ),
      leader_record AS (
        SELECT MAX(total_wins - total_losses) as leader_differential
        FROM ranked_users
        WHERE rank = 1
      )
      SELECT 
        ru.*,
        -- Calculate games back from the leader
        CASE 
          WHEN ru.rank = 1 THEN 0.0
          ELSE COALESCE(((SELECT leader_differential FROM leader_record) - (ru.total_wins - ru.total_losses)) / 2.0, 0.0)
        END as games_back
      FROM ranked_users ru
      ORDER BY ru.rank ASC, ru.total_wins DESC;
    `;

    const result = await query(sql, []);
    
    const leaderboard: LeaderboardEntry[] = (result as Record<string, unknown>[]).map(row => ({
      userId: row.user_id as string,
      name: (row.name as string) || 'Unknown User',
      email: row.email as string,
      totalWins: parseInt(row.total_wins as string),
      totalLosses: parseInt(row.total_losses as string),
      totalPushes: parseInt(row.total_pushes as string),
      winPercentage: parseFloat(row.win_percentage as string),
      gamesBack: Math.max(0, parseFloat((row.games_back as string) || '0')),
      rank: parseInt(row.rank as string)
    }));

    return NextResponse.json(leaderboard);
    
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to fetch leaderboard data',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}