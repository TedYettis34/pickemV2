import { useState, useEffect, useCallback } from 'react';
import { Week, CreateWeekInput, UpdateWeekInput, ApiResponse } from '../types/week';
import { getCurrentAccessToken } from '../lib/adminAuth';

export function useWeeks() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = getCurrentAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchWeeks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/weeks', {
        headers: getAuthHeaders(),
      });

      const data: ApiResponse<Week[]> = await response.json();

      if (data.success && data.data) {
        setWeeks(data.data);
      } else {
        setError(data.error || 'Failed to fetch weeks');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching weeks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createWeek = async (weekData: CreateWeekInput): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/admin/weeks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(weekData),
      });

      const data: ApiResponse<Week> = await response.json();

      if (data.success && data.data) {
        await fetchWeeks(); // Refresh the list
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to create week' };
      }
    } catch (err) {
      console.error('Error creating week:', err);
      return { success: false, error: 'Network error occurred' };
    }
  };

  const updateWeek = async (id: number, weekData: UpdateWeekInput): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/admin/weeks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(weekData),
      });

      const data: ApiResponse<Week> = await response.json();

      if (data.success) {
        await fetchWeeks(); // Refresh the list
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to update week' };
      }
    } catch (err) {
      console.error('Error updating week:', err);
      return { success: false, error: 'Network error occurred' };
    }
  };

  const deleteWeek = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/admin/weeks/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data: ApiResponse<never> = await response.json();

      if (data.success) {
        await fetchWeeks(); // Refresh the list
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to delete week' };
      }
    } catch (err) {
      console.error('Error deleting week:', err);
      return { success: false, error: 'Network error occurred' };
    }
  };

  useEffect(() => {
    fetchWeeks();
  }, [fetchWeeks]);

  return {
    weeks,
    loading,
    error,
    createWeek,
    updateWeek,
    deleteWeek,
    refetch: fetchWeeks,
  };
}