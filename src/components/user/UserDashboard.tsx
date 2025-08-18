'use client';

import { useState, useEffect } from 'react';
import { Week } from '../../types/week';
import { Game } from '../../types/game';

interface UserDashboardProps {
  onSignOut: () => void;
  isAdmin: boolean;
  onShowAdminPanel: () => void;
}

export function UserDashboard({ onSignOut, isAdmin, onShowAdminPanel }: UserDashboardProps) {
  const [activeWeek, setActiveWeek] = useState<Week | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActiveWeekAndGames();
  }, []);

  const loadActiveWeekAndGames = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the active week
      const weekResponse = await fetch('/api/weeks/active');
      const weekData = await weekResponse.json();

      if (!weekData.success) {
        throw new Error(weekData.error || 'Failed to fetch active week');
      }

      if (!weekData.data) {
        // No active week
        setActiveWeek(null);
        setGames([]);
        return;
      }

      setActiveWeek(weekData.data);

      // Get games for the active week
      const gamesResponse = await fetch(`/api/weeks/${weekData.data.id}/games`);
      const gamesData = await gamesResponse.json();

      if (!gamesData.success) {
        throw new Error(gamesData.error || 'Failed to fetch games');
      }

      setGames(gamesData.data || []);

    } catch (err) {
      console.error('Error loading active week and games:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  const formatSport = (sport: string) => {
    switch (sport) {
      case 'americanfootball_nfl':
        return 'NFL';
      case 'americanfootball_ncaaf':
        return 'College';
      default:
        return sport;
    }
  };

  const formatSpread = (homeSpread?: number, awaySpread?: number, homeTeam?: string) => {
    if (homeSpread !== undefined && homeSpread !== null) {
      const spread = homeSpread > 0 ? `+${homeSpread}` : homeSpread.toString();
      return `${homeTeam} ${spread}`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                PickEm Dashboard
              </h1>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button
                    onClick={onShowAdminPanel}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Admin Panel
                  </button>
                )}
                <button
                  onClick={onSignOut}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-center py-12">
              <div className="text-lg text-gray-600 dark:text-gray-300">Loading...</div>
            </div>
          </div>
        </main>
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
            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={onShowAdminPanel}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Admin Panel
                </button>
              )}
              <button
                onClick={onSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div className="text-red-700 dark:text-red-400">
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}

          {!activeWeek ? (
            <div className="border-4 border-dashed border-gray-200 dark:border-gray-700 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  No Active Week
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  There are currently no active pick&apos;em weeks. Check back later!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Week Header */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {activeWeek.name}
                </h2>
                {activeWeek.description && (
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {activeWeek.description}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Period:</span>{' '}
                    {new Date(activeWeek.start_date).toLocaleDateString()} -{' '}
                    {new Date(activeWeek.end_date).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Games:</span> {games.length}
                  </div>
                </div>
              </div>

              {/* Games List */}
              {games.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="text-center py-8">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Games Available
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      There are no games available for this week yet.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      This Week&apos;s Games
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {games.map((game) => (
                      <div key={game.id} className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              {formatSport(game.sport)}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDateTime(game.commence_time)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                              {game.away_team} @ {game.home_team}
                            </div>
                            {formatSpread(game.spread_home, game.spread_away, game.home_team) && (
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Spread: {formatSpread(game.spread_home, game.spread_away, game.home_team)}
                              </div>
                            )}
                            {game.total_over_under && (
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Total: {game.total_over_under}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}