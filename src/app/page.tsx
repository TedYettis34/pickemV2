'use client';

import { useState, useEffect } from 'react';
import AdminDashboard from '../components/admin/AdminDashboard';
import { UserDashboard } from '../components/user/UserDashboard';
import { isAuthenticated, logout } from '../lib/auth';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { authEventEmitter } from '../lib/adminAuth';

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const { isAdmin, isLoading: adminLoading } = useAdminAuth();

  useEffect(() => {
    setAuthenticated(isAuthenticated());
    setLoading(false);
    
    // Subscribe to auth events
    const unsubscribe = authEventEmitter.subscribe((event) => {
      switch (event.type) {
        case 'token-expired':
          console.log('Main page: Token expired, forcing re-authentication');
          setAuthenticated(false);
          setShowAdminDashboard(false);
          setAuthMessage(event.message || 'Your session has expired. Please log in again.');
          break;
        case 'auth-error':
          console.log('Main page: Auth error received');
          setAuthMessage(event.message || 'Authentication error occurred.');
          break;
        case 'logout':
          console.log('Main page: Logout event received');
          setAuthenticated(false);
          setShowAdminDashboard(false);
          setAuthMessage(null);
          break;
      }
    });

    return unsubscribe;
  }, []);

  const handleSignOut = () => {
    logout();
    setAuthenticated(false);
    setShowAdminDashboard(false);
    setAuthMessage(null);
    // Emit logout event
    authEventEmitter.emit({ type: 'logout' });
  };

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // If user chose to view admin dashboard (only available for authenticated admins)
  if (showAdminDashboard && isAdmin && authenticated) {
    return <AdminDashboard onBackToDashboard={() => setShowAdminDashboard(false)} />;
  }

  // Regular user dashboard (available for both authenticated and unauthenticated users)
  return (
    <UserDashboard
      onSignOut={handleSignOut}
      isAdmin={isAdmin}
      onShowAdminPanel={() => setShowAdminDashboard(true)}
      isAuthenticated={authenticated}
      authMessage={authMessage}
    />
  );
}
