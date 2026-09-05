import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth } from '../../../../lib/adminAuth.server';

export async function GET(request: NextRequest) {
  const result = await validateAdminAuth(request);

  if (!result.isValid) {
    return NextResponse.json({ error: result.error || 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    isAdmin: true,
    user: result.user,
  });
}
