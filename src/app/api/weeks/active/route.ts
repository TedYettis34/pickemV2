import { NextResponse } from 'next/server';
import { Week, ApiResponse } from '../../../../types/week';
import { getActiveWeek } from '../../../../lib/weeks';

export async function GET() {
  try {
    const activeWeek = await getActiveWeek();
    
    if (!activeWeek) {
      const response: ApiResponse<null> = {
        success: true,
        data: null,
        message: 'No active week found'
      };
      return NextResponse.json(response);
    }

    const response: ApiResponse<Week> = {
      success: true,
      data: activeWeek,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching active week:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch active week',
    };
    return NextResponse.json(response, { status: 500 });
  }
}