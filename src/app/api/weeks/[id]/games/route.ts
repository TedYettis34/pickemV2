import { NextRequest, NextResponse } from 'next/server';
import { Game } from '../../../../../types/game';
import { ApiResponse } from '../../../../../types/week';
import { getGamesByWeekId } from '../../../../../lib/games';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const weekId = parseInt(id);
    
    if (isNaN(weekId) || weekId <= 0) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid week ID',
      };
      return NextResponse.json(response, { status: 400 });
    }

    const games = await getGamesByWeekId(weekId);

    const response: ApiResponse<Game[]> = {
      success: true,
      data: games,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching games for week:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch games',
    };
    return NextResponse.json(response, { status: 500 });
  }
}