import { renderHook, waitFor, act } from '@testing-library/react';
import { useWeeks } from '../useWeeks';
import { Week, CreateWeekInput, UpdateWeekInput } from '../../types/week';

// Mock adminAuth
jest.mock('../../lib/adminAuth', () => ({
  getCurrentAccessToken: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

import { getCurrentAccessToken } from '../../lib/adminAuth';

const mockGetCurrentAccessToken = getCurrentAccessToken as jest.MockedFunction<typeof getCurrentAccessToken>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('useWeeks Hook', () => {
  // No mocking needed - tests will work with actual window.location

  const mockWeeks: Week[] = [
    {
      id: 1,
      name: 'Week 1',
      start_date: '2024-01-01',
      end_date: '2024-01-07',
      description: 'First week',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Week 2',
      start_date: '2024-01-08',
      end_date: '2024-01-14',
      description: 'Second week',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentAccessToken.mockReturnValue('test-access-token');
    
    // Mock successful fetch by default
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockWeeks,
      }),
    } as Response);
  });

  it('should fetch weeks on mount', async () => {
    const { result } = renderHook(() => useWeeks());

    expect(result.current.loading).toBe(true);
    expect(result.current.weeks).toEqual([]);
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.weeks).toEqual(mockWeeks);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost/api/admin/weeks',
      {
        headers: {
          Authorization: 'Bearer test-access-token',
        },
      }
    );
  });

  it('should handle fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useWeeks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.weeks).toEqual([]);
    expect(result.current.error).toBe('Network error occurred');
  });

  it('should handle API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: 'API error',
      }),
    } as Response);

    const { result } = renderHook(() => useWeeks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.weeks).toEqual([]);
    expect(result.current.error).toBe('API error');
  });

  it('should fetch without auth headers when no token', async () => {
    mockGetCurrentAccessToken.mockReturnValue(null);

    const { result } = renderHook(() => useWeeks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost/api/admin/weeks',
      {
        headers: {},
      }
    );
  });

  describe('createWeek', () => {
    it('should create week successfully', async () => {
      const newWeek: Week = {
        id: 3,
        name: 'Week 3',
        start_date: '2024-01-15',
        end_date: '2024-01-21',
        description: 'Third week',
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      };

      const createWeekInput: CreateWeekInput = {
        name: 'Week 3',
        start_date: '2024-01-15',
        end_date: '2024-01-21',
        description: 'Third week',
      };

      // Mock create response and refetch response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: newWeek,
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [...mockWeeks, newWeek],
          }),
        } as Response);

      const { result } = renderHook(() => useWeeks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let createResult: { success: boolean; error?: string };
      await act(async () => {
        createResult = await result.current.createWeek(createWeekInput);
      });

      expect(createResult!.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost/api/admin/weeks',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-access-token',
          },
          body: JSON.stringify(createWeekInput),
        }
      );
    });

    it('should handle create week error', async () => {
      const createWeekInput: CreateWeekInput = {
        name: 'Week 3',
        start_date: '2024-01-15',
        end_date: '2024-01-21',
        description: 'Third week',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockWeeks,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: false,
            error: 'Validation failed',
          }),
        } as Response);

      const { result } = renderHook(() => useWeeks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let createResult: { success: boolean; error?: string };
      await act(async () => {
        createResult = await result.current.createWeek(createWeekInput);
      });

      expect(createResult!.success).toBe(false);
      expect(createResult!.error).toBe('Validation failed');
    });
  });

  describe('updateWeek', () => {
    it('should update week successfully', async () => {
      const updateWeekInput: UpdateWeekInput = {
        name: 'Updated Week 1',
        description: 'Updated description',
      };

      // Mock update response and refetch response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockWeeks,
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { ...mockWeeks[0], ...updateWeekInput },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockWeeks,
          }),
        } as Response);

      const { result } = renderHook(() => useWeeks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateWeek(1, updateWeekInput);
      });

      expect(updateResult!.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost/api/admin/weeks/1',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-access-token',
          },
          body: JSON.stringify(updateWeekInput),
        }
      );
    });
  });

  describe('deleteWeek', () => {
    it('should delete week successfully', async () => {
      // Mock delete response and refetch response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockWeeks,
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockWeeks.slice(1),
          }),
        } as Response);

      const { result } = renderHook(() => useWeeks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let deleteResult: { success: boolean; error?: string };
      await act(async () => {
        deleteResult = await result.current.deleteWeek(1);
      });

      expect(deleteResult!.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost/api/admin/weeks/1',
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer test-access-token',
          },
        }
      );
    });
  });

  describe('refetch', () => {
    it('should refetch weeks manually', async () => {
      const { result } = renderHook(() => useWeeks());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear previous calls
      mockFetch.mockClear();

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost/api/admin/weeks',
        {
          headers: {
            Authorization: 'Bearer test-access-token',
          },
        }
      );
    });
  });
});