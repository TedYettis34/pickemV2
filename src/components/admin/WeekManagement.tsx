'use client';

import { useState } from 'react';
import { useWeeks } from '../../hooks/useWeeks';
import { WeekForm } from './WeekForm';
import { WeekList } from './WeekList';
import { GamesPreview } from './GamesPreview';
import { WeekCreationWizard } from './WeekCreationWizard';
import { Week, CreateWeekInput, UpdateWeekInput } from '../../types/week';

interface GameData {
  external_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  sport: string;
  spread_home?: number;
  spread_away?: number;
}

interface PreviewGames {
  nfl: GameData[];
  college: GameData[];
}

// Helper function to format date for datetime-local input (in local timezone)
function formatForDateTimeLocal(dateString: string): string {
  const date = new Date(dateString);
  // Get local timezone offset and adjust
  const tzOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - tzOffset);
  return localDate.toISOString().slice(0, 16);
}

export function WeekManagement() {
  const { weeks, loading, error, createWeek, updateWeek, deleteWeek, refetch: refreshWeeks } = useWeeks();
  const [showForm, setShowForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [editingWeek, setEditingWeek] = useState<Week | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [previewingWeek, setPreviewingWeek] = useState<Week | null>(null);

  const handleCreateWeek = async (weekData: CreateWeekInput) => {
    setFormLoading(true);
    setFormError(null);

    const result = await createWeek(weekData);
    
    if (result.success) {
      // After creating week successfully, go back to main view
      setShowForm(false);
      setFormError(null);
    } else {
      setFormError(result.error || 'Failed to create week');
    }
    
    setFormLoading(false);
  };

  const handleUpdateWeek = async (weekData: UpdateWeekInput) => {
    if (!editingWeek) return;

    setFormLoading(true);
    setFormError(null);

    const result = await updateWeek(editingWeek.id, weekData);
    
    if (result.success) {
      // Find the updated week in the refreshed weeks list
      const updatedWeek = weeks.find(week => week.id === editingWeek.id);
      if (updatedWeek) {
        setEditingWeek(updatedWeek);
      }
      setFormError(null);
    } else {
      setFormError(result.error || 'Failed to update week');
    }
    
    setFormLoading(false);
  };

  const handleFormSubmit = async (data: CreateWeekInput | UpdateWeekInput) => {
    if (editingWeek) {
      // For editing, we can safely cast since the form will provide all fields
      await handleUpdateWeek(data as UpdateWeekInput);
    } else {
      // For creating, we need all required fields
      await handleCreateWeek(data as CreateWeekInput);
    }
  };

  const handleDeleteWeek = async (week: Week) => {
    if (!confirm(`Are you sure you want to delete "${week.name}"? This action cannot be undone.`)) {
      return;
    }

    const result = await deleteWeek(week.id);
    
    if (!result.success) {
      alert(result.error || 'Failed to delete week');
    }
  };

  const handleEditWeek = (week: Week) => {
    setEditingWeek(week);
    setShowForm(false);
    setFormError(null);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingWeek(null);
    setFormError(null);
  };

  const handleWizardComplete = async (weekData: CreateWeekInput, gamesData: PreviewGames) => {
    setFormLoading(true);
    setFormError(null);

    try {
      // Call the API directly to create week with games
      const response = await fetch('/api/admin/weeks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ...weekData,
          games: gamesData, // Include games data for saving
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        console.log(`Week created with ${result.data.savedGamesCount || 0} games saved`);
        setShowWizard(false);
        setFormError(null);
        // Refresh the weeks list to show the new week
        refreshWeeks();
      } else {
        setFormError(result.error || 'Failed to create week');
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Network error occurred');
    }
    
    setFormLoading(false);
  };

  const getAuthHeaders = (): Record<string, string> => {
    // Import this from adminAuth if not already available
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  };

  const handleWizardCancel = () => {
    setShowWizard(false);
    setFormError(null);
  };

  const handleGamesSaved = () => {
    // Games have been saved, refresh the weeks list and return to main view
    setPreviewingWeek(null);
    refreshWeeks();
  };

  const handlePreviewCancel = () => {
    // Cancel games preview and return to main view
    setPreviewingWeek(null);
  };

  const handlePreviewGames = (week: Week) => {
    // Show games preview for an existing week
    setPreviewingWeek(week);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600 dark:text-gray-300">Loading weeks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Week Management
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Create and manage weeks for picks
          </p>
        </div>
        
        {!showForm && !editingWeek && !showWizard && (
          <div className="flex space-x-3">
            <button
              onClick={() => setShowWizard(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Create New Week
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Quick Create (No Games)
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="text-red-700 dark:text-red-400">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Wizard Display */}
      {showWizard && (
        <div>
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
              <div className="text-red-700 dark:text-red-400">
                {formError}
              </div>
            </div>
          )}
          <WeekCreationWizard
            onWeekCreated={handleWizardComplete}
            onCancel={handleWizardCancel}
          />
        </div>
      )}

      {/* Form Display */}
      {(showForm || editingWeek) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingWeek ? 'Edit Week' : 'Create New Week'}
            </h3>
            <button
              onClick={handleCancelForm}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
              <div className="text-red-700 dark:text-red-400">
                {formError}
              </div>
            </div>
          )}

          <WeekForm
            initialData={editingWeek ? {
              name: editingWeek.name,
              start_date: formatForDateTimeLocal(editingWeek.start_date),
              end_date: formatForDateTimeLocal(editingWeek.end_date),
              description: editingWeek.description || '',
              max_picker_choice_games: editingWeek.max_picker_choice_games,
              max_triple_plays: editingWeek.max_triple_plays,
              cutoff_time: editingWeek.cutoff_time ? formatForDateTimeLocal(editingWeek.cutoff_time) : null,
            } : undefined}
            onSubmit={handleFormSubmit}
            isSubmitting={formLoading}
            submitLabel={editingWeek ? 'Update Week' : 'Create Week'}
          />
        </div>
      )}

      {/* Games Preview */}
      {previewingWeek && (
        <GamesPreview
          week={previewingWeek}
          onGamesSaved={handleGamesSaved}
          onCancel={handlePreviewCancel}
        />
      )}

      {/* Weeks List */}
      {!showForm && !editingWeek && !previewingWeek && !showWizard && (
        <WeekList
          weeks={weeks}
          onEdit={handleEditWeek}
          onDelete={handleDeleteWeek}
          onPreviewGames={handlePreviewGames}
        />
      )}
    </div>
  );
}