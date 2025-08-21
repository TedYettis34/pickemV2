'use client';

import { Pick } from '../../types/pick';
import { calculatePickStatistics } from '../../lib/pickEvaluation';

interface PickStatisticsProps {
  picks: Pick[];
  title?: string;
  showTriplePlay?: boolean;
}

export function PickStatistics({ picks, title = "Your Pick Statistics", showTriplePlay = true }: PickStatisticsProps) {
  const stats = calculatePickStatistics(picks);

  if (stats.totalPicks === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-sm">No completed picks to display</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {/* Total Picks */}
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalPicks}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total Picks
          </div>
        </div>

        {/* Wins */}
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.wins}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Wins
          </div>
        </div>

        {/* Losses */}
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {stats.losses}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Losses
          </div>
        </div>

        {/* Pushes */}
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.pushes}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Pushes
          </div>
        </div>
      </div>

      {/* Win Percentage */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Win Percentage
          </span>
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {stats.winPercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${stats.winPercentage}%` }}
          />
        </div>
      </div>

      {/* Record Display */}
      <div className="text-center">
        <div className="text-lg font-medium text-gray-900 dark:text-white">
          Record: {stats.wins}-{stats.losses}
          {stats.pushes > 0 && `-${stats.pushes}`}
        </div>
      </div>

      {/* Triple Play Statistics */}
      {showTriplePlay && stats.triplePlayTotal > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 font-medium mr-2">
                Triple Play
              </span>
              Results
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {stats.triplePlayWins}/{stats.triplePlayTotal}
              {stats.triplePlayTotal > 0 && (
                <span className="text-gray-500 dark:text-gray-400 ml-1">
                  ({Math.round((stats.triplePlayWins / stats.triplePlayTotal) * 100)}%)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}