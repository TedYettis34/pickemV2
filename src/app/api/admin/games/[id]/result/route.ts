import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '../../../../../../types/pick';
import { Game } from '../../../../../../types/game';
import { finalizeGameResult, reevaluateGamePicks } from '../../../../../../lib/gameResults';
import { GamePickEvaluation } from '../../../../../../lib/pickEvaluation';
import { validateAdminAuth } from '../../../../../../lib/adminAuth';

interface UpdateGameResultRequest {
  homeScore: number;
  awayScore: number;
  gameStatus?: 'final' | 'cancelled';
}

interface GameResultResponse {
  game: Game;
  pickEvaluations: GamePickEvaluation[];
  picksUpdated: number;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Validate admin authentication
    const authResult = await validateAdminAuth(request);
    if (!authResult.isValid) {
      const response: ApiResponse<never> = {
        success: false,
        error: authResult.error || 'Unauthorized',
      };
      return NextResponse.json(response, { status: 401 });
    }

    const resolvedParams = await params;
    const gameId = parseInt(resolvedParams.id);
    if (isNaN(gameId)) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid game ID',
      };
      return NextResponse.json(response, { status: 400 });
    }

    const body: UpdateGameResultRequest = await request.json();
    
    // Validate required fields
    if (typeof body.homeScore !== 'number' || typeof body.awayScore !== 'number') {
      const response: ApiResponse<never> = {
        success: false,
        error: 'homeScore and awayScore are required and must be numbers',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate scores are non-negative integers
    if (body.homeScore < 0 || body.awayScore < 0 || !Number.isInteger(body.homeScore) || !Number.isInteger(body.awayScore)) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Scores must be non-negative integers',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Update game result and evaluate picks
    const result = await finalizeGameResult(gameId, body.homeScore, body.awayScore);

    const response: ApiResponse<GameResultResponse> = {
      success: true,
      data: result,
      message: `Game result updated successfully. ${result.picksUpdated} picks evaluated.`
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating game result:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to update game result',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Validate admin authentication
    const authResult = await validateAdminAuth(request);
    if (!authResult.isValid) {
      const response: ApiResponse<never> = {
        success: false,
        error: authResult.error || 'Unauthorized',
      };
      return NextResponse.json(response, { status: 401 });
    }

    const resolvedParams = await params;
    const gameId = parseInt(resolvedParams.id);
    if (isNaN(gameId)) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid game ID',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Re-evaluate picks for this game
    const pickEvaluations = await reevaluateGamePicks(gameId);

    const response: ApiResponse<{ pickEvaluations: GamePickEvaluation[]; picksUpdated: number }> = {
      success: true,
      data: {
        pickEvaluations,
        picksUpdated: pickEvaluations.length
      },
      message: `${pickEvaluations.length} picks re-evaluated successfully.`
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error re-evaluating game picks:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to re-evaluate picks',
    };
    return NextResponse.json(response, { status: 500 });
  }
}