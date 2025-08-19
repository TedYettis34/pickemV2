import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserDashboard } from '../UserDashboard';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('UserDashboard', () => {
  const mockProps = {
    onSignOut: jest.fn(),
    isAdmin: false,
    onShowAdminPanel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: null }),
    } as Response);

    render(<UserDashboard {...mockProps} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('PickEm Dashboard')).toBeInTheDocument();
  });

  it('should show admin panel button when user is admin', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: null }),
    } as Response);

    render(<UserDashboard {...mockProps} isAdmin={true} />);

    expect(screen.getByRole('button', { name: 'Admin Panel' })).toBeInTheDocument();
  });

  it('should not show admin panel button when user is not admin', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: null }),
    } as Response);

    render(<UserDashboard {...mockProps} isAdmin={false} />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Admin Panel' })).not.toBeInTheDocument();
    });
  });

  it('should display no active week message when no week is active', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: null, message: 'No active week found' }),
    } as Response);

    render(<UserDashboard {...mockProps} />);

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

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockWeek }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

    render(<UserDashboard {...mockProps} />);

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

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockWeek }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockGames }),
      } as Response);

    render(<UserDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Week 1')).toBeInTheDocument();
      expect(screen.getByText('First week of the season')).toBeInTheDocument();
      expect(screen.getByText('Make Picks (2 games)')).toBeInTheDocument();
      expect(screen.getByText('Bills @ Chiefs')).toBeInTheDocument();
      expect(screen.getByText('Georgia @ Alabama')).toBeInTheDocument();
      expect(screen.getByText('NFL')).toBeInTheDocument();
      expect(screen.getByText('College')).toBeInTheDocument();
      expect(screen.getByText('Spread: Chiefs -3.5')).toBeInTheDocument();
      expect(screen.getByText('Total: 47.5')).toBeInTheDocument();
    });
  });

  it('should handle API error when fetching active week', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: 'Network error' }),
    } as Response);

    render(<UserDashboard {...mockProps} />);

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
        ok: false,
        json: async () => ({ success: false, error: 'Failed to fetch games' }),
      } as Response);

    render(<UserDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch games')).toBeInTheDocument();
    });
  });

  it('should call onSignOut when sign out button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: null }),
    } as Response);

    const user = userEvent.setup();
    render(<UserDashboard {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
    });

    const signOutButton = screen.getByRole('button', { name: 'Sign Out' });
    await user.click(signOutButton);

    expect(mockProps.onSignOut).toHaveBeenCalledTimes(1);
  });

  it('should call onShowAdminPanel when admin panel button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: null }),
    } as Response);

    const user = userEvent.setup();
    render(<UserDashboard {...mockProps} isAdmin={true} />);

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

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockWeek }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [mockGame] }),
      } as Response);

    render(<UserDashboard {...mockProps} />);

    await waitFor(() => {
      // Should format the time as a readable date/time string
      expect(screen.getByText(/Mon, Jan 1/)).toBeInTheDocument();
    });
  });

  it('should handle network errors during fetch', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<UserDashboard {...mockProps} />);

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

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockWeek }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

    render(<UserDashboard {...mockProps} />);

    await waitFor(() => {
      // Look for the date range pattern (more flexible)
      expect(screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4} - \d{1,2}\/\d{1,2}\/\d{4}/)).toBeInTheDocument();
    });
  });
});