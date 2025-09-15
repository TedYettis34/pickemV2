import { useState, useEffect, useRef } from 'react';
import { isCurrentUserAdmin, getCurrentAccessToken, authEventEmitter } from '../lib/adminAuth';

let lastAdminCheck = 0;
const MIN_CHECK_INTERVAL = 30000; // 30 seconds between checks

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const isCheckingRef = useRef(false);

  const resetAuthState = () => {
    setIsAdmin(false);
    setAccessToken(null);
    setAuthError(null);
  };

  const checkAdminStatus = async (forceCheck = false) => {
    const now = Date.now();
    
    // Rate limiting: don't check too frequently unless forced
    if (!forceCheck && (now - lastAdminCheck < MIN_CHECK_INTERVAL)) {
      console.log('Admin check rate limited, skipping');
      setIsLoading(false);
      return;
    }
    
    // Prevent concurrent checks
    if (isCheckingRef.current) {
      console.log('Admin check already in progress, skipping');
      return;
    }
    
    isCheckingRef.current = true;
    lastAdminCheck = now;
    
    try {
      const token = getCurrentAccessToken();
      setAccessToken(token);
      
      if (token) {
        const adminStatus = await isCurrentUserAdmin();
        setIsAdmin(adminStatus);
        setAuthError(null); // Clear any previous errors
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    checkAdminStatus();

    // Subscribe to auth events
    const unsubscribe = authEventEmitter.subscribe((event) => {
      switch (event.type) {
        case 'token-expired':
          console.log('Token expired, resetting auth state');
          resetAuthState();
          setAuthError(event.message || 'Session expired');
          setIsLoading(false);
          break;
        case 'auth-error':
          console.log('Auth error received:', event.message);
          setAuthError(event.message || 'Authentication error');
          setIsAdmin(false);
          break;
        case 'logout':
          console.log('Logout event received');
          resetAuthState();
          setIsLoading(false);
          break;
      }
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return { isAdmin, isLoading, accessToken, authError, recheckAuth: checkAdminStatus };
}