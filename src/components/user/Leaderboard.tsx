'use client';

import React, { useState, useEffect } from 'react';

export interface LeaderboardEntry {
  userId: string;
  name: string;
  email: string;
  totalWins: number;
  totalLosses: number;
  totalPushes: number;
  winPercentage: number;
  gamesBack: number;
  rank: number;
}

interface LeaderboardProps {
  currentUserId?: string;
}

export default function Leaderboard({ currentUserId }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leaderboard');
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard data');
      }
      const data = await response.json();
      setLeaderboard(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <span className="text-lg">🏆</span>;
    if (rank === 2) return <span className="text-lg">🥈</span>;
    if (rank === 3) return <span className="text-lg">🥉</span>;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-gray-500 dark:text-gray-400">#{rank}</span>;
  };


  const formatGamesBack = (gamesBack: number) => {
    if (gamesBack === 0) return '—';
    if (gamesBack % 1 === 0) return gamesBack.toString();
    return gamesBack.toFixed(1);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading leaderboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
          <button
            onClick={fetchLeaderboard}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          No leaderboard data available yet. Make some picks to see standings!
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Leaderboard
          </h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Triple play picks count as 3 wins or 3 losses
        </p>
      </div>

      <div className="p-6">
        <div className="space-y-3">
          {leaderboard.map((entry) => {
            const isCurrentUser = currentUserId && entry.userId === currentUserId;

            return (
              <div
                key={entry.userId}
                className={`p-4 rounded-lg border transition-colors ${
                  isCurrentUser
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      {getRankIcon(entry.rank)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium ${
                          isCurrentUser 
                            ? 'text-blue-900 dark:text-blue-100' 
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {entry.name}
                        </h3>
                        {isCurrentUser && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full font-medium">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {entry.totalWins}-{entry.totalLosses}
                        {entry.totalPushes > 0 && `-${entry.totalPushes}`}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Record
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatGamesBack(entry.gamesBack)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        GB
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            How Games Back Works
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Games Back (GB) shows how many games behind the leader each team is. 
            The leader is always 0 games back. To catch up, a team would need to win 
            while the leader loses. For example, if you&apos;re 2.5 games back, you&apos;d need 
            to win 5 games while the leader loses 5 games to tie for first place.
          </p>
        </div>
      </div>
    </div>
  );
}