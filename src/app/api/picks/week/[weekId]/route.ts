import { NextRequest, NextResponse } from 'next/server';
import { getUserPicksForWeek, getPicksSummaryForWeek } from '../../../../../lib/picks';
import { ApiResponse } from '../../../../../types/pick';
import { withOddsUpdate } from '../../../../../lib/oddsUpdater';

/**
 * Get user picks for a specific week
 * Query parameter 'summary=true' returns picks summary instead of raw picks
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const { weekId } = await params;
    const weekIdNum = parseInt(weekId);
    
    if (isNaN(weekIdNum) || weekIdNum <= 0) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid week ID',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get user ID from authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Authorization header required',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // TODO: Validate the JWT token and extract user ID
    // For now, we'll extract from a custom header (this will be implemented in auth task)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'User ID required',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get auth token for odds update
    const authToken = authHeader.substring(7);

    // Check if summary is requested
    const url = new URL(request.url);
    const isSummary = url.searchParams.get('summary') === 'true';

    if (isSummary) {
      // Return picks summary with odds update check
      const picksSummary = await withOddsUpdate(authToken, async () => {
        return await getPicksSummaryForWeek(userId, weekIdNum);
      });
      
      const response: ApiResponse<typeof picksSummary> = {
        success: true,
        data: picksSummary,
      };

      return NextResponse.json(response);
    } else {
      // Return raw picks with game data with odds update check
      const userPicks = await withOddsUpdate(authToken, async () => {
        return await getUserPicksForWeek(userId, weekIdNum);
      });
      
      const response: ApiResponse<typeof userPicks> = {
        success: true,
        data: userPicks,
      };

      return NextResponse.json(response);
    }

  } catch (error) {
    const isSummary = new URL(request.url).searchParams.get('summary') === 'true';
    console.error(isSummary ? 'Error fetching picks summary for week:' : 'Error fetching user picks for week:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: isSummary ? 'Failed to fetch picks summary' : 'Failed to fetch picks',
    };
    return NextResponse.json(response, { status: 500 });
  }
}