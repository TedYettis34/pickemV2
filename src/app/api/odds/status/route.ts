import { NextResponse } from 'next/server';
import { getLastOddsUpdateTime, oddsNeedUpdate } from '../../../../lib/games';
import { ApiResponse } from '../../../../types/pick';

interface OddsStatusData {
  lastUpdated: string | null;
  needsUpdate: boolean;
  nextUpdateDue: string | null;
  timeSinceUpdate: string | null;
}

export async function GET(): Promise<NextResponse<ApiResponse<OddsStatusData>>> {
  try {
    // Get the last odds update time
    const lastUpdate = await getLastOddsUpdateTime();
    const needsUpdate = await oddsNeedUpdate();
    
    let nextUpdateDue: string | null = null;
    let timeSinceUpdate: string | null = null;
    
    if (lastUpdate) {
      // Calculate next update time (3 hours after last update)
      const nextUpdate = new Date(lastUpdate.getTime() + (3 * 60 * 60 * 1000));
      nextUpdateDue = nextUpdate.toISOString();
      
      // Calculate time since last update
      const now = new Date();
      const diffMs = now.getTime() - lastUpdate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        timeSinceUpdate = `${diffHours}h ${diffMinutes}m ago`;
      } else {
        timeSinceUpdate = `${diffMinutes}m ago`;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        lastUpdated: lastUpdate?.toISOString() || null,
        needsUpdate,
        nextUpdateDue,
        timeSinceUpdate
      }
    });

  } catch (error) {
    console.error('Error getting odds status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get odds status'
    }, { status: 500 });
  }
}