'use client';

import { useState } from 'react';
import { logout } from '../../lib/auth';
import { getAuthHeaders } from '../../lib/userAuth';
import { WeekManagement } from './WeekManagement';
import { GameResults } from './GameResults';

interface AdminDashboardProps {
  onBackToDashboard?: () => void;
}

export default function AdminDashboard({ onBackToDashboard }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'weeks' | 'results' | 'settings'>('weeks');
  const [updatingScores, setUpdatingScores] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [forceFinalizingNFL, setForceFinalizingNFL] = useState(false);
  const [forceFinalizingCollege, setForceFinalizingCollege] = useState(false);

  const handleSignOut = () => {
    logout();
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

  const handleDiagnoseScores = async () => {
    setDiagnosing(true);
    try {
      const response = await fetch('/api/scores/debug');
      const data = await response.json();
      
      if (data.success) {
        const { debug, summary } = data;
        let message = `Score Update Diagnostic Report\n\n`;
        message += `Current Time: ${debug.currentTime}\n`;
        message += `Database Connection: ${debug.databaseConnection}\n\n`;
        message += `Active Games (not final): ${summary.allActiveGames}\n`;
        message += `Candidate Games (5+ hrs ago, no scores): ${summary.candidateGames}\n`;
        message += `Games Needing Updates: ${summary.gamesNeedingUpdates}\n`;
        
        if (debug.errors.length > 0) {
          message += `\nErrors:\n${debug.errors.join('\n')}`;
        }
        
        if (debug.allActiveGames.length > 0) {
          message += `\n\nAll Active Games:\n`;
          debug.allActiveGames.slice(0, 10).forEach((game: { teams: string; hoursAgo: string; game_status: string }) => {
            message += `- ${game.teams} (${game.hoursAgo}h ago) - Status: ${game.game_status}\n`;
          });
          if (debug.allActiveGames.length > 10) {
            message += `... and ${debug.allActiveGames.length - 10} more\n`;
          }
        }
        
        alert(message);
      } else {
        alert(`Diagnostic failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error running diagnostics:', error);
      alert('Failed to run diagnostics. Please try again.');
    } finally {
      setDiagnosing(false);
    }
  };

  const handleForceFinalize = async (sport: 'americanfootball_nfl' | 'americanfootball_ncaaf') => {
    const sportName = sport === 'americanfootball_nfl' ? 'NFL' : 'College';
    const confirmed = confirm(`Are you sure you want to force finalize all ${sportName} games that started 5+ hours ago?\n\nThis will mark games as final with placeholder scores (0-0) and evaluate all picks. This action cannot be undone.`);
    
    if (!confirmed) return;
    
    const setLoading = sport === 'americanfootball_nfl' ? setForceFinalizingNFL : setForceFinalizingCollege;
    
    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/admin/games/force-finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ sport }),
      });

      const data = await response.json();
      
      if (data.success) {
        const { gamesChecked, gamesFinalized, details, errors } = data.data;
        let message = `Force Finalization Complete!\n\n`;
        message += `Games checked: ${gamesChecked}\n`;
        message += `Games finalized: ${gamesFinalized}\n`;
        
        if (details.length > 0) {
          message += `\nDetails:\n`;
          details.forEach((detail: { teams: string; status: string; reason?: string; note?: string }) => {
            message += `- ${detail.teams}: ${detail.status}`;
            if (detail.reason) message += ` (${detail.reason})`;
            if (detail.note) message += ` - ${detail.note}`;
            message += `\n`;
          });
        }
        
        if (errors.length > 0) {
          message += `\nErrors:\n${errors.join('\n')}`;
        }
        
        alert(message);
      } else {
        alert(`Force finalization failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error force finalizing games:', error);
      alert('Failed to force finalize games. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Admin status is verified by parent component before rendering this component

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
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Manually trigger an update of game scores from the Odds API. This will automatically 
                    fetch scores for games that started 5+ hours ago and don&apos;t have manually entered results.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleUpdateScores}
                      disabled={updatingScores}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed"
                    >
                      {updatingScores ? 'Updating Scores...' : 'Update Scores from API'}
                    </button>
                    <button
                      onClick={handleDiagnoseScores}
                      disabled={diagnosing}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed"
                    >
                      {diagnosing ? 'Running Diagnostics...' : 'Diagnose Score Issues'}
                    </button>
                  </div>
                </div>
                
                {/* Emergency Finalization Section */}
                <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
                  <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                    Emergency Tools
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    ⚠️ Use only when the automatic score system is not working and games need to be finalized urgently.
                    This will mark games as final with placeholder scores (0-0) and evaluate picks.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleForceFinalize('americanfootball_nfl')}
                      disabled={forceFinalizingNFL}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 text-sm rounded-md font-medium transition-colors disabled:cursor-not-allowed"
                    >
                      {forceFinalizingNFL ? 'Processing...' : 'Force Finalize NFL Games'}
                    </button>
                    <button
                      onClick={() => handleForceFinalize('americanfootball_ncaaf')}
                      disabled={forceFinalizingCollege}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 text-sm rounded-md font-medium transition-colors disabled:cursor-not-allowed"
                    >
                      {forceFinalizingCollege ? 'Processing...' : 'Force Finalize College Games'}
                    </button>
                  </div>
                </div>
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