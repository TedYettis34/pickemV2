import { NextRequest, NextResponse } from 'next/server';
import { submitPicksForWeek, hasSubmittedPicksForWeek } from '../../../../lib/picks';
import { ApiResponse } from '../../../../types/pick';

/**
 * Submit all picks for a week
 */
export async function POST(request: NextRequest) {
  try {
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

    let body;
    try {
      body = await request.json();
    } catch {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid request body',
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { weekId } = body;

    // Validate required fields
    if (!weekId) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Week ID is required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    const weekIdNum = parseInt(weekId);
    if (isNaN(weekIdNum) || weekIdNum <= 0) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid week ID',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if picks have already been submitted
    const alreadySubmitted = await hasSubmittedPicksForWeek(userId, weekIdNum);
    if (alreadySubmitted) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Picks have already been submitted for this week',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Submit all picks for the week
    const submittedPicks = await submitPicksForWeek(userId, weekIdNum);

    const response: ApiResponse<typeof submittedPicks> = {
      success: true,
      data: submittedPicks,
      message: 'Picks submitted successfully',
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error submitting picks:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to submit picks',
    };
    return NextResponse.json(response, { status: 500 });
  }
}