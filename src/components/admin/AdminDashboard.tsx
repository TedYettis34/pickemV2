'use client';

import { useState } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { signOut } from '../../lib/auth';
import { WeekManagement } from './WeekManagement';
import { GameResults } from './GameResults';

interface AdminDashboardProps {
  onBackToDashboard?: () => void;
}

export default function AdminDashboard({ onBackToDashboard }: AdminDashboardProps) {
  const { isAdmin, isLoading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'weeks' | 'results' | 'settings'>('weeks');
  const [updatingScores, setUpdatingScores] = useState(false);

  const handleSignOut = () => {
    signOut();
    window.location.reload(); // Refresh to show login page
  };

  const handleUpdateScores = async () => {
    setUpdatingScores(true);
    try {
      const response = await fetch('/api/scores/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        const { gamesChecked, gamesUpdated, errors } = data.data;
        let message = `Score update complete!\n\n`;
        message += `Games checked: ${gamesChecked}\n`;
        message += `Games updated: ${gamesUpdated}\n`;
        
        if (errors.length > 0) {
          message += `\nErrors encountered:\n${errors.join('\n')}`;
        }
        
        if (gamesUpdated === 0) {
          message += '\nNo games needed score updates at this time.';
        }
        
        alert(message);
      } else {
        alert(`Score update failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating scores:', error);
      alert('Failed to update scores. Please try again.');
    } finally {
      setUpdatingScores(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading admin dashboard...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            You don&apos;t have administrator privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Administrator Access
              </span>
              {onBackToDashboard && (
                <button
                  onClick={onBackToDashboard}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Back to Dashboard
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('weeks')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'weeks'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Week Management
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'results'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Game Results
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'weeks' && <WeekManagement />}
        {activeTab === 'results' && <GameResults />}
        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Settings
            </h2>
            
            {/* Score Update Section */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Score Management
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Manually trigger an update of game scores from the Odds API. This will automatically 
                  fetch scores for games that started 4+ hours ago and don&apos;t have manually entered results.
                </p>
                <button
                  onClick={handleUpdateScores}
                  disabled={updatingScores}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {updatingScores ? 'Updating Scores...' : 'Update Scores from API'}
                </button>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Additional settings will be available here in future updates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}