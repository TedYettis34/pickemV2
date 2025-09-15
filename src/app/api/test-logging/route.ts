import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🔥 TEST LOGGING ENDPOINT HIT!');
  console.log('🔥 This should appear in your server terminal');
  console.log('🔥 Current time:', new Date().toISOString());
  
  return NextResponse.json({ 
    message: 'Test logging endpoint works',
    timestamp: new Date().toISOString()
  });
}
