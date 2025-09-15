import { useState, useEffect, useCallback } from 'react';
import { Week, CreateWeekInput, UpdateWeekInput, ApiResponse } from '../types/week';
import { getCurrentAccessToken } from '../lib/adminAuth';

export function useWeeks() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (typeof window === 'undefined') return {};
    
    // Check if current token is expired or expiring soon
    const { isCurrentTokenExpiringSoon } = await import('../lib/userAuth');
    
    if (isCurrentTokenExpiringSoon()) {
      try {
        const { refreshTokens } = await import('../lib/auth');
        const refreshSuccess = await refreshTokens();
        
        if (!refreshSuccess) {
          console.warn('Token refresh failed in useWeeks hook');
          return {};
        }
      } catch (error) {
        console.error('Error refreshing token in useWeeks hook:', error);
        return {};
      }
    }
    
    const token = getCurrentAccessToken();
    console.log('🔑 useWeeks token check:', {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenStart: token?.substring(0, 20),
      tokenEnd: token?.substring(token?.length - 20)
    });
    
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  };

  const fetchWeeks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const headers = await getAuthHeaders();
      console.log('🔍 useWeeks: Fetching weeks with headers:', headers);
      
      const response = await fetch(`${baseUrl}/api/admin/weeks`, {
        headers,
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
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/admin/weeks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
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
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/admin/weeks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
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
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/admin/weeks/${id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
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