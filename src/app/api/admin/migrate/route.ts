import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/database';
import { migrations, sampleData } from '../../../../lib/migrations';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Simple security check - you can make this more robust
    const { password } = await request.json();
    
    // Use a simple password for now - you can change this
    if (password !== 'migrate-pickem-2024') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    console.log('Starting database migrations...');
    const results = [];

    // Run each migration in order
    for (const migration of migrations) {
      try {
        console.log(`Running migration: ${migration.id}`);
        
        await query(migration.sql, []);
        
        results.push({
          id: migration.id,
          status: 'success',
          message: `Successfully ran migration: ${migration.id}`
        });
        
        console.log(`✅ Successfully ran: ${migration.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to run migration ${migration.id}:`, errorMessage);
        
        results.push({
          id: migration.id,
          status: 'error',
          message: `Failed to run migration: ${migration.id}`,
          error: errorMessage
        });
        
        // Continue with other migrations even if one fails (in case it's already applied)
      }
    }

    // Run sample data
    try {
      console.log('Running sample data...');
      await query(sampleData.sql, []);
      
      results.push({
        id: sampleData.id,
        status: 'success',
        message: 'Successfully loaded sample data'
      });
      
      console.log('✅ Successfully loaded sample data');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to load sample data:', errorMessage);
      
      results.push({
        id: sampleData.id,
        status: 'error',
        message: 'Failed to load sample data',
        error: errorMessage
      });
    }

    // Check what tables were created
    try {
      const tables = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `, []);
      
      results.push({
        id: 'table_verification',
        status: 'info',
        message: 'Database tables created',
        data: tables
      });
    } catch (error) {
      console.error('Failed to verify tables:', error);
    }

    console.log('🎉 Database migrations completed!');

    return NextResponse.json({
      success: true,
      message: 'Database migrations completed',
      results
    });

  } catch (error) {
    console.error('Migration process failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Migration process failed'
    }, { status: 500 });
  }
}

// GET endpoint to check migration status
export async function GET(): Promise<NextResponse> {
  try {
    // Check if tables exist
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `, []);

    const tableNames = (tables as Record<string, unknown>[]).map((row: Record<string, unknown>) => row.table_name as string);
    
    const expectedTables = ['weeks', 'users', 'games', 'picks'];
    const missingTables = expectedTables.filter(table => !tableNames.includes(table));
    
    return NextResponse.json({
      success: true,
      tablesExist: tableNames,
      missingTables,
      migrationNeeded: missingTables.length > 0
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check migration status'
    }, { status: 500 });
  }
}