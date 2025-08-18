'use client';

import { useState } from 'react';
import { CreateWeekInput } from '../../types/week';
import { getCurrentAccessToken } from '../../lib/adminAuth';

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

interface WeekCreationWizardProps {
  onWeekCreated: (weekData: CreateWeekInput, gamesData: PreviewGames) => void;
  onCancel: () => void;
}

export function WeekCreationWizard({ onWeekCreated, onCancel }: WeekCreationWizardProps) {
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [weekFormData, setWeekFormData] = useState<CreateWeekInput | null>(null);
  const [previewGames, setPreviewGames] = useState<PreviewGames | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    description: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const getAuthHeaders = (): Record<string, string> => {
    const token = getCurrentAccessToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Week name is required';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (startDate >= endDate) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePreviewGames = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const weekData: CreateWeekInput = {
        name: formData.name.trim(),
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        description: formData.description.trim() || undefined,
      };

      const response = await fetch('/api/admin/games/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          start_date: weekData.start_date,
          end_date: weekData.end_date,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to preview games');
      }

      setWeekFormData(weekData);
      setPreviewGames(data.data);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview games');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWeek = () => {
    if (weekFormData && previewGames) {
      onWeekCreated(weekFormData, previewGames);
    }
  };

  const handleBackToForm = () => {
    setStep('form');
    setPreviewGames(null);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (step === 'preview' && previewGames) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Preview Games for &quot;{weekFormData?.name}&quot;
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {new Date(weekFormData?.start_date || '').toLocaleDateString()} - {new Date(weekFormData?.end_date || '').toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              Found <strong>{previewGames.nfl.length} NFL games</strong> and <strong>{previewGames.college.length} college games</strong> for this date range.
            </div>
          </div>

          {previewGames.nfl.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                NFL Games ({previewGames.nfl.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {previewGames.nfl.map((game, index) => (
                  <div key={game.external_id || index} className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                    <div className="flex justify-between items-center">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {game.away_team} @ {game.home_team}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(game.commence_time).toLocaleString()}
                      </div>
                    </div>
                    {(game.spread_home || game.spread_away) && (
                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        Spread: {game.home_team} {game.spread_home && game.spread_home > 0 ? '+' : ''}{game.spread_home}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {previewGames.college.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                College Games ({previewGames.college.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {previewGames.college.map((game, index) => (
                  <div key={game.external_id || index} className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                    <div className="flex justify-between items-center">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {game.away_team} @ {game.home_team}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(game.commence_time).toLocaleString()}
                      </div>
                    </div>
                    {(game.spread_home || game.spread_away) && (
                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        Spread: {game.home_team} {game.spread_home && game.spread_home > 0 ? '+' : ''}{game.spread_home}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {previewGames.nfl.length === 0 && previewGames.college.length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
              <div className="text-yellow-800 dark:text-yellow-200">
                No games found for this date range. You can still create the week, but no games will be available.
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={handleBackToForm}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              Back to Form
            </button>
            <button
              onClick={handleCreateWeek}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              Create Week with These Games
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Create New Week
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
          <div className="text-red-700 dark:text-red-400">{error}</div>
        </div>
      )}

      <form className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Week Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors ${
              formErrors.name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="e.g., Week 1 - Season Opener"
            disabled={loading}
          />
          {formErrors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.name}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              id="start_date"
              value={formData.start_date}
              onChange={(e) => handleInputChange('start_date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors ${
                formErrors.start_date ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={loading}
            />
            {formErrors.start_date && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.start_date}</p>
            )}
          </div>

          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date & Time *
            </label>
            <input
              type="datetime-local"
              id="end_date"
              value={formData.end_date}
              onChange={(e) => handleInputChange('end_date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors ${
                formErrors.end_date ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={loading}
            />
            {formErrors.end_date && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.end_date}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors resize-vertical"
            placeholder="Optional description for this week..."
            disabled={loading}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handlePreviewGames}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading Games...
              </span>
            ) : (
              'Preview Games'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}