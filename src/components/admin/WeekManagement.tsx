'use client';

import { useState } from 'react';
import { useWeeks } from '../../hooks/useWeeks';
import { WeekForm } from './WeekForm';
import { WeekList } from './WeekList';
import { Week, CreateWeekInput, UpdateWeekInput } from '../../types/week';

export function WeekManagement() {
  const { weeks, loading, error, createWeek, updateWeek, deleteWeek } = useWeeks();
  const [showForm, setShowForm] = useState(false);
  const [editingWeek, setEditingWeek] = useState<Week | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const handleCreateWeek = async (weekData: CreateWeekInput) => {
    setFormLoading(true);
    setFormError(null);

    const result = await createWeek(weekData);
    
    if (result.success) {
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
      setEditingWeek(null);
      setFormError(null);
    } else {
      setFormError(result.error || 'Failed to update week');
    }
    
    setFormLoading(false);
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
        
        {!showForm && !editingWeek && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Create New Week
          </button>
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
              start_date: editingWeek.start_date.slice(0, 16), // Format for datetime-local input
              end_date: editingWeek.end_date.slice(0, 16),
              description: editingWeek.description || '',
            } : undefined}
            onSubmit={editingWeek ? handleUpdateWeek : handleCreateWeek}
            isSubmitting={formLoading}
            submitLabel={editingWeek ? 'Update Week' : 'Create Week'}
          />
        </div>
      )}

      {/* Weeks List */}
      {!showForm && !editingWeek && (
        <WeekList
          weeks={weeks}
          onEdit={handleEditWeek}
          onDelete={handleDeleteWeek}
        />
      )}
    </div>
  );
}