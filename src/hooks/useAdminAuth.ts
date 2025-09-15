import { useState, useEffect, useRef } from 'react';
import { isCurrentUserAdmin, getCurrentAccessToken, authEventEmitter } from '../lib/adminAuth';

let lastAdminCheck = 0;
let cachedAdminStatus: boolean | null = null;
let cachedAccessToken: string | null = null;
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
    cachedAdminStatus = null;
    cachedAccessToken = null;
  };

  const checkAdminStatus = async (forceCheck = false) => {
    const now = Date.now();
    const token = getCurrentAccessToken();
    
    console.log('🔍 Admin Status Check:', {
      forceCheck,
      hasToken: !!token,
      tokenLength: token?.length || 0,
      cachedStatus: cachedAdminStatus,
      cachedToken: cachedAccessToken?.substring(0, 10) + '...',
      timeSinceLastCheck: now - lastAdminCheck,
      minInterval: MIN_CHECK_INTERVAL
    });
    
    // If we have cached status for the same token and it's recent, use it
    if (!forceCheck && 
        cachedAdminStatus !== null && 
        cachedAccessToken === token && 
        (now - lastAdminCheck < MIN_CHECK_INTERVAL)) {
      console.log('✅ Using cached admin status:', cachedAdminStatus);
      setIsAdmin(cachedAdminStatus);
      setAccessToken(token);
      setIsLoading(false);
      return;
    }
    
    // Rate limiting: don't check too frequently unless forced or token changed
    if (!forceCheck && 
        cachedAccessToken === token && 
        (now - lastAdminCheck < MIN_CHECK_INTERVAL)) {
      console.log('⏱️  Admin check rate limited, skipping - but preserving current state');
      // Don't change the admin status if we're rate limited but have a cached value
      if (cachedAdminStatus !== null) {
        setIsAdmin(cachedAdminStatus);
        setAccessToken(token);
      }
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
      setAccessToken(token);
      
      if (token) {
        const adminStatus = await isCurrentUserAdmin();
        setIsAdmin(adminStatus);
        cachedAdminStatus = adminStatus;
        cachedAccessToken = token;
        setAuthError(null); // Clear any previous errors
      } else {
        setIsAdmin(false);
        cachedAdminStatus = false;
        cachedAccessToken = null;
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      cachedAdminStatus = false;
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