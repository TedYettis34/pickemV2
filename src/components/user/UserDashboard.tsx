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

interface OddsStatus {
  lastUpdated: string | null;
  needsUpdate: boolean;
  nextUpdateDue: string | null;
  timeSinceUpdate: string | null;
}

export function UserDashboard({ onSignOut, isAdmin, onShowAdminPanel }: UserDashboardProps) {
  const [activeWeek, setActiveWeek] = useState<Week | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [userPicks, setUserPicks] = useState<Pick[]>([]);
  const [draftPicks, setDraftPicks] = useState<Map<number, CreatePickInput>>(new Map());
  const [picksSummary, setPicksSummary] = useState<PicksSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oddsStatus, setOddsStatus] = useState<OddsStatus | null>(null);
  const [submittingPicks, setSubmittingPicks] = useState(false);
  const [activeTab, setActiveTab] = useState<'games' | 'review'>('games');

  useEffect(() => {
    loadActiveWeekAndGames();
    loadOddsStatus();
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

  // Load odds status
  const loadOddsStatus = async () => {
    try {
      const response = await fetch('/api/odds/status');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOddsStatus(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading odds status:', error);
      // Don't set error state for odds status - it's not critical
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
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    // Check picker choice limit for non-must-pick games
    if (!game.must_pick && !draftPicks.has(gameId) && !userPicks.find(p => p.game_id === gameId)) {
      const pickerChoiceStatus = getPickerChoiceStatus();
      if (pickerChoiceStatus && !pickerChoiceStatus.canPickMore) {
        // Show error message to user
        alert(`You can only pick ${pickerChoiceStatus.max} picker's choice games (excluding must-pick games). You have already picked ${pickerChoiceStatus.current}.`);
        return;
      }
    }

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

  // Handle pick deletion (remove from local state or database)
  const handlePickDelete = async (gameId: number) => {
    try {
      // Check if this is a draft pick (local only) or a database pick
      const isDraftPick = draftPicks.has(gameId);
      const existingDatabasePick = userPicks.find(pick => pick.game_id === gameId);
      
      if (isDraftPick) {
        // Remove from local draft picks
        const newDraftPicks = new Map(draftPicks);
        newDraftPicks.delete(gameId);
        setDraftPicks(newDraftPicks);
        updatePicksSummaryWithDrafts(newDraftPicks);
      } 
      
      if (existingDatabasePick) {
        // Delete from database
        const userContext = getCurrentUserContext();
        if (!userContext) {
          throw new Error('User not authenticated');
        }

        const authHeaders = getAuthHeaders();
        
        const response = await fetch(`/api/picks/${gameId}`, {
          method: 'DELETE',
          headers: authHeaders,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete pick');
        }
        
        // Reload picks from database to reflect the deletion
        if (activeWeek) {
          await loadUserPicks(activeWeek.id);
        }
      }
    } catch (error) {
      console.error('Error deleting pick:', error);
      // Don't throw error to avoid breaking the UI - just log it
    }
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
      
      // Get all picks to submit: draft picks + unsubmitted database picks
      const draftPicksArray = Array.from(draftPicks.values());
      const unsubmittedPicks = userPicks.filter(pick => !pick.submitted);
      
      // Convert unsubmitted database picks to the format expected by the API
      const unsubmittedAsCreateInput = unsubmittedPicks
        .filter(pick => !draftPicks.has(pick.game_id)) // Don't include if there's a draft version
        .map(pick => ({
          game_id: pick.game_id,
          pick_type: pick.pick_type,
          spread_value: pick.spread_value,
        }));
      
      // Combine draft picks and unsubmitted picks
      const picksToSubmit = [...draftPicksArray, ...unsubmittedAsCreateInput];
      
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

  // Handle pick unsubmission (allow editing submitted picks)
  const handleUnsubmitPicks = async (weekId: number) => {
    try {
      const userContext = getCurrentUserContext();
      if (!userContext) {
        throw new Error('User not authenticated');
      }

      const authHeaders = getAuthHeaders();
      
      const response = await fetch('/api/picks/bulk-unsubmit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ weekId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unsubmit picks');
      }
      
      // Reload picks from database to reflect unsubmitted state
      await loadUserPicks(weekId);
      
      // Switch to games tab to allow editing
      setActiveTab('games');
      
    } catch (error) {
      console.error('Error unsubmitting picks:', error);
      throw error;
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
  
  // Update picks summary to include draft picks and unsubmitted picks
  const updatePicksSummaryWithDrafts = (currentDraftPicks: Map<number, CreatePickInput>) => {
    if (!activeWeek || games.length === 0) return;
    
    // Get unsubmitted picks from database (these have been unsubmitted)
    const unsubmittedPicks = userPicks.filter(pick => !pick.submitted);
    
    // Create picks summary including both draft picks and unsubmitted picks
    const allPicksArray: PickWithGame[] = [];
    
    // Add draft picks (these take precedence over unsubmitted picks for the same game)
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
    
    allPicksArray.push(...draftPicksArray);
    
    // Add unsubmitted picks from database (only if no draft pick exists for that game)
    const draftGameIds = new Set(currentDraftPicks.keys());
    unsubmittedPicks.forEach(pick => {
      if (!draftGameIds.has(pick.game_id)) {
        const game = games.find(g => g.id === pick.game_id);
        if (game) {
          allPicksArray.push({
            ...pick,
            game,
          });
        }
      }
    });
    
    const summary: PicksSummary = {
      weekId: activeWeek.id,
      weekName: activeWeek.name,
      totalGames: games.length,
      totalPicks: allPicksArray.length,
      submittedAt: undefined, // These are not submitted yet
      picks: allPicksArray,
    };
    
    setPicksSummary(summary);
  };
  
  // Update picks summary when games, userPicks, or draftPicks change
  useEffect(() => {
    updatePicksSummaryWithDrafts(draftPicks);
  }, [games, activeWeek, userPicks, draftPicks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if picks have been submitted
  const hasSubmittedPicks = picksSummary?.submittedAt != null;
  
  // Get total count of picks for display (draft + unsubmitted database picks)
  const getTotalPicksCount = () => {
    if (hasSubmittedPicks) {
      return userPicks.length;
    }
    // Count draft picks + unsubmitted database picks (avoiding duplicates)
    const unsubmittedDatabasePicks = userPicks.filter(pick => !pick.submitted && !draftPicks.has(pick.game_id));
    return draftPicks.size + unsubmittedDatabasePicks.length;
  };

  // Get picker's choice status (non-must-pick games count and limit)
  const getPickerChoiceStatus = () => {
    if (!activeWeek) return null;

    const maxPickerChoiceGames = activeWeek.max_picker_choice_games;
    if (maxPickerChoiceGames === null || maxPickerChoiceGames === undefined) return null; // No limit set

    // Count current picker's choice picks (non-must-pick games)
    const mustPickGames = games.filter(game => game.must_pick);
    const nonMustPickGames = games.filter(game => !game.must_pick);

    let currentPickerChoicePicks = 0;

    if (hasSubmittedPicks) {
      // Count from userPicks, filtering out must-pick games
      currentPickerChoicePicks = userPicks.filter(pick => {
        const game = games.find(g => g.id === pick.game_id);
        return game && !game.must_pick;
      }).length;
    } else {
      // Count from draft picks + unsubmitted database picks (non-must-pick only)
      const draftPickerChoiceCount = Array.from(draftPicks.keys()).filter(gameId => {
        const game = games.find(g => g.id === gameId);
        return game && !game.must_pick;
      }).length;

      const unsubmittedPickerChoiceCount = userPicks.filter(pick => {
        if (pick.submitted || draftPicks.has(pick.game_id)) return false;
        const game = games.find(g => g.id === pick.game_id);
        return game && !game.must_pick;
      }).length;

      currentPickerChoicePicks = draftPickerChoiceCount + unsubmittedPickerChoiceCount;
    }

    return {
      current: currentPickerChoicePicks,
      max: maxPickerChoiceGames,
      mustPickCount: mustPickGames.length,
      nonMustPickCount: nonMustPickGames.length,
      canPickMore: currentPickerChoicePicks < maxPickerChoiceGames
    };
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
                {oddsStatus && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Odds updated:</span>{' '}
                    {oddsStatus.timeSinceUpdate || 'Never'}
                  </div>
                )}
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
              {oddsStatus && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Odds updated:</span>{' '}
                  {oddsStatus.timeSinceUpdate || 'Never'}
                </div>
              )}
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
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div>
                      <span className="font-medium">Games: {games.length}</span>
                    </div>
                    {(() => {
                      const pickerChoiceStatus = getPickerChoiceStatus();
                      if (pickerChoiceStatus) {
                        const { current, max, mustPickCount, canPickMore } = pickerChoiceStatus;
                        const statusColor = canPickMore ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400';
                        return (
                          <div className={`${statusColor}`}>
                            <span className="font-medium">Picker&apos;s Choice: {current}/{max}</span>
                            {mustPickCount > 0 && (
                              <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                                (+{mustPickCount} must-pick)
                              </span>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
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
                        Review Picks ({getTotalPicksCount()})
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
                      {games.map((game) => {
                        const currentPick = getCurrentPickForGame(game.id);
                        const pickerChoiceStatus = getPickerChoiceStatus();
                        
                        // Disable non-must-pick games if picker choice limit is reached and user doesn't already have a pick for this game
                        const isPickerChoiceLimitReached = Boolean(
                          !game.must_pick && 
                          pickerChoiceStatus && 
                          !pickerChoiceStatus.canPickMore && 
                          !currentPick
                        );
                        
                        return (
                          <PickCard
                            key={game.id}
                            game={game}
                            currentPick={currentPick}
                            onPickChange={handlePickChange}
                            onPickDelete={handlePickDelete}
                            disabled={isPickerChoiceLimitReached}
                            submitted={hasSubmittedPicks}
                          />
                        );
                      })}
                    </div>
                  )}

                  {activeTab === 'review' && picksSummary && (
                    <PicksReview
                      picksSummary={picksSummary}
                      onSubmitPicks={handleSubmitPicks}
                      onUnsubmitPicks={handleUnsubmitPicks}
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