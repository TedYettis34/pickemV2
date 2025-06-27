'use client';

import { useState, useEffect } from 'react';
import AuthForm from '../components/auth/AuthForm';
import { isAuthenticated, signOut } from '../lib/auth';

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthenticated(isAuthenticated());
    setLoading(false);
  }, []);

  const handleAuthSuccess = () => {
    setAuthenticated(true);
  };

  const handleSignOut = () => {
    signOut();
    setAuthenticated(false);
  };

  if (loading) {
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
            <AuthForm onAuthSuccess={handleAuthSuccess} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              PickEm Dashboard
            </h1>
            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 dark:border-gray-700 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Welcome to your dashboard!
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Your pick&apos;em features will be built here.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
