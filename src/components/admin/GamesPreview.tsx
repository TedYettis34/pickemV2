'use client';

import { useState, useEffect } from 'react';
import { Game } from '../../types/game';
import { Week } from '../../types/week';
import { getCurrentAccessToken } from '../../lib/adminAuth';

interface GamesPreviewProps {
  week: Week;
  onGamesSaved: () => void;
  onCancel: () => void;
}

interface PreviewGames {
  nfl: Partial<Game>[];
  college: Partial<Game>[];
}

export function GamesPreview({ week, onGamesSaved, onCancel }: GamesPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [previewGames, setPreviewGames] = useState<PreviewGames | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingGames, setHasExistingGames] = useState(false);

  const getAuthHeaders = (): Record<string, string> => {
    const token = getCurrentAccessToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  };

  // Load existing games from database on component mount
  useEffect(() => {
    loadExistingGames();
  }, [week.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadExistingGames = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch existing games from the database
      const response = await fetch(`/api/admin/weeks/${week.id}/games`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch existing games');
      }

      const games = data.data || [];
      
      if (games.length > 0) {
        // Convert database games to preview format
        const nflGames = games.filter((game: Game) => game.sport === 'americanfootball_nfl');
        const collegeGames = games.filter((game: Game) => game.sport === 'americanfootball_ncaaf');
        
        setPreviewGames({
          nfl: nflGames,
          college: collegeGames
        });
        setHasExistingGames(true);
      } else {
        setHasExistingGames(false);
      }
    } catch (err) {
      console.error('Error loading existing games:', err);
      setHasExistingGames(false);
      // Don't set error here, just fall back to no existing games
    } finally {
      setLoading(false);
    }
  };

  const fetchGamesPreview = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/weeks/${week.id}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ action: 'preview' }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch games');
      }

      setPreviewGames(data.data);
      setHasExistingGames(false); // These are new games from API, not existing
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch games');
    } finally {
      setLoading(false);
    }
  };

  const saveGamesToWeek = async () => {
    if (!previewGames) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/weeks/${week.id}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          action: 'save',
          nflGames: previewGames.nfl,
          collegeGames: previewGames.college,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save games');
      }

      // After saving, reload existing games and mark as having existing games
      await loadExistingGames();
      setHasExistingGames(true);
      onGamesSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save games');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteExistingGames = async () => {
    if (!confirm('Are you sure you want to delete all games for this week? This action cannot be undone.')) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/weeks/${week.id}/games`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete games');
      }

      // Clear the preview and reload
      setPreviewGames(null);
      setHasExistingGames(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete games');
    } finally {
      setIsSaving(false);
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

  const formatSpread = (homeSpread?: number, awaySpread?: number) => {
    if (homeSpread !== undefined) {
      return homeSpread > 0 ? `+${homeSpread}` : `${homeSpread}`;
    }
    if (awaySpread !== undefined) {
      return awaySpread > 0 ? `+${awaySpread}` : `${awaySpread}`;
    }
    return 'N/A';
  };


  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Games Preview - {week.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {formatDateTime(week.start_date)} - {formatDateTime(week.end_date)}
        </p>
      </div>

      <div className="p-6">
        {!previewGames && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {hasExistingGames 
                ? "No games found in database. Click the button below to fetch new games from The Odds API."
                : "Click the button below to fetch games from The Odds API for this week."
              }
            </p>
            <button
              onClick={fetchGamesPreview}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Fetch New Games from API
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Fetching games...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md p-4 mb-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {previewGames && (
          <div className="space-y-6">
            {/* NFL Games */}
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                NFL Games ({previewGames.nfl.length})
              </h4>
              {previewGames.nfl.length > 0 ? (
                <div className="grid gap-3">
                  {previewGames.nfl.map((game, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {game.away_team} @ {game.home_team}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {game.commence_time && formatDateTime(game.commence_time)}
                        </span>
                      </div>
                      <div className="text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Spread:</span>
                          <span className="font-medium ml-2">{formatSpread(game.spread_home, game.spread_away)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No NFL games found for this week.</p>
              )}
            </div>

            {/* College Games */}
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                College Football Games ({previewGames.college.length})
              </h4>
              {previewGames.college.length > 0 ? (
                <div className="grid gap-3">
                  {previewGames.college.map((game, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {game.away_team} @ {game.home_team}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {game.commence_time && formatDateTime(game.commence_time)}
                        </span>
                      </div>
                      <div className="text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Spread:</span>
                          <span className="font-medium ml-2">{formatSpread(game.spread_home, game.spread_away)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No college games found for this week.</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                Cancel
              </button>
              <div className="space-x-2">
                <button
                  onClick={fetchGamesPreview}
                  disabled={loading}
                  className="px-4 py-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/70 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hasExistingGames ? 'Fetch New Games from API' : 'Refresh Games'}
                </button>
                {!hasExistingGames && (
                  <button
                    onClick={saveGamesToWeek}
                    disabled={isSaving}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Save Games'}
                  </button>
                )}
                {hasExistingGames && (
                  <button
                    onClick={deleteExistingGames}
                    disabled={isSaving}
                    className="px-4 py-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/70 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Deleting...' : 'Delete Games'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}