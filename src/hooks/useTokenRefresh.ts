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
      // Only refresh if token is expiring within 5 minutes AND we have a refresh token
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!accessToken || !refreshToken) {
        // No tokens to refresh
        return;
      }
      
      // Check if token is expiring soon (within 5 minutes)
      if (isCurrentTokenExpiringSoon(300)) {
        console.log('Token expiring soon, attempting refresh...');
        const refreshSuccess = await refreshTokens();
        
        if (refreshSuccess) {
          console.log('✅ Token refreshed successfully');
        } else {
          console.warn('❌ Token refresh failed - user may need to sign in again');
        }
      }
    } catch (error) {
      console.error('Error in token refresh check:', error);
    }
  }, []);

  useEffect(() => {
    // Don't check immediately on mount - wait for normal interval
    // This prevents aggressive refresh on every page load
    
    // Set up interval to check every 10 minutes (less aggressive)
    const interval = setInterval(checkAndRefreshToken, 10 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [checkAndRefreshToken]);

  return { checkAndRefreshToken };
}
