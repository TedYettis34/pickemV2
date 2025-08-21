import { NextResponse } from 'next/server';
import { updateScoresFromApi } from '../../../../lib/scoreUpdater';

export async function POST(): Promise<NextResponse> {
  try {
    console.log('Score update requested');
    
    const result = await updateScoresFromApi();
    
    return NextResponse.json({
      success: true,
      data: result,
      message: `Score update complete: ${result.gamesUpdated}/${result.gamesChecked} games updated`
    });
    
  } catch (error) {
    console.error('Error in score update API:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update scores',
    }, { status: 500 });
  }
}

// Allow GET requests for easier testing
export async function GET(): Promise<NextResponse> {
  try {
    console.log('Score update requested');
    
    const result = await updateScoresFromApi();
    
    return NextResponse.json({
      success: true,
      data: result,
      message: `Score update complete: ${result.gamesUpdated}/${result.gamesChecked} games updated`
    });
    
  } catch (error) {
    console.error('Error in score update API:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update scores',
    }, { status: 500 });
  }
}