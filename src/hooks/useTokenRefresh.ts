import { useEffect, useCallback } from 'react';
import { isCurrentTokenExpiringSoon } from '../lib/userAuth';
import { refreshTokens } from '../lib/auth';

/**
 * Hook to automatically handle token refresh
 * Checks token expiration and refreshes when needed
 */
export function useTokenRefresh() {
  const checkAndRefreshToken = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      // Check if token is expiring soon (within 5 minutes)
      if (isCurrentTokenExpiringSoon(300)) {
        const refreshSuccess = await refreshTokens();
        
        if (refreshSuccess) {
          console.log('Token refreshed successfully');
        } else {
          console.warn('Token refresh failed');
        }
      }
    } catch (error) {
      console.error('Error in token refresh check:', error);
    }
  }, []);

  useEffect(() => {
    // Check immediately on mount
    checkAndRefreshToken();

    // Set up interval to check every 4 minutes
    const interval = setInterval(checkAndRefreshToken, 4 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [checkAndRefreshToken]);

  return { checkAndRefreshToken };
}