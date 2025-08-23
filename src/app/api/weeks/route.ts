import { NextResponse } from 'next/server';
import { WeekRepository } from '../../../lib/weeks';
import { ApiResponse, Week } from '../../../types/week';

// GET /api/weeks - Get all weeks (public endpoint)
export async function GET() {
  try {
    // Get all weeks without any admin restrictions
    // This is safe because weeks are public information needed for browsing picks
    const weeks = await WeekRepository.findAll({});
    
    const response: ApiResponse<Week[]> = {
      success: true,
      data: weeks,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching weeks:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch weeks',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
