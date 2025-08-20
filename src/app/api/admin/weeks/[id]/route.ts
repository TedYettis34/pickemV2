import { NextRequest, NextResponse } from 'next/server';
import { WeekRepository, WeekValidator } from '../../../../../lib/weeks';
import { requireAdmin } from '../../../../../lib/adminAuth';
import { UpdateWeekInput, ApiResponse, Week } from '../../../../../types/week';
import { getGamesByWeekId } from '../../../../../lib/games';

// GET /api/admin/weeks/[id] - Get a specific week by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authorization
    const adminCheck = await requireAdmin();
    const authResult = await adminCheck(req);
    
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const weekId = parseInt(resolvedParams.id);
    if (isNaN(weekId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid week ID' },
        { status: 400 }
      );
    }

    const week = await WeekRepository.findById(weekId);
    if (!week) {
      return NextResponse.json(
        { success: false, error: 'Week not found' },
        { status: 404 }
      );
    }

    const response: ApiResponse<Week> = {
      success: true,
      data: week,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching week:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch week',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/admin/weeks/[id] - Update a specific week
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authorization
    const adminCheck = await requireAdmin();
    const authResult = await adminCheck(req);
    
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const weekId = parseInt(resolvedParams.id);
    if (isNaN(weekId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid week ID' },
        { status: 400 }
      );
    }

    // Check if week exists
    const existingWeek = await WeekRepository.findById(weekId);
    if (!existingWeek) {
      return NextResponse.json(
        { success: false, error: 'Week not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await req.json();
    const updateData: UpdateWeekInput = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.start_date !== undefined) updateData.start_date = body.start_date;
    if (body.end_date !== undefined) updateData.end_date = body.end_date;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.max_picker_choice_games !== undefined) updateData.max_picker_choice_games = body.max_picker_choice_games;

    // Validate input
    const validationErrors = WeekValidator.validateUpdateInput(updateData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: validationErrors.join(', '),
        },
        { status: 400 }
      );
    }

    // Check if name already exists (excluding current week)
    if (updateData.name) {
      const nameExists = await WeekRepository.isNameTaken(updateData.name, weekId);
      if (nameExists) {
        return NextResponse.json(
          {
            success: false,
            error: 'Week name already exists',
          },
          { status: 409 }
        );
      }
    }

    // Check for date conflicts (if dates are being updated)
    if (updateData.start_date || updateData.end_date) {
      const startDate = updateData.start_date || existingWeek.start_date;
      const endDate = updateData.end_date || existingWeek.end_date;
      
      const conflictingWeek = await WeekRepository.hasDateConflict(
        startDate,
        endDate,
        weekId
      );
      
      if (conflictingWeek) {
        return NextResponse.json(
          {
            success: false,
            error: `Date range conflicts with existing week: ${conflictingWeek.name}`,
          },
          { status: 409 }
        );
      }
    }

    // Update the week
    const updatedWeek = await WeekRepository.update(weekId, updateData);
    if (!updatedWeek) {
      return NextResponse.json(
        { success: false, error: 'Failed to update week' },
        { status: 500 }
      );
    }

    const response: ApiResponse<Week> = {
      success: true,
      data: updatedWeek,
      message: 'Week updated successfully',
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error updating week:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to update week',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/admin/weeks/[id] - Delete a specific week
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authorization
    const adminCheck = await requireAdmin();
    const authResult = await adminCheck(req);
    
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const weekId = parseInt(resolvedParams.id);
    if (isNaN(weekId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid week ID' },
        { status: 400 }
      );
    }

    // Check if week exists
    const existingWeek = await WeekRepository.findById(weekId);
    if (!existingWeek) {
      return NextResponse.json(
        { success: false, error: 'Week not found' },
        { status: 404 }
      );
    }

    // Get count of games that will be deleted
    const existingGames = await getGamesByWeekId(weekId);
    const gamesCount = existingGames.length;

    // Delete the week (and associated games)
    const deleted = await WeekRepository.delete(weekId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete week' },
        { status: 500 }
      );
    }

    const response: ApiResponse<never> = {
      success: true,
      message: `Week "${existingWeek.name}" and ${gamesCount} associated games deleted successfully`,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error deleting week:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to delete week',
    };
    return NextResponse.json(response, { status: 500 });
  }
}