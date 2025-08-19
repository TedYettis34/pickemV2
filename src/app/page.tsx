'use client';

import { useState, useEffect } from 'react';
import AuthForm from '../components/auth/AuthForm';
import AdminDashboard from '../components/admin/AdminDashboard';
import { UserDashboard } from '../components/user/UserDashboard';
import { isAuthenticated, signOut } from '../lib/auth';
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

  const handleAuthSuccess = () => {
    setAuthenticated(true);
    setAuthMessage(null); // Clear any auth messages on successful login
  };

  const handleSignOut = () => {
    signOut();
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

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Welcome to PickEm
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Make your predictions and compete with friends in the ultimate pick&apos;em experience.
            </p>
            <div className="space-y-4 text-lg text-gray-500 dark:text-gray-400">
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Create and join leagues
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Track your predictions
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Compete for the top spot
              </div>
            </div>
          </div>
          <div className="flex-1 w-full max-w-md">
            {authMessage && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-sm text-yellow-800 text-center">
                  {authMessage}
                </div>
              </div>
            )}
            <AuthForm onAuthSuccess={handleAuthSuccess} />
          </div>
        </div>
      </div>
    );
  }

  // If user chose to view admin dashboard
  if (showAdminDashboard && isAdmin) {
    return <AdminDashboard onBackToDashboard={() => setShowAdminDashboard(false)} />;
  }

  // Regular user dashboard
  return (
    <UserDashboard 
      onSignOut={handleSignOut}
      isAdmin={isAdmin}
      onShowAdminPanel={() => setShowAdminDashboard(true)}
    />
  );
}
