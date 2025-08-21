'use client';

import { useState, useEffect, useCallback } from 'react';
import { Game } from '../../types/game';

interface GameResultsProps {
  selectedWeekId?: number;
}

interface GameResultForm {
  homeScore: string;
  awayScore: string;
}

interface GamesResultsData {
  needingResults: Game[];
  completed: Game[];
}

export function GameResults({ selectedWeekId }: GameResultsProps) {
  const [gamesData, setGamesData] = useState<GamesResultsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittingResults, setSubmittingResults] = useState<Set<number>>(new Set());
  const [forms, setForms] = useState<Record<number, GameResultForm>>({});

  const loadGames = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedWeekId) {
        params.set('weekId', selectedWeekId.toString());
      }

      const response = await fetch(`/api/admin/games/results?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load games');
      }

      setGamesData(data.data);
      
      // Initialize forms for games needing results
      const initialForms: Record<number, GameResultForm> = {};
      data.data.needingResults.forEach((game: Game) => {
        initialForms[game.id] = {
          homeScore: game.home_score?.toString() || '',
          awayScore: game.away_score?.toString() || ''
        };
      });
      setForms(initialForms);

    } catch (err) {
      console.error('Error loading games:', err);
      setError(err instanceof Error ? err.message : 'Failed to load games');
    } finally {
      setLoading(false);
    }
  }, [selectedWeekId]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const handleFormChange = (gameId: number, field: keyof GameResultForm, value: string) => {
    setForms(prev => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        [field]: value
      }
    }));
  };

  const handleSubmitResult = async (gameId: number) => {
    const form = forms[gameId];
    if (!form) return;

    const homeScore = parseInt(form.homeScore);
    const awayScore = parseInt(form.awayScore);

    if (isNaN(homeScore) || isNaN(awayScore)) {
      alert('Please enter valid scores');
      return;
    }

    if (homeScore < 0 || awayScore < 0) {
      alert('Scores cannot be negative');
      return;
    }

    try {
      setSubmittingResults(prev => new Set(prev).add(gameId));

      const response = await fetch(`/api/admin/games/${gameId}/result`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          homeScore,
          awayScore,
          gameStatus: 'final'
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update game result');
      }

      // Show success message
      alert(`Game result updated successfully! ${data.data.picksUpdated} picks evaluated.`);
      
      // Reload games to update the lists
      await loadGames();

    } catch (err) {
      console.error('Error submitting game result:', err);
      alert(err instanceof Error ? err.message : 'Failed to submit game result');
    } finally {
      setSubmittingResults(prev => {
        const next = new Set(prev);
        next.delete(gameId);
        return next;
      });
    }
  };

  const formatGameTime = (commenceTime: string) => {
    const date = new Date(commenceTime);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getSportDisplayName = (sport: string) => {
    switch (sport) {
      case 'americanfootball_nfl':
        return 'NFL';
      case 'americanfootball_ncaaf':
        return 'College';
      default:
        return sport;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-600 dark:text-gray-300">Loading games...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-red-600 dark:text-red-400">
          <p className="font-medium">Error loading games:</p>
          <p>{error}</p>
          <button
            onClick={loadGames}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!gamesData) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Game Results Management
        </h2>

        {/* Games Needing Results */}
        {gamesData.needingResults.length > 0 ? (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Games Needing Results ({gamesData.needingResults.length})
            </h3>
            <div className="space-y-4">
              {gamesData.needingResults.map((game) => (
                <div
                  key={game.id}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                          {getSportDisplayName(game.sport)}
                        </span>
                        {game.game_status === 'in_progress' && (
                          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">
                            In Progress
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {game.away_team} @ {game.home_team}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatGameTime(game.commence_time)}
                      </div>
                    </div>
                  </div>

                  {/* Score Entry Form */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {game.away_team} Score
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={forms[game.id]?.awayScore || ''}
                        onChange={(e) => handleFormChange(game.id, 'awayScore', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {game.home_team} Score
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={forms[game.id]?.homeScore || ''}
                        onChange={(e) => handleFormChange(game.id, 'homeScore', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <button
                        onClick={() => handleSubmitResult(game.id)}
                        disabled={submittingResults.has(game.id)}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed"
                      >
                        {submittingResults.has(game.id) ? 'Submitting...' : 'Submit Result'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-8 text-center py-6">
            <div className="text-gray-500 dark:text-gray-400">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium">All games have results entered</p>
              <p className="text-sm mt-1">No games currently need result entry</p>
            </div>
          </div>
        )}

        {/* Completed Games */}
        {gamesData.completed.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Completed Games ({gamesData.completed.length})
            </h3>
            <div className="space-y-3">
              {gamesData.completed.map((game) => (
                <div
                  key={game.id}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                          {getSportDisplayName(game.sport)}
                        </span>
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                          Final
                        </span>
                      </div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {game.away_team} @ {game.home_team}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatGameTime(game.commence_time)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {game.away_score} - {game.home_score}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {game.home_score! > game.away_score! ? game.home_team : 
                         game.away_score! > game.home_score! ? game.away_team : 'Tie'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}