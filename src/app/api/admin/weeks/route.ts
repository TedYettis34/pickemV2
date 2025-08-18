import { NextRequest, NextResponse } from 'next/server';
import { WeekRepository, WeekValidator } from '../../../../lib/weeks';
import { requireAdmin } from '../../../../lib/adminAuth';
import { CreateWeekInput, WeekFilters, ApiResponse, Week } from '../../../../types/week';

// GET /api/admin/weeks - Get all weeks with optional filtering
export async function GET(req: NextRequest) {
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

    // Parse query parameters for filtering
    const { searchParams } = new URL(req.url);
    const filters: WeekFilters = {};

    if (searchParams.get('name')) {
      filters.name = searchParams.get('name')!;
    }
    if (searchParams.get('start_date_from')) {
      filters.start_date_from = searchParams.get('start_date_from')!;
    }
    if (searchParams.get('start_date_to')) {
      filters.start_date_to = searchParams.get('start_date_to')!;
    }
    if (searchParams.get('end_date_from')) {
      filters.end_date_from = searchParams.get('end_date_from')!;
    }
    if (searchParams.get('end_date_to')) {
      filters.end_date_to = searchParams.get('end_date_to')!;
    }
    if (searchParams.get('active_on')) {
      filters.active_on = searchParams.get('active_on')!;
    }

    const weeks = await WeekRepository.findAll(filters);

    const response: ApiResponse<Week[]> = {
      success: true,
      data: weeks,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching weeks:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    const response: ApiResponse<never> = {
      success: false,
      error: `Failed to fetch weeks: ${error instanceof Error ? error.message : String(error)}`,
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/admin/weeks - Create a new week
export async function POST(req: NextRequest) {
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

    // Parse request body
    const body = await req.json();
    const weekData: CreateWeekInput = {
      name: body?.name || '',
      start_date: body?.start_date || '',
      end_date: body?.end_date || '',
      description: body?.description,
    };

    // Validate input
    const validationErrors = WeekValidator.validateCreateInput(weekData);
    if (validationErrors && validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: validationErrors.join(', '),
        },
        { status: 400 }
      );
    }

    // Check if name already exists
    const existingWeek = await WeekRepository.findByName(weekData.name);
    if (existingWeek) {
      return NextResponse.json(
        {
          success: false,
          error: 'Week name already exists',
        },
        { status: 409 }
      );
    }

    // Check for date conflicts
    const conflictingWeek = await WeekRepository.hasDateConflict(
      weekData.start_date,
      weekData.end_date
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

    // Create the week
    const newWeek = await WeekRepository.create(weekData);

    const response: ApiResponse<Week> = {
      success: true,
      data: newWeek,
      message: 'Week created successfully',
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Error creating week:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to create week',
    };
    return NextResponse.json(response, { status: 500 });
  }
}