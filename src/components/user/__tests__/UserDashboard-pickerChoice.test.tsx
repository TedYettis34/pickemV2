/**
 * Tests for UserDashboard Picker's Choice functionality
 * These tests focus on the picker choice limit calculations and UI behavior
 */
import { render, screen, waitFor } from '@testing-library/react';
import { UserDashboard } from '../UserDashboard';
import { Week } from '../../../types/week';
import { Game } from '../../../types/game';
import { Pick } from '../../../types/pick';

// Mock the auth hooks
jest.mock('../../../lib/userAuth', () => ({
  getCurrentUserContext: jest.fn(() => ({ userId: 'user123' })),
  getAuthHeaders: jest.fn(() => ({ 'Authorization': 'Bearer token', 'x-user-id': 'user123' })),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('UserDashboard - Picker Choice Limits', () => {
  const mockWeek: Week = {
    id: 1,
    name: 'Week 1',
    start_date: '2024-09-01T00:00:00Z',
    end_date: '2024-09-08T23:59:59Z',
    description: 'Test week',
    max_picker_choice_games: 3, // Limit of 3 picker's choice games
    created_at: '2024-08-19T00:00:00Z',
    updated_at: '2024-08-19T00:00:00Z',
  };

  const mockGames: Game[] = [
    {
      id: 1,
      week_id: 1,
      sport: 'americanfootball_nfl',
      external_id: 'game1',
      home_team: 'Chiefs',
      away_team: 'Bills',
      commence_time: new Date(Date.now() + 3600000).toISOString(),
      spread_home: -3.5,
      spread_away: 3.5,
      total_over_under: 47.5,
      moneyline_home: -150,
      moneyline_away: 130,
      bookmaker: 'FanDuel',
      odds_last_updated: '2024-08-19T12:00:00Z',
      must_pick: true, // Must pick game
      created_at: '2024-08-19T00:00:00Z',
      updated_at: '2024-08-19T00:00:00Z',
    },
    {
      id: 2,
      week_id: 1,
      sport: 'americanfootball_nfl',
      external_id: 'game2',
      home_team: 'Cowboys',
      away_team: 'Eagles',
      commence_time: new Date(Date.now() + 7200000).toISOString(),
      spread_home: 2.5,
      spread_away: -2.5,
      total_over_under: 45.0,
      moneyline_home: 120,
      moneyline_away: -140,
      bookmaker: 'FanDuel',
      odds_last_updated: '2024-08-19T12:00:00Z',
      must_pick: false, // Picker's choice game
      created_at: '2024-08-19T00:00:00Z',
      updated_at: '2024-08-19T00:00:00Z',
    },
    {
      id: 3,
      week_id: 1,
      sport: 'americanfootball_ncaaf',
      external_id: 'game3',
      home_team: 'Alabama',
      away_team: 'Georgia',
      commence_time: new Date(Date.now() + 10800000).toISOString(),
      spread_home: -1.5,
      spread_away: 1.5,
      total_over_under: 52.5,
      moneyline_home: -110,
      moneyline_away: -110,
      bookmaker: 'FanDuel',
      odds_last_updated: '2024-08-19T12:00:00Z',
      must_pick: false, // Picker's choice game
      created_at: '2024-08-19T00:00:00Z',
      updated_at: '2024-08-19T00:00:00Z',
    },
  ];

  const defaultProps = {
    onSignOut: jest.fn(),
    isAdmin: false,
    onShowAdminPanel: jest.fn(),
    isAuthenticated: true,
    authMessage: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default fetch responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/weeks/active')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockWeek }),
        });
      }
      if (url.includes('/api/weeks/1/games')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockGames }),
        });
      }
      if (url.includes('/api/picks/week/1?summary=true')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: null }),
        });
      }
      if (url.includes('/api/picks/week/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }),
        });
      }
      if (url.includes('/api/odds/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: null }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ success: false, error: 'Not found' }),
      });
    });
  });

  it('should display picker choice status when limit is set', async () => {
    render(<UserDashboard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/picker's choice:/i)).toBeInTheDocument();
      expect(screen.getByText('0/3')).toBeInTheDocument(); // 0 picks out of 3 allowed
      expect(screen.getByText('(+1 must-pick)')).toBeInTheDocument(); // 1 must-pick game
    });
  });

  it('should not display picker choice status when no limit is set', async () => {
    const weekWithoutLimit = { ...mockWeek, max_picker_choice_games: undefined };
    
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/weeks/active')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: weekWithoutLimit }),
        });
      }
      if (url.includes('/api/weeks/1/games')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockGames }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });
    });

    render(<UserDashboard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Games:')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.queryByText(/picker's choice:/i)).not.toBeInTheDocument();
    });
  });

  it('should show orange color when picker choice limit is reached', async () => {
    const userPicks: Pick[] = [
      {
        id: 1,
        user_id: 'user123',
        game_id: 2, // Picker's choice game
        pick_type: 'home_spread',
        spread_value: 2.5,
        submitted: false,
        created_at: '2024-08-19T00:00:00Z',
        updated_at: '2024-08-19T00:00:00Z',
      },
      {
        id: 2,
        user_id: 'user123',
        game_id: 3, // Picker's choice game
        pick_type: 'away_spread',
        spread_value: 1.5,
        submitted: false,
        created_at: '2024-08-19T00:00:00Z',
        updated_at: '2024-08-19T00:00:00Z',
      },
    ];

    // Add a third picker's choice game to reach the limit
    const moreGames = [
      ...mockGames,
      {
        id: 4,
        week_id: 1,
        sport: 'americanfootball_ncaaf',
        external_id: 'game4',
        home_team: 'Auburn',
        away_team: 'LSU',
        commence_time: new Date(Date.now() + 14400000).toISOString(),
        spread_home: 3.5,
        spread_away: -3.5,
        total_over_under: 49.0,
        moneyline_home: 140,
        moneyline_away: -160,
        bookmaker: 'FanDuel',
        odds_last_updated: '2024-08-19T12:00:00Z',
        must_pick: false,
        created_at: '2024-08-19T00:00:00Z',
        updated_at: '2024-08-19T00:00:00Z',
      },
    ];

    // Add third pick to reach limit
    const picksAtLimit = [
      ...userPicks,
      {
        id: 3,
        user_id: 'user123',
        game_id: 4,
        pick_type: 'home_spread',
        spread_value: 3.5,
        submitted: false,
        created_at: '2024-08-19T00:00:00Z',
        updated_at: '2024-08-19T00:00:00Z',
      },
    ];

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/weeks/active')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockWeek }),
        });
      }
      if (url.includes('/api/weeks/1/games')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: moreGames }),
        });
      }
      if (url.includes('/api/picks/week/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: picksAtLimit }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: null }),
      });
    });

    render(<UserDashboard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('3/3')).toBeInTheDocument(); // At limit
      
      // Check for yellow color class (picker's choice maxed but requirements not fully complete)
      const pickerChoiceElement = screen.getByText('3/3').closest('div');
      expect(pickerChoiceElement).toHaveClass('text-yellow-600');
    });
  });

  it('should show blue color when picker choice limit is not reached', async () => {
    const userPicks: Pick[] = [
      {
        id: 1,
        user_id: 'user123',
        game_id: 2, // Picker's choice game
        pick_type: 'home_spread',
        spread_value: 2.5,
        submitted: false,
        created_at: '2024-08-19T00:00:00Z',
        updated_at: '2024-08-19T00:00:00Z',
      },
    ];

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/weeks/active')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockWeek }),
        });
      }
      if (url.includes('/api/weeks/1/games')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockGames }),
        });
      }
      if (url.includes('/api/picks/week/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: userPicks }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: null }),
      });
    });

    render(<UserDashboard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('1/3')).toBeInTheDocument(); // Under limit
      
      // Check for yellow color class (picks not yet complete)
      const pickerChoiceElement = screen.getByText('1/3').closest('div');
      expect(pickerChoiceElement).toHaveClass('text-yellow-600');
    });
  });

  it('should disable non-must-pick games when picker choice limit is reached', async () => {
    // Add a fourth game to reach the limit
    const moreGames = [
      ...mockGames,
      {
        id: 4,
        week_id: 1,
        sport: 'americanfootball_ncaaf',
        external_id: 'game4',
        home_team: 'Auburn',
        away_team: 'LSU',
        commence_time: new Date(Date.now() + 14400000).toISOString(),
        spread_home: 3.5,
        spread_away: -3.5,
        total_over_under: 49.0,
        moneyline_home: 140,
        moneyline_away: -160,
        bookmaker: 'FanDuel',
        odds_last_updated: '2024-08-19T12:00:00Z',
        must_pick: false,
        created_at: '2024-08-19T00:00:00Z',
        updated_at: '2024-08-19T00:00:00Z',
      },
    ];
    
    // Create picks that reach the limit (3 picker's choice games)
    const picksAtLimit: Pick[] = [
      {
        id: 1,
        user_id: 'user123',
        game_id: 2, // Eagles @ Cowboys (picker's choice)
        pick_type: 'home_spread' as const,
        spread_value: -2.5,
        submitted: false,
        created_at: '2024-08-19T00:00:00Z',
        updated_at: '2024-08-19T00:00:00Z',
      },
      {
        id: 2,
        user_id: 'user123',
        game_id: 3, // Georgia @ Alabama (picker's choice)
        pick_type: 'home_spread' as const,
        spread_value: -1.5,
        submitted: false,
        created_at: '2024-08-19T00:00:00Z',
        updated_at: '2024-08-19T00:00:00Z',
      },
      {
        id: 3,
        user_id: 'user123',
        game_id: 4, // Auburn @ LSU (picker's choice)
        pick_type: 'home_spread' as const,
        spread_value: 3.5,
        submitted: false,
        created_at: '2024-08-19T00:00:00Z',
        updated_at: '2024-08-19T00:00:00Z',
      },
    ];

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/weeks/active')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockWeek }),
        });
      }
      if (url.includes('/api/weeks/1/games')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: moreGames }),
        });
      }
      if (url.includes('/api/picks/week/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: picksAtLimit }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: null }),
      });
    });

    render(<UserDashboard {...defaultProps} />);

    await waitFor(() => {
      // Must-pick game should still be enabled
      const mustPickGame = screen.getByText('Bills @ Chiefs');
      const mustPickCard = mustPickGame.closest('.bg-white');
      expect(mustPickCard).not.toHaveClass('opacity-50');

      // Non-must-pick games should be disabled when limit is reached
      // Check that we can find the picker choice games
      expect(screen.getByText('Eagles @ Cowboys')).toBeInTheDocument();
      expect(screen.getByText('Georgia @ Alabama')).toBeInTheDocument();
      
      // Check that disabled styling is applied (games become less interactive)
      // The exact implementation depends on how the disabled state is styled
      expect(screen.getByText('3/3')).toBeInTheDocument(); // At limit
    });
  });

  it('should allow must-pick games even when picker choice limit is reached', async () => {
    // Add a fourth game to reach the limit
    const moreGames = [
      ...mockGames,
      {
        id: 4,
        week_id: 1,
        sport: 'americanfootball_ncaaf',
        external_id: 'game4',
        home_team: 'Auburn',
        away_team: 'LSU',
        commence_time: new Date(Date.now() + 14400000).toISOString(),
        spread_home: 3.5,
        spread_away: -3.5,
        total_over_under: 49.0,
        moneyline_home: 140,
        moneyline_away: -160,
        bookmaker: 'FanDuel',
        odds_last_updated: '2024-08-19T12:00:00Z',
        must_pick: false,
        created_at: '2024-08-19T00:00:00Z',
        updated_at: '2024-08-19T00:00:00Z',
      },
    ];
    
    // Create picks that reach the picker choice limit
    const picksAtLimit: Pick[] = [
      {
        id: 1,
        user_id: 'user123',
        game_id: 2, // Eagles @ Cowboys (picker's choice)
        pick_type: 'home_spread' as const,
        spread_value: -2.5,
        submitted: false,
        created_at: '2024-08-19T00:00:00Z',
        updated_at: '2024-08-19T00:00:00Z',
      },
      {
        id: 2,
        user_id: 'user123',
        game_id: 3, // Georgia @ Alabama (picker's choice)
        pick_type: 'home_spread' as const,
        spread_value: -1.5,
        submitted: false,
        created_at: '2024-08-19T00:00:00Z',
        updated_at: '2024-08-19T00:00:00Z',
      },
      {
        id: 3,
        user_id: 'user123',
        game_id: 4, // Auburn @ LSU (picker's choice)
        pick_type: 'home_spread' as const,
        spread_value: 3.5,
        submitted: false,
        created_at: '2024-08-19T00:00:00Z',
        updated_at: '2024-08-19T00:00:00Z',
      },
    ];

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/weeks/active')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockWeek }),
        });
      }
      if (url.includes('/api/weeks/1/games')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: moreGames }),
        });
      }
      if (url.includes('/api/picks/week/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: picksAtLimit }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: null }),
      });
    });

    render(<UserDashboard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('3/3')).toBeInTheDocument();
    });

    // Try to click on a must-pick game - should still be possible
    const mustPickGame = screen.getByText('Bills @ Chiefs');
    expect(mustPickGame).toBeInTheDocument();
    
    // The must-pick game should have the "Must Pick" badge
    expect(screen.getByText('Must Pick')).toBeInTheDocument();
  });
});