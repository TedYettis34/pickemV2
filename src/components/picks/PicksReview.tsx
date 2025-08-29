"use client";

import { useState } from "react";
import { PicksSummary, PickWithGame } from "../../types/pick";

interface PicksReviewProps {
  picksSummary: PicksSummary;
  onSubmitPicks: (weekId: number) => Promise<void>;
  onUnsubmitPicks?: (weekId: number) => Promise<void>;
  onEditPick?: (gameId: number) => void;
  onDeletePick?: (gameId: number) => void;
  isSubmitting?: boolean;
}

export function PicksReview({
  picksSummary,
  onSubmitPicks,
  onUnsubmitPicks,
  onEditPick,
  onDeletePick,
  isSubmitting = false,
}: PicksReviewProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isUnsubmitting, setIsUnsubmitting] = useState(false);

  const { weekId, picks, submittedAt, cutoffTime } =
    picksSummary;
  const isSubmitted = !!submittedAt;
  
  // Check if cutoff time has passed
  const isCutoffPassed = cutoffTime ? new Date() > new Date(cutoffTime) : false;

  // Categorize picks by game start time
  const now = new Date();
  const startedGamePicks = picks.filter(
    (pick) => new Date(pick.game.commence_time) <= now
  );
  const unstartedGamePicks = picks.filter(
    (pick) => new Date(pick.game.commence_time) > now
  );

  const hasGameStarted = (commenceTime: string) => {
    return new Date(commenceTime) <= now;
  };

  const handleSubmitClick = async () => {
    if (picks.length === 0) return;

    try {
      setSubmitError(null);
      await onSubmitPicks(weekId);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Submit failed");
    }
  };

  const handleUnsubmitClick = async () => {
    if (!onUnsubmitPicks || picks.length === 0) return;

    let confirmMessage = "Are you sure you want to unsubmit your picks?";

    if (startedGamePicks.length > 0 && unstartedGamePicks.length > 0) {
      confirmMessage = `Are you sure you want to unsubmit your picks? Only ${unstartedGamePicks.length} pick(s) for games that haven't started will be unsubmitted. ${startedGamePicks.length} pick(s) for games that have already started will remain submitted and locked.`;
    } else if (startedGamePicks.length > 0) {
      confirmMessage =
        "All your games have already started. No picks can be unsubmitted.";
      alert(confirmMessage);
      return;
    } else {
      confirmMessage = `Are you sure you want to unsubmit all ${unstartedGamePicks.length} picks? This will allow you to make changes and resubmit.`;
    }

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    try {
      setSubmitError(null);
      setIsUnsubmitting(true);
      await onUnsubmitPicks(weekId);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unsubmit failed"
      );
    } finally {
      setIsUnsubmitting(false);
    }
  };

  const handleDeletePick = (gameId: number) => {
    if (!onDeletePick || isSubmitted) return;
    onDeletePick(gameId);
  };

  const formatGameTime = (commenceTime: string) => {
    const date = new Date(commenceTime);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getSportDisplayName = (sport: string) => {
    switch (sport) {
      case "americanfootball_nfl":
        return "NFL";
      case "americanfootball_ncaaf":
        return "College";
      default:
        return sport;
    }
  };

  const getPickDisplayText = (pick: PickWithGame) => {
    const { game, pick_type, spread_value } = pick;
    const team = pick_type === "home_spread" ? game.home_team : game.away_team;
    const spread = spread_value || 0;
    const spreadText = spread > 0 ? `+${spread}` : `${spread}`;
    return `${team} ${spreadText}`;
  };

  if (picks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Review Your Picks
            </h3>
          </div>
        </div>

        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">
            <svg
              className="mx-auto h-12 w-12 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-lg font-medium">No picks made yet</p>
            <p className="text-sm mt-1">
              Make some picks on the games above to see them here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Review Your Picks
          </h3>
        </div>

        {isSubmitted ? (
          <div className="space-y-3">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <svg
                  className="h-5 w-5 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Picks Submitted
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Submitted on{" "}
                {new Date(submittedAt!).toLocaleDateString("en-US", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            {onUnsubmitPicks && (
              <div className="space-y-2">
                <button
                  onClick={handleUnsubmitClick}
                  disabled={isUnsubmitting || unstartedGamePicks.length === 0 || isCutoffPassed}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {isUnsubmitting
                    ? "Unsubmitting..."
                    : isCutoffPassed
                    ? "Cutoff Passed"
                    : unstartedGamePicks.length === 0
                    ? "Cannot Unsubmit"
                    : unstartedGamePicks.length < picks.length
                    ? `Unsubmit ${unstartedGamePicks.length} Picks`
                    : "Unsubmit All Picks"}
                </button>
                {isCutoffPassed ? (
                  <p className="text-xs text-red-500 dark:text-red-400">
                    Cutoff time has passed - no picks can be unsubmitted
                  </p>
                ) : unstartedGamePicks.length === 0 ? (
                  <p className="text-xs text-red-500 dark:text-red-400">
                    All games have started - no picks can be unsubmitted
                  </p>
                ) : startedGamePicks.length > 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Only {unstartedGamePicks.length} of {picks.length} picks can
                    be unsubmitted (games that haven&apos;t started)
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    You can still update picks to favorable lines without
                    unsubmitting
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {cutoffTime && (
              <div className={`text-sm ${isCutoffPassed ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                Cutoff: {new Date(cutoffTime).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short", 
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit"
                })}
                {isCutoffPassed && " (passed)"}
              </div>
            )}
            <button
              onClick={handleSubmitClick}
              disabled={isSubmitting || picks.length === 0 || isCutoffPassed}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : isCutoffPassed ? "Cutoff Passed" : "Submit All Picks"}
            </button>
            {isCutoffPassed && (
              <p className="text-xs text-red-500 dark:text-red-400">
                The submission cutoff time has passed for this week
              </p>
            )}
          </div>
        )}
      </div>

      {/* Status Summary for Submitted Picks */}
      {isSubmitted &&
        (startedGamePicks.length > 0 || unstartedGamePicks.length > 0) && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex items-center space-x-4 text-sm">
              {isCutoffPassed ? (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">{picks.length}</span> Locked (cutoff time passed)
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">
                        {startedGamePicks.length}
                      </span>{" "}
                      Locked (games started)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">
                        {unstartedGamePicks.length}
                      </span>{" "}
                      Can be unsubmitted (games not started)
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      {/* Picks List */}
      <div className="space-y-3">
        {(() => {
          // Sort picks: must-pick games first, then by start time within each group
          const sortedPicks = [...picks].sort((a, b) => {
            // Must-pick games come first
            if (a.game.must_pick && !b.game.must_pick) return -1;
            if (!a.game.must_pick && b.game.must_pick) return 1;

            // Within each group, sort by start time (earliest first)
            return (
              new Date(a.game.commence_time).getTime() -
              new Date(b.game.commence_time).getTime()
            );
          });

          return sortedPicks.map((pick) => {
            const gameHasStarted = hasGameStarted(pick.game.commence_time);
            
            // Function to get background color based on pick result
            const getPickBgColor = (result: 'win' | 'loss' | 'push' | null | undefined, gameStarted: boolean) => {
              if (!result) {
                // If no result yet, use game started status for styling
                return gameStarted 
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-700';
              }
              
              // Use result-based styling (same as AllPicksBrowser)
              const colors = {
                win: 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800',
                loss: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
                push: 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
              };
              
              return colors[result] || 'bg-gray-50 dark:bg-gray-700';
            };

            return (
              <div
                key={pick.id}
                className={`flex items-center justify-between p-4 rounded-lg ${getPickBgColor(pick.result, gameHasStarted)}`}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                      {getSportDisplayName(pick.game.sport)}
                    </span>
                    {pick.game.must_pick && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 font-medium">
                        Must Pick
                      </span>
                    )}
                    {pick.is_triple_play && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 font-medium">
                        Triple Play
                      </span>
                    )}
                    {isSubmitted && !isCutoffPassed && gameHasStarted && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 font-medium">
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zM9 11V9a3 3 0 116 0v2M6 11h12"
                          />
                        </svg>
                        Locked
                      </span>
                    )}
                    {isSubmitted && !isCutoffPassed && !gameHasStarted && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 font-medium">
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z"
                          />
                        </svg>
                        Can Unsubmit
                      </span>
                    )}
                    <div
                      className={`text-sm ${
                        pick.result 
                          ? pick.result === 'win'
                            ? "text-green-600 dark:text-green-400 font-medium"
                            : pick.result === 'loss'
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : "text-yellow-600 dark:text-yellow-400 font-medium" // push
                          : gameHasStarted
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {formatGameTime(pick.game.commence_time)}
                      {pick.result ? (
                        <span className="ml-2 font-bold">
                          ({pick.result.charAt(0).toUpperCase() + pick.result.slice(1)})
                        </span>
                      ) : gameHasStarted ? (
                        <span className="ml-2 font-bold">(Started)</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {pick.game.away_team} @ {pick.game.home_team}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {getPickDisplayText(pick)}
                    </div>
                  </div>
                </div>

                {!isSubmitted && (
                  <div className="flex items-center space-x-2 ml-4">
                    {onEditPick && (
                      <button
                        onClick={() => onEditPick(pick.game_id)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        Edit
                      </button>
                    )}
                    {onDeletePick && (
                      <button
                        onClick={() => handleDeletePick(pick.game_id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>

      {/* Error Messages */}
      {submitError && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">
            {submitError}
          </p>
        </div>
      )}
    </div>
  );
}
