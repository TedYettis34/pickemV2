'use client';

import { useState, useEffect } from 'react';
import AdminDashboard from '../components/admin/AdminDashboard';
import { UserDashboard } from '../components/user/UserDashboard';
import { logout } from '../lib/auth';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { subscribeToAuthChanges } from '../lib/firebase/auth';

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const { isAdmin, isLoading: adminLoading } = useAdminAuth();

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      setAuthenticated(user !== null);
      setLoading(false);
      if (!user) {
        setShowAdminDashboard(false);
      }
    });

    return unsubscribe;
  }, []);

  const handleSignOut = async () => {
    await logout();
    setAuthenticated(false);
    setShowAdminDashboard(false);
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
    />
  );
}
