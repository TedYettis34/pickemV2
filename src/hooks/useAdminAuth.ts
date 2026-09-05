import { useState, useEffect, useCallback } from 'react';
import { subscribeToAuthChanges } from '../lib/firebase/auth';
import { validateAdminAuthClient } from '../lib/adminAuth';

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);

    const unsubscribe = subscribeToAuthChanges(async (user) => {
      setAuthError(null);

      if (!user) {
        setIsAdmin(false);
        setAccessToken(null);
        setIsLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        setAccessToken(token);

        const result = await validateAdminAuthClient(token);
        setIsAdmin(result.isAdmin);
        if (!result.isAdmin && result.error && result.error !== 'User does not have admin privileges') {
          setAuthError(result.error);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setAuthError(error instanceof Error ? error.message : 'Authentication failed');
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const recheckAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const { firebaseAuth } = await import('../lib/firebase/client');
      const user = firebaseAuth.currentUser;

      if (!user) {
        setIsAdmin(false);
        setAccessToken(null);
        return;
      }

      const token = await user.getIdToken(true);
      setAccessToken(token);

      const result = await validateAdminAuthClient(token);
      setIsAdmin(result.isAdmin);
    } catch (error) {
      console.error('Error rechecking admin status:', error);
      setIsAdmin(false);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isAdmin, isLoading, accessToken, authError, recheckAuth };
}
