import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/adminAuth';
import { WeekRepository } from '../../../../../../lib/weeks';
import { deleteGamesByWeekId } from '../../../../../../lib/games';
import { ApiResponse } from '../../../../../../types/week';
import { Week } from '../../../../../../types/week';

// POST /api/admin/weeks/[id]/unlock - Unlock a week and delete its games
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authorization
    const adminCheck = await requireAdmin();
    const authResult = await adminCheck(request);
    
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const weekId = parseInt(id);
    if (isNaN(weekId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid week ID' },
        { status: 400 }
      );
    }

    // Check if week exists
    const week = await WeekRepository.findById(weekId);
    if (!week) {
      return NextResponse.json(
        { success: false, error: 'Week not found' },
        { status: 404 }
      );
    }

    if (!week.is_locked) {
      return NextResponse.json(
        { success: false, error: 'Week is not locked' },
        { status: 400 }
      );
    }

    // Delete all games for this week
    await deleteGamesByWeekId(weekId);

    // Unlock the week
    const unlockedWeek = await WeekRepository.unlockWeek(weekId);

    const response: ApiResponse<Week> = {
      success: true,
      data: unlockedWeek!,
      message: 'Week unlocked and games removed'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error unlocking week:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to unlock week',
    };
    return NextResponse.json(response, { status: 500 });
  }
}