import { oddsNeedUpdate } from './games';

/**
 * Utility to trigger odds update if needed
 * This should be called when users access the games/picks pages
 */
export async function ensureOddsAreCurrent(authToken: string): Promise<boolean> {
  try {
    // Check if odds need updating
    const needsUpdate = await oddsNeedUpdate();
    
    if (!needsUpdate) {
      console.log('Odds are current, no update needed');
      return false;
    }

    console.log('Odds are stale (>3 hours old), triggering update...');
    
    // Trigger odds update
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    const response = await fetch(`${baseUrl}/api/admin/odds/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      console.error('Failed to update odds:', response.status, response.statusText);
      return false;
    }

    const result = await response.json();
    console.log('Odds update completed:', result.summary);
    return true;

  } catch (error) {
    console.error('Error ensuring odds are current:', error);
    // Don't throw - we don't want to break the user experience if odds update fails
    return false;
  }
}

/**
 * Middleware-style function to check and update odds if needed
 * Can be used in API routes or server components
 */
export async function withOddsUpdate<T>(
  authToken: string,
  operation: () => Promise<T>
): Promise<T> {
  // Trigger odds update in background (don't wait for it)
  ensureOddsAreCurrent(authToken).catch(error => {
    console.error('Background odds update failed:', error);
  });
  
  // Continue with the original operation
  return await operation();
}