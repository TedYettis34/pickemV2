'use client';

import { useState, useEffect } from 'react';
import { Week } from '../../types/week';
import { Game } from '../../types/game';
import { Pick, PicksSummary, CreatePickInput, PickWithGame } from '../../types/pick';
import { PickCard } from '../picks/PickCard';
import { PicksReview } from '../picks/PicksReview';
import { getCurrentUserContext, getAuthHeaders } from '../../lib/userAuth';

interface UserDashboardProps {
  onSignOut: () => void;
  isAdmin: boolean;
  onShowAdminPanel: () => void;
}

export function UserDashboard({ onSignOut, isAdmin, onShowAdminPanel }: UserDashboardProps) {
  const [activeWeek, setActiveWeek] = useState<Week | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [userPicks, setUserPicks] = useState<Pick[]>([]);
  const [draftPicks, setDraftPicks] = useState<Map<number, CreatePickInput>>(new Map());
  const [picksSummary, setPicksSummary] = useState<PicksSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingPicks, setSubmittingPicks] = useState(false);
  const [activeTab, setActiveTab] = useState<'games' | 'review'>('games');

  useEffect(() => {
    loadActiveWeekAndGames();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        setUserPicks([]);
        setPicksSummary(null);
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

      // Load user picks if user is authenticated
      await loadUserPicks(weekData.data.id);

    } catch (err) {
      console.error('Error loading active week and games:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Load user picks for a specific week
  const loadUserPicks = async (weekId: number) => {
    try {
      const userContext = getCurrentUserContext();
      if (!userContext) {
        setUserPicks([]);
        setPicksSummary(null);
        return;
      }

      const authHeaders = getAuthHeaders();

      // Get user picks for the week
      const picksResponse = await fetch(`/api/picks/week/${weekId}`, {
        headers: authHeaders,
      });

      if (picksResponse.ok) {
        const picksData = await picksResponse.json();
        if (picksData.success) {
          // Extract just the pick data (without game data for this list)
          const picks = picksData.data?.map((pickWithGame: Pick & { game: Game }) => ({
            id: pickWithGame.id,
            user_id: pickWithGame.user_id,
            game_id: pickWithGame.game_id,
            pick_type: pickWithGame.pick_type,
            spread_value: pickWithGame.spread_value,
            submitted: pickWithGame.submitted,
            created_at: pickWithGame.created_at,
            updated_at: pickWithGame.updated_at,
          })) || [];
          setUserPicks(picks);
        }
      }

      // Get picks summary for review
      const summaryResponse = await fetch(`/api/picks/week/${weekId}?summary=true`, {
        headers: authHeaders,
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        if (summaryData.success && summaryData.data) {
          setPicksSummary(summaryData.data);
        }
      }

    } catch (error) {
      console.error('Error loading user picks:', error);
      // Don't throw error here, just log it
      setUserPicks([]);
      setPicksSummary(null);
    }
  };

  // Handle pick changes (store locally until submission)
  const handlePickChange = (gameId: number, pickType: 'home_spread' | 'away_spread', spreadValue: number | null) => {
    const newDraftPicks = new Map(draftPicks);
    
    // Add or update the draft pick (spreadValue can be null for some bet types)
    newDraftPicks.set(gameId, {
      game_id: gameId,
      pick_type: pickType,
      spread_value: spreadValue,
    });
    
    setDraftPicks(newDraftPicks);
    updatePicksSummaryWithDrafts(newDraftPicks);
  };

  // Handle pick deletion (remove from local state)
  const handlePickDelete = (gameId: number) => {
    const newDraftPicks = new Map(draftPicks);
    newDraftPicks.delete(gameId);
    setDraftPicks(newDraftPicks);
    updatePicksSummaryWithDrafts(newDraftPicks);
  };

  // Handle pick submission (write all draft picks to database)
  const handleSubmitPicks = async (weekId: number) => {
    try {
      setSubmittingPicks(true);
      
      const userContext = getCurrentUserContext();
      if (!userContext) {
        throw new Error('User not authenticated');
      }

      const authHeaders = getAuthHeaders();
      
      // Convert draft picks to array
      const picksToSubmit = Array.from(draftPicks.values());
      
      if (picksToSubmit.length === 0) {
        throw new Error('No picks to submit');
      }
      
      const response = await fetch('/api/picks/bulk-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ 
          weekId,
          picks: picksToSubmit 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit picks');
      }
      
      // Clear draft picks and reload from database
      setDraftPicks(new Map());
      await loadUserPicks(weekId);
      
      // Switch to review tab to show submitted picks
      setActiveTab('review');
      
    } catch (error) {
      console.error('Error submitting picks:', error);
      throw error;
    } finally {
      setSubmittingPicks(false);
    }
  };

  // Get current pick for a game (check draft picks first, then submitted picks)
  const getCurrentPickForGame = (gameId: number): Pick | CreatePickInput | undefined => {
    // Check draft picks first (these take precedence)
    const draftPick = draftPicks.get(gameId);
    if (draftPick) {
      return draftPick;
    }
    
    // Fall back to submitted picks
    return userPicks.find(pick => pick.game_id === gameId);
  };
  
  // Update picks summary to include draft picks
  const updatePicksSummaryWithDrafts = (currentDraftPicks: Map<number, CreatePickInput>) => {
    if (!activeWeek || games.length === 0) return;
    
    // Create picks summary including draft picks
    const draftPicksArray = Array.from(currentDraftPicks.entries()).map(([gameId, draftPick]) => {
      const game = games.find(g => g.id === gameId);
      if (!game) return null;
      
      return {
        id: 0, // Draft picks don't have IDs yet
        user_id: getCurrentUserContext()?.userId || '',
        game_id: gameId,
        pick_type: draftPick.pick_type,
        spread_value: draftPick.spread_value,
        submitted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        game,
      };
    }).filter((pick): pick is PickWithGame => pick !== null);
    
    const summary: PicksSummary = {
      weekId: activeWeek.id,
      weekName: activeWeek.name,
      totalGames: games.length,
      totalPicks: draftPicksArray.length,
      submittedAt: undefined, // Draft picks are not submitted yet
      picks: draftPicksArray,
    };
    
    setPicksSummary(summary);
  };
  
  // Update picks summary when games change
  useEffect(() => {
    updatePicksSummaryWithDrafts(draftPicks);
  }, [games, activeWeek]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if picks have been submitted
  const hasSubmittedPicks = picksSummary?.submittedAt != null;


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

              {/* Navigation Tabs */}
              {games.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                  <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex">
                      <button
                        onClick={() => setActiveTab('games')}
                        className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'games'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                        }`}
                      >
                        Make Picks ({games.length} games)
                      </button>
                      <button
                        onClick={() => setActiveTab('review')}
                        className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'review'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                        }`}
                      >
                        Review Picks ({hasSubmittedPicks ? userPicks.length : draftPicks.size})
                        {hasSubmittedPicks && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                            Submitted
                          </span>
                        )}
                      </button>
                    </nav>
                  </div>
                </div>
              )}

              {/* Content based on active tab */}
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
                <>
                  {activeTab === 'games' && (
                    <div className="space-y-4">
                      {games.map((game) => (
                        <PickCard
                          key={game.id}
                          game={game}
                          currentPick={getCurrentPickForGame(game.id)}
                          onPickChange={handlePickChange}
                          onPickDelete={handlePickDelete}
                          disabled={false}
                          submitted={hasSubmittedPicks}
                        />
                      ))}
                    </div>
                  )}

                  {activeTab === 'review' && picksSummary && (
                    <PicksReview
                      picksSummary={picksSummary}
                      onSubmitPicks={handleSubmitPicks}
                      onEditPick={() => {
                        setActiveTab('games');
                        // Scroll to the specific game (could be enhanced)
                      }}
                      onDeletePick={handlePickDelete}
                      isSubmitting={submittingPicks}
                    />
                  )}

                  {activeTab === 'review' && !picksSummary && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                      <div className="text-center py-8">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No Picks to Review
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          Make some picks on the games to see them here for review.
                        </p>
                        <button
                          onClick={() => setActiveTab('games')}
                          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          Go Make Picks
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}