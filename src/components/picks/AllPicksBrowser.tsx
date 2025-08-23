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

  const getGroupedPicksByGame = () => {
    const filteredPicks = getFilteredPicks();
    const grouped = new Map<number, PickWithUser[]>();
    
    filteredPicks.forEach(pick => {
      if (!grouped.has(pick.game_id)) {
        grouped.set(pick.game_id, []);
      }
      grouped.get(pick.game_id)!.push(pick);
    });

    // Sort picks within each game group by user name
    grouped.forEach((picks) => {
      picks.sort((a, b) => (a.display_name || a.username).localeCompare(b.display_name || b.username));
    });

    // Convert to array and sort by must_pick first, then by earliest commence time
    return Array.from(grouped.entries())
      .sort(([, picksA], [, picksB]) => {
        const gameA = picksA[0].game;
        const gameB = picksB[0].game;
        
        // Must pick games come first
        if (gameA.must_pick && !gameB.must_pick) return -1;
        if (!gameA.must_pick && gameB.must_pick) return 1;
        
        // Then sort by earliest commence time (earliest first)
        const timeA = new Date(gameA.commence_time).getTime();
        const timeB = new Date(gameB.commence_time).getTime();
        return timeA - timeB;
      });
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


  const filteredPicks = getFilteredPicks();
  const groupedGames = getGroupedPicksByGame();

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
          Showing {filteredPicks.length} picks from {groupedGames.length} games (total: {picks.length} picks)
        </div>
      </div>

      <div className="p-6">
        {groupedGames.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-600 dark:text-gray-400">
              {picks.length === 0 ? 'No picks have been submitted yet.' : 'No picks match the current filters.'}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedGames.map(([gameId, gamePicks]) => {
              const game = gamePicks[0].game; // All picks share the same game
              const weekName = gamePicks[0].week_name;
              
              return (
                <div key={gameId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  {/* Game Info Header */}
                  <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-xl font-bold text-gray-900 dark:text-white">
                            {game.away_team} @ {game.home_team}
                          </div>
                          {game.must_pick && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 font-medium">
                              MUST PICK
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Week:</span>
                            <div className="text-gray-600 dark:text-gray-400">{weekName}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Time:</span>
                            <div className="text-gray-600 dark:text-gray-400">
                              {new Date(game.commence_time).toLocaleDateString()} {new Date(game.commence_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Score:</span>
                            <div className="text-gray-600 dark:text-gray-400">
                              {game.home_score !== null && game.away_score !== null 
                                ? `${game.away_team} ${game.away_score}, ${game.home_team} ${game.home_score}`
                                : 'TBD'
                              }
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Picks:</span>
                            <div className="text-gray-600 dark:text-gray-400">{gamePicks.length}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* User Picks List */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white">User Picks:</h4>
                    <div className="grid gap-3">
                      {gamePicks.map((pick) => (
                        <div key={pick.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="font-medium text-gray-900 dark:text-white min-w-[120px]">
                              {pick.display_name || pick.username}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {formatPickType(pick.pick_type, pick.spread_value, game.home_team, game.away_team)}
                            </div>
                            {pick.is_triple_play && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 font-medium">
                                3X
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getResultBadge(pick.result)}
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(pick.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}