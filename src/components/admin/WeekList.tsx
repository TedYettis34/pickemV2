'use client';

import { Week } from '../../types/week';

interface WeekListProps {
  weeks: Week[];
  onEdit: (week: Week) => void;
  onDelete: (week: Week) => void;
  onPreviewGames: (week: Week) => void;
}

export function WeekList({ weeks, onEdit, onDelete, onPreviewGames }: WeekListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  const getWeekStatus = (week: Week) => {
    const now = new Date();
    const startDate = new Date(week.start_date);
    const endDate = new Date(week.end_date);

    if (now < startDate) {
      return { status: 'upcoming', label: 'Upcoming', color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20' };
    } else if (now >= startDate && now <= endDate) {
      return { status: 'active', label: 'Active', color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20' };
    } else {
      return { status: 'completed', label: 'Completed', color: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20' };
    }
  };

  if (weeks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
        <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No weeks created yet
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Create your first week to start managing pick periods.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          All Weeks ({weeks.length})
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Week Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Start Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                End Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {weeks.map((week) => {
              const weekStatus = getWeekStatus(week);
              
              return (
                <tr key={week.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {week.name}
                      </div>
                      {week.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {week.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatDate(week.start_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatDate(week.end_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${weekStatus.color}`}>
                        {weekStatus.label}
                      </span>
                      {week.is_locked && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20">
                          🔒 Locked
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {!week.is_locked ? (
                        <>
                          <button
                            onClick={() => onPreviewGames(week)}
                            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 text-sm font-medium transition-colors"
                          >
                            Preview Games
                          </button>
                          <button
                            onClick={() => onEdit(week)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(week)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col space-y-1">
                          <span className="text-gray-500 dark:text-gray-400 text-sm">
                            Locked by {week.locked_by}
                          </span>
                          {week.locked_at && (
                            <span className="text-gray-400 dark:text-gray-500 text-xs">
                              {formatDate(week.locked_at)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile-friendly cards for smaller screens */}
      <div className="block sm:hidden">
        <div className="px-4 py-2 space-y-4">
          {weeks.map((week) => {
            const weekStatus = getWeekStatus(week);
            
            return (
              <div key={week.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{week.name}</h4>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${weekStatus.color}`}>
                    {weekStatus.label}
                  </span>
                </div>
                
                {week.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{week.description}</p>
                )}
                
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-3">
                  <div><strong>Start:</strong> {formatDate(week.start_date)}</div>
                  <div><strong>End:</strong> {formatDate(week.end_date)}</div>
                </div>
                
                {week.is_locked && (
                  <div className="mb-3">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20">
                      🔒 Locked
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <div>Locked by {week.locked_by}</div>
                      {week.locked_at && (
                        <div>{formatDate(week.locked_at)}</div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-4">
                  {!week.is_locked ? (
                    <>
                      <button
                        onClick={() => onPreviewGames(week)}
                        className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 text-sm font-medium"
                      >
                        Preview Games
                      </button>
                      <button
                        onClick={() => onEdit(week)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(week)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      Week is locked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}