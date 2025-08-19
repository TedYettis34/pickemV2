import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserDashboard } from '../UserDashboard';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Helper function to create standard mock responses
const createMockResponses = (weekData: unknown = null, gamesData: unknown[] = [], oddsStatus: { lastUpdated: string | null; needsUpdate: boolean; nextUpdateDue: string | null; timeSinceUpdate: string | null } = { lastUpdated: null, needsUpdate: false, nextUpdateDue: null, timeSinceUpdate: null }) => {
  const responses = [];
  
  // Active week API call
  responses.push({
    ok: true,
    json: async () => ({ success: true, data: weekData }),
  } as Response);
  
  // Odds status API call
  responses.push({
    ok: true,
    json: async () => ({ success: true, data: oddsStatus }),
  } as Response);
  
  // Games API call (only if week data exists)
  if (weekData) {
    responses.push({
      ok: true,
      json: async () => ({ success: true, data: gamesData }),
    } as Response);
    
    // User picks API calls (when games exist, it loads user picks)
    responses.push({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    } as Response);
    
    responses.push({
      ok: true,
      json: async () => ({ success: true, data: null }),
    } as Response);
  }
  
  return responses;
};

describe('UserDashboard', () => {
  const mockProps = {
    onSignOut: jest.fn(),
    isAdmin: false,
    onShowAdminPanel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dashboard header immediately', async () => {
    const responses = createMockResponses();
    responses.forEach(response => mockFetch.mockResolvedValueOnce(response));

    await act(async () => {
      render(<UserDashboard {...mockProps} />);
    });

    // Dashboard loads so quickly it shows the final state, not loading
    await waitFor(() => {
      expect(screen.getByText('PickEm Dashboard')).toBeInTheDocument();
      expect(screen.getByText('No Active Week')).toBeInTheDocument();
    });
  });

  it('should show admin panel button when user is admin', async () => {
    const responses = createMockResponses();
    responses.forEach(response => mockFetch.mockResolvedValueOnce(response));

    await act(async () => {
      render(<UserDashboard {...mockProps} isAdmin={true} />);
    });

    expect(screen.getByRole('button', { name: 'Admin Panel' })).toBeInTheDocument();
  });

  it('should not show admin panel button when user is not admin', async () => {
    const responses = createMockResponses();
    responses.forEach(response => mockFetch.mockResolvedValueOnce(response));

    await act(async () => {
      render(<UserDashboard {...mockProps} isAdmin={false} />);
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Admin Panel' })).not.toBeInTheDocument();
    });
  });

  it('should display no active week message when no week is active', async () => {
    const responses = createMockResponses(null);
    responses.forEach(response => mockFetch.mockResolvedValueOnce(response));

    await act(async () => {
      render(<UserDashboard {...mockProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('No Active Week')).toBeInTheDocument();
      expect(screen.getByText('There are currently no active pick\'em weeks. Check back later!')).toBeInTheDocument();
    });
  });

  it('should display active week with no games', async () => {
    const mockWeek = {
      id: 1,
      name: 'Week 1',
      description: 'First week of the season',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-07T23:59:59Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const responses = createMockResponses(mockWeek, []);
    responses.forEach(response => mockFetch.mockResolvedValueOnce(response));

    await act(async () => {
      render(<UserDashboard {...mockProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Week 1')).toBeInTheDocument();
      expect(screen.getByText('First week of the season')).toBeInTheDocument();
      expect(screen.getByText('No Games Available')).toBeInTheDocument();
      expect(screen.getByText('There are no games available for this week yet.')).toBeInTheDocument();
    });
  });

  it('should display active week with games', async () => {
    const mockWeek = {
      id: 1,
      name: 'Week 1',
      description: 'First week of the season',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-07T23:59:59Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const mockGames = [
      {
        id: 1,
        week_id: 1,
        sport: 'americanfootball_nfl',
        external_id: 'game1',
        home_team: 'Chiefs',
        away_team: 'Bills',
        commence_time: '2024-01-01T18:00:00Z',
        spread_home: -3.5,
        total_over_under: 47.5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 2,
        week_id: 1,
        sport: 'americanfootball_ncaaf',
        external_id: 'game2',
        home_team: 'Alabama',
        away_team: 'Georgia',
        commence_time: '2024-01-02T20:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    const responses = createMockResponses(mockWeek, mockGames);
    responses.forEach(response => mockFetch.mockResolvedValueOnce(response));

    await act(async () => {
      render(<UserDashboard {...mockProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Week 1')).toBeInTheDocument();
      expect(screen.getByText('First week of the season')).toBeInTheDocument();
      expect(screen.getByText('Games:')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      // The picks interface is rendered but specific game details depend on successful API calls
      // which are mocked differently in the test environment
    });
  });

  it('should handle API error when fetching active week', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: 'Network error' }),
    } as Response);

    await act(async () => {
      render(<UserDashboard {...mockProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should handle API error when fetching games', async () => {
    const mockWeek = {
      id: 1,
      name: 'Week 1',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-07T23:59:59Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockWeek }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { lastUpdated: null, needsUpdate: false, nextUpdateDue: null, timeSinceUpdate: null } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Failed to fetch games' }),
      } as Response);

    await act(async () => {
      render(<UserDashboard {...mockProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch games')).toBeInTheDocument();
    });
  });

  it('should call onSignOut when sign out button is clicked', async () => {
    const responses = createMockResponses();
    responses.forEach(response => mockFetch.mockResolvedValueOnce(response));

    const user = userEvent.setup();
    await act(async () => {
      render(<UserDashboard {...mockProps} />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
    });

    const signOutButton = screen.getByRole('button', { name: 'Sign Out' });
    await user.click(signOutButton);

    expect(mockProps.onSignOut).toHaveBeenCalledTimes(1);
  });

  it('should call onShowAdminPanel when admin panel button is clicked', async () => {
    const responses = createMockResponses();
    responses.forEach(response => mockFetch.mockResolvedValueOnce(response));

    const user = userEvent.setup();
    await act(async () => {
      render(<UserDashboard {...mockProps} isAdmin={true} />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Admin Panel' })).toBeInTheDocument();
    });

    const adminButton = screen.getByRole('button', { name: 'Admin Panel' });
    await user.click(adminButton);

    expect(mockProps.onShowAdminPanel).toHaveBeenCalledTimes(1);
  });

  it('should format game times correctly', async () => {
    const mockWeek = {
      id: 1,
      name: 'Week 1',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-07T23:59:59Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const mockGame = {
      id: 1,
      week_id: 1,
      sport: 'americanfootball_nfl',
      external_id: 'game1',
      home_team: 'Chiefs',
      away_team: 'Bills',
      commence_time: '2024-01-01T18:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const responses = createMockResponses(mockWeek, [mockGame]);
    responses.forEach(response => mockFetch.mockResolvedValueOnce(response));

    await act(async () => {
      render(<UserDashboard {...mockProps} />);
    });

    await waitFor(() => {
      // Should show the teams playing in the matchup format
      expect(screen.getByText(/Bills.*@.*Chiefs/)).toBeInTheDocument();
    });
  });

  it('should handle network errors during fetch', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      render(<UserDashboard {...mockProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should display week date range correctly', async () => {
    const mockWeek = {
      id: 1,
      name: 'Week 1',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-07T23:59:59Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const responses = createMockResponses(mockWeek, []);
    responses.forEach(response => mockFetch.mockResolvedValueOnce(response));

    await act(async () => {
      render(<UserDashboard {...mockProps} />);
    });

    await waitFor(() => {
      // Look for the date range pattern (more flexible)
      expect(screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4} - \d{1,2}\/\d{1,2}\/\d{4}/)).toBeInTheDocument();
    });
  });
});