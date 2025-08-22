'use client';

import { useState, useEffect } from 'react';
import { PickWithGame } from '../../types/pick';
import { Week } from '../../types/week';

interface AllPicksBrowserProps {
  weekId?: number | null;
}

interface PickWithUser extends PickWithGame {
  username: string;
  display_name: string | null;
  week_name: string;
}

export function AllPicksBrowser({ weekId: initialWeekId }: AllPicksBrowserProps) {
  const [picks, setPicks] = useState<PickWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'win' | 'loss' | 'push' | 'pending'>('all');
  const [triplePlayFilter, setTriplePlayFilter] = useState<'all' | 'triple_only'>('all');
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(initialWeekId || null);
  const [userFilter, setUserFilter] = useState<string>('all');
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadWeeks();
    loadAllPicks();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadAllPicks();
  }, [selectedWeekId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadWeeks = async () => {
    try {
      const response = await fetch('/api/weeks');
      const data = await response.json();
      if (data.success) {
        setWeeks(data.data || []);
      }
    } catch (err) {
      console.error('Error loading weeks:', err);
    }
  };

  const loadAllPicks = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedWeekId) {
        params.append('weekId', selectedWeekId.toString());
      }

      const response = await fetch(`/api/picks/all?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch picks');
      }

      const picksData = data.data || [];
      setPicks(picksData);

      // Extract unique users from picks for filtering
      const uniqueUsers = Array.from(
        new Map(
          picksData.map((pick: PickWithUser) => [
            pick.user_id,
            { id: pick.user_id, name: pick.display_name || pick.username }
          ])
        ).values()
      ) as { id: string; name: string }[];
      setUsers(uniqueUsers);

    } catch (err) {
      console.error('Error loading all picks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load picks');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredPicks = () => {
    let filtered = picks;

    // Filter by result
    if (filter !== 'all') {
      if (filter === 'pending') {
        filtered = filtered.filter(pick => !pick.result);
      } else {
        filtered = filtered.filter(pick => pick.result === filter);
      }
    }

    // Filter by triple play
    if (triplePlayFilter === 'triple_only') {
      filtered = filtered.filter(pick => pick.is_triple_play);
    }

    // Filter by user
    if (userFilter !== 'all') {
      filtered = filtered.filter(pick => pick.user_id === userFilter);
    }

    return filtered;
  };

  const formatPickType = (pickType: string, spreadValue: number | null, homeTeam: string, awayTeam: string) => {
    if (!spreadValue && spreadValue !== 0) return 'No spread';
    
    if (pickType === 'home_spread') {
      return `${homeTeam} ${spreadValue > 0 ? '+' : ''}${spreadValue}`;
    } else {
      return `${awayTeam} ${-spreadValue > 0 ? '+' : ''}${-spreadValue}`;
    }
  };

  const getResultBadge = (result: 'win' | 'loss' | 'push' | null | undefined) => {
    if (!result) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Pending</span>;
    }

    const colors = {
      win: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      loss: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      push: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${colors[result as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {result.charAt(0).toUpperCase() + result.slice(1)}
      </span>
    );
  };

  const getGameStatusDisplay = (game: PickWithUser['game']) => {
    if (game.home_score !== null && game.away_score !== null) {
      return `${game.away_team} ${game.away_score}, ${game.home_team} ${game.home_score}`;
    }
    
    const gameTime = new Date(game.commence_time);
    const now = new Date();
    
    if (gameTime > now) {
      return gameTime.toLocaleDateString() + ' ' + gameTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else {
      return 'In Progress / Final';
    }
  };

  const filteredPicks = getFilteredPicks();

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <div className="text-lg text-gray-600 dark:text-gray-300">Loading all picks...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <div className="text-red-600 dark:text-red-400">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          All User Picks {selectedWeekId && picks.length > 0 ? `- ${picks[0].week_name}` : selectedWeekId ? `- Week ${selectedWeekId}` : ''}
        </h2>
        
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Week
            </label>
            <select
              value={selectedWeekId || 'all'}
              onChange={(e) => setSelectedWeekId(e.target.value === 'all' ? null : parseInt(e.target.value))}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Weeks</option>
              {weeks.map((week) => (
                <option key={week.id} value={week.id}>
                  {week.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User
            </label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Result
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'win' | 'loss' | 'push' | 'pending')}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Results</option>
              <option value="win">Wins</option>
              <option value="loss">Losses</option>
              <option value="push">Pushes</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Triple Plays
            </label>
            <select
              value={triplePlayFilter}
              onChange={(e) => setTriplePlayFilter(e.target.value as 'all' | 'triple_only')}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Picks</option>
              <option value="triple_only">Triple Plays Only</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredPicks.length} of {picks.length} picks
        </div>
      </div>

      <div className="p-6">
        {filteredPicks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-600 dark:text-gray-400">
              {picks.length === 0 ? 'No picks have been submitted yet.' : 'No picks match the current filters.'}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPicks.map((pick) => (
              <div key={pick.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {pick.display_name || pick.username}
                      </div>
                      {pick.is_triple_play && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 font-medium">
                          3X
                        </span>
                      )}
                      {getResultBadge(pick.result)}
                    </div>
                    
                    <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {pick.game.away_team} @ {pick.game.home_team}
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <div>
                        <span className="font-medium">Pick:</span> {formatPickType(pick.pick_type, pick.spread_value, pick.game.home_team, pick.game.away_team)}
                      </div>
                      <div>
                        <span className="font-medium">Score:</span> {getGameStatusDisplay(pick.game)}
                      </div>
                      <div>
                        <span className="font-medium">Week:</span> {pick.week_name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                    <div>Submitted {new Date(pick.created_at).toLocaleDateString()}</div>
                    {pick.evaluated_at && (
                      <div>Evaluated {new Date(pick.evaluated_at).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}