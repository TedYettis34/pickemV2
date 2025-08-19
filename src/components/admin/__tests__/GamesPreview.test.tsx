/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GamesPreview } from '../GamesPreview';
import { Week } from '../../../types/week';
import { Game } from '../../../types/game';

// Mock the adminAuth module
jest.mock('../../../lib/adminAuth', () => ({
  getCurrentAccessToken: jest.fn(() => 'mock-token'),
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockWeek: Week = {
  id: 1,
  name: 'Test Week',
  start_date: '2024-01-01T00:00:00Z',
  end_date: '2024-01-07T23:59:59Z',
  description: 'Test week description',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockGames: Game[] = [
  {
    id: 1,
    external_id: 'game1',
    week_id: 1,
    home_team: 'Team A',
    away_team: 'Team B',
    commence_time: '2024-01-01T20:00:00Z',
    sport: 'americanfootball_nfl',
    spread_home: -3.5,
    spread_away: 3.5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    external_id: 'game2',
    week_id: 1,
    home_team: 'College A',
    away_team: 'College B',
    commence_time: '2024-01-02T19:00:00Z',
    sport: 'americanfootball_ncaaf',
    spread_home: -7,
    spread_away: 7,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockOnGamesSaved = jest.fn();
const mockOnCancel = jest.fn();

describe('GamesPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Initial Load', () => {
    it('should load existing games from database on mount', async () => {
      // Mock successful fetch of existing games
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: mockGames,
        }),
      });

      await act(async () => {
        render(
          <GamesPreview
            week={mockWeek}
            onGamesSaved={mockOnGamesSaved}
            onCancel={mockOnCancel}
          />
        );
      });

      // Wait for games to load (no loading state since data loads immediately)
      await waitFor(() => {
        expect(screen.getByText('NFL Games (1)')).toBeInTheDocument();
        expect(screen.getByText('College Football Games (1)')).toBeInTheDocument();
      });

      // Should display the games
      expect(screen.getByText('Team B @ Team A')).toBeInTheDocument();
      expect(screen.getByText('College B @ College A')).toBeInTheDocument();

      // Should show spreads only (no O/U or moneyline)
      expect(screen.getByText('-3.5')).toBeInTheDocument();
      expect(screen.getByText('-7')).toBeInTheDocument();

      // Should show delete games button since games exist
      expect(screen.getByText('Delete Games')).toBeInTheDocument();
    });

    it('should handle empty games response on mount', async () => {
      // Mock empty games response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      await act(async () => {
        render(
          <GamesPreview
            week={mockWeek}
            onGamesSaved={mockOnGamesSaved}
            onCancel={mockOnCancel}
          />
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Click the button below to fetch games from The Odds API for this week.')).toBeInTheDocument();
      });

      // Should show fetch new games button
      expect(screen.getByText('Fetch New Games from API')).toBeInTheDocument();
    });

    it('should handle fetch error on mount gracefully', async () => {
      // Mock fetch error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        render(
          <GamesPreview
            week={mockWeek}
            onGamesSaved={mockOnGamesSaved}
            onCancel={mockOnCancel}
          />
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Click the button below to fetch games from The Odds API for this week.')).toBeInTheDocument();
      });

      // Should not show error message for failed initial load
      expect(screen.queryByText('Network error')).not.toBeInTheDocument();
    });
  });

  describe('Fetch New Games', () => {
    it('should fetch new games from Odds API', async () => {
      // Mock initial empty games
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(
        <GamesPreview
          week={mockWeek}
          onGamesSaved={mockOnGamesSaved}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Fetch New Games from API')).toBeInTheDocument();
      });

      // Mock fetch new games response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            nfl: [mockGames[0]],
            college: [mockGames[1]],
          },
        }),
      });

      // Click fetch games button
      fireEvent.click(screen.getByText('Fetch New Games from API'));

      // Should show loading
      expect(screen.getByText('Fetching games...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('NFL Games (1)')).toBeInTheDocument();
        expect(screen.getByText('College Football Games (1)')).toBeInTheDocument();
      });

      // Should show save games button for new games
      expect(screen.getByText('Save Games')).toBeInTheDocument();
    });

    it('should display error when fetch fails', async () => {
      // Mock initial empty games
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(
        <GamesPreview
          week={mockWeek}
          onGamesSaved={mockOnGamesSaved}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Fetch New Games from API')).toBeInTheDocument();
      });

      // Mock fetch failure
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: false,
          error: 'Failed to fetch games',
        }),
      });

      // Click fetch games button
      fireEvent.click(screen.getByText('Fetch New Games from API'));

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch games')).toBeInTheDocument();
      });

      // Should show dismiss button
      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    });
  });

  describe('Save Games', () => {
    it('should save games to the week', async () => {
      // Mock initial empty games
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(
        <GamesPreview
          week={mockWeek}
          onGamesSaved={mockOnGamesSaved}
          onCancel={mockOnCancel}
        />
      );

      // Wait for initial load to complete
      await waitFor(() => {
        expect(screen.getByText('Fetch New Games from API')).toBeInTheDocument();
      });

      // Mock fetch new games response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            nfl: [mockGames[0]],
            college: [mockGames[1]],
          },
        }),
      });

      // Fetch games first
      await act(async () => {
        fireEvent.click(screen.getByText('Fetch New Games from API'));
      });

      await waitFor(() => {
        expect(screen.getByText('Save Games')).toBeInTheDocument();
      });

      // Mock save games response and reload
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: { games: mockGames },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: mockGames,
          }),
        });

      // Click save games button
      await act(async () => {
        fireEvent.click(screen.getByText('Save Games'));
      });

      await waitFor(() => {
        expect(mockOnGamesSaved).toHaveBeenCalled();
      });
    });

    it('should display error when save fails', async () => {
      // Mock initial empty games
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(
        <GamesPreview
          week={mockWeek}
          onGamesSaved={mockOnGamesSaved}
          onCancel={mockOnCancel}
        />
      );

      // Wait for initial load to complete
      await waitFor(() => {
        expect(screen.getByText('Fetch New Games from API')).toBeInTheDocument();
      });

      // Mock fetch new games response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            nfl: [mockGames[0]],
            college: [mockGames[1]],
          },
        }),
      });

      // Fetch games first
      await act(async () => {
        fireEvent.click(screen.getByText('Fetch New Games from API'));
      });

      await waitFor(() => {
        expect(screen.getByText('Save Games')).toBeInTheDocument();
      });

      // Mock save failure
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: false,
          error: 'Failed to save games',
        }),
      });

      // Click save games button
      await act(async () => {
        fireEvent.click(screen.getByText('Save Games'));
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to save games')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Games', () => {
    it('should delete existing games', async () => {
      // Mock existing games
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: mockGames,
        }),
      });

      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => true);

      render(
        <GamesPreview
          week={mockWeek}
          onGamesSaved={mockOnGamesSaved}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Delete Games')).toBeInTheDocument();
      });

      // Mock delete success
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: { deleted: true },
        }),
      });

      // Click delete games button
      await act(async () => {
        fireEvent.click(screen.getByText('Delete Games'));
      });

      // Should show confirmation dialog
      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete all games for this week? This action cannot be undone.'
      );

      await waitFor(() => {
        expect(screen.getByText('Click the button below to fetch games from The Odds API for this week.')).toBeInTheDocument();
      });

      // Restore original confirm
      window.confirm = originalConfirm;
    });

    it('should not delete when user cancels confirmation', async () => {
      // Mock existing games
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: mockGames,
        }),
      });

      // Mock window.confirm to return false
      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => false);

      render(
        <GamesPreview
          week={mockWeek}
          onGamesSaved={mockOnGamesSaved}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Delete Games')).toBeInTheDocument();
      });

      // Click delete games button
      await act(async () => {
        fireEvent.click(screen.getByText('Delete Games'));
      });

      // Should show confirmation dialog but not make delete request
      expect(window.confirm).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only the initial load

      // Restore original confirm
      window.confirm = originalConfirm;
    });
  });

  describe('UI Components', () => {
    it('should render week information correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(
        <GamesPreview
          week={mockWeek}
          onGamesSaved={mockOnGamesSaved}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Games Preview - Test Week')).toBeInTheDocument();
    });

    it('should format game spreads correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: mockGames,
        }),
      });

      render(
        <GamesPreview
          week={mockWeek}
          onGamesSaved={mockOnGamesSaved}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        // Should format negative spreads without extra minus
        expect(screen.getByText('-3.5')).toBeInTheDocument();
        expect(screen.getByText('-7')).toBeInTheDocument();
      });
    });

    it('should call onCancel when cancel button is clicked', async () => {
      // Mock existing games so the actions section with Cancel button is shown
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: mockGames,
        }),
      });

      render(
        <GamesPreview
          week={mockWeek}
          onGamesSaved={mockOnGamesSaved}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('NFL Games (1)')).toBeInTheDocument();
      });

      // The Cancel button should be available at the bottom when games are displayed
      expect(screen.getByText('Cancel')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByText('Cancel'));
      });
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should dismiss error messages', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(
        <GamesPreview
          week={mockWeek}
          onGamesSaved={mockOnGamesSaved}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Fetch New Games from API')).toBeInTheDocument();
      });

      // Mock fetch failure to show error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: false,
          error: 'Test error message',
        }),
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Fetch New Games from API'));
      });

      await waitFor(() => {
        expect(screen.getByText('Test error message')).toBeInTheDocument();
      });

      // Click dismiss button
      await act(async () => {
        fireEvent.click(screen.getByText('Dismiss'));
      });

      await waitFor(() => {
        expect(screen.queryByText('Test error message')).not.toBeInTheDocument();
      });
    });
  });

  describe('Authorization', () => {
    it('should include authorization headers in requests', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(
        <GamesPreview
          week={mockWeek}
          onGamesSaved={mockOnGamesSaved}
          onCancel={mockOnCancel}
        />
      );

      // Check initial load request
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/weeks/1/games',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });
  });
});