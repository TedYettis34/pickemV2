'use client';

import { useState } from 'react';
import { PicksSummary, PickWithGame } from '../../types/pick';

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
  isSubmitting = false 
}: PicksReviewProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isUnsubmitting, setIsUnsubmitting] = useState(false);

  const { weekId, weekName, picks, totalPicks, totalGames, submittedAt } = picksSummary;
  const isSubmitted = !!submittedAt;
  const completionPercentage = totalGames > 0 ? Math.round((totalPicks / totalGames) * 100) : 0;

  const handleSubmitClick = async () => {
    if (picks.length === 0) return;
    
    const confirmed = window.confirm('Are you sure you want to submit all picks? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
      setSubmitError(null);
      await onSubmitPicks(weekId);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Submit failed');
    }
  };

  const handleUnsubmitClick = async () => {
    if (!onUnsubmitPicks || picks.length === 0) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to unsubmit your picks? This will allow you to make changes and resubmit. You can still update to favorable line movements without unsubmitting.'
    );
    if (!confirmed) return;
    
    try {
      setSubmitError(null);
      setIsUnsubmitting(true);
      await onUnsubmitPicks(weekId);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unsubmit failed');
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

  const getPickDisplayText = (pick: PickWithGame) => {
    const { game, pick_type, spread_value } = pick;
    const team = pick_type === 'home_spread' ? game.home_team : game.away_team;
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
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {weekName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {totalPicks} of {totalGames} games picked
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {completionPercentage}% complete
            </p>
          </div>
        </div>
        
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-medium">No picks made yet</p>
            <p className="text-sm mt-1">Make some picks on the games above to see them here</p>
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
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {weekName}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalPicks} of {totalGames} games picked
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {completionPercentage}% complete
          </p>
        </div>
        
        {isSubmitted ? (
          <div className="space-y-3">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Picks Submitted
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Submitted on {new Date(submittedAt!).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            {onUnsubmitPicks && (
              <div className="space-y-2">
                <button
                  onClick={handleUnsubmitClick}
                  disabled={isUnsubmitting}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {isUnsubmitting ? 'Unsubmitting...' : 'Unsubmit Picks'}
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  You can still update picks to favorable lines without unsubmitting
                </p>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleSubmitClick}
            disabled={isSubmitting || picks.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit All Picks'}
          </button>
        )}
      </div>

      {/* Picks List */}
      <div className="space-y-3">
        {picks.map((pick) => (
          <div
            key={pick.id}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                  {getSportDisplayName(pick.game.sport)}
                </span>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatGameTime(pick.game.commence_time)}
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
        ))}
      </div>

      {/* Submission Warning */}
      {!isSubmitted && (
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">Review your picks carefully</p>
              <p className="mt-1">Once submitted, you cannot modify or add new picks for this week.</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {submitError && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
        </div>
      )}
    </div>
  );
}