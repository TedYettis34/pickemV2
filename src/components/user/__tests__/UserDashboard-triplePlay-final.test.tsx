import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserDashboard } from '../UserDashboard';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock user context
jest.mock('../../../lib/userAuth', () => ({
  getCurrentUserContext: () => ({ userId: 'test-user-123', username: 'testuser' }),
  getAuthHeaders: async () => ({
    'Authorization': 'Bearer test-token',
    'X-User-ID': 'test-user-123',
  }),
}));

describe('UserDashboard - Triple Play Retention Test', () => {
  const mockProps = {
    onSignOut: jest.fn(),
    isAdmin: false,
    onShowAdminPanel: jest.fn(),
    isAuthenticated: true,
    authMessage: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.confirm to always return true
    window.confirm = jest.fn(() => true);
  });

  it('should retain triple play flag when unsubmitting and resubmitting picks', async () => {
    // Test scenario: User has unsubmitted picks with triple play flag
    // After un-submit, the triple play flag should be preserved
    
    const mockWeek = {
      id: 1,
      name: 'Week 1',
      description: 'Test week',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-07T23:59:59Z',
      max_triple_plays: 3,
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
        commence_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        spread_home: -3.5,
        total_over_under: 47.5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    // User has unsubmitted pick with triple play flag (as if they just unsubmitted)
    const unsubmittedPick = {
      id: 1,
      user_id: 'test-user-123',
      game_id: 1,
      pick_type: 'home_spread' as const,
      spread_value: -3.5,
      submitted: false,  // Key: this is unsubmitted
      is_triple_play: true, // Key: triple play flag is preserved
      result: null,
      evaluated_at: null,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
    };

    // Set up API responses
    const oddsStatus = { lastUpdated: null, needsUpdate: false, nextUpdateDue: null, timeSinceUpdate: null };
    
    // Component initialization calls
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockWeek }),
    } as Response);
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: oddsStatus }),
    } as Response);
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { gamesChecked: 0, gamesUpdated: 0, errors: [] }}),
    } as Response);
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: oddsStatus }),
    } as Response);
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockGames }),
    } as Response);
    
    // User picks - unsubmitted pick with triple play
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [unsubmittedPick] }),
    } as Response);
    
    // No picks summary (since not submitted)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: null }),
    } as Response);

    await act(async () => {
      render(<UserDashboard {...mockProps} />);
    });

    // Verify component loads and shows the unsubmitted pick
    await waitFor(() => {
      expect(screen.getByText('Week 1')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify the triple play flag is preserved
    await waitFor(() => {
      const triplePlayCheckbox = screen.getByLabelText(/Mark as Triple Play/);
      expect(triplePlayCheckbox).toBeChecked();
    });

    // Verify triple play count is correct
    await waitFor(() => {
      expect(screen.getByText('(1/3 used)')).toBeInTheDocument();
    });

    // Now test resubmission - mock the API call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    // Mock the reload after submit - pick becomes submitted with triple play preserved
    const submittedPick = { ...unsubmittedPick, submitted: true };
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [submittedPick] }),
    } as Response);
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        success: true, 
        data: {
          weekId: 1,
          weekName: 'Week 1', 
          totalGames: 1,
          totalPicks: 1,
          submittedAt: '2024-01-01T13:00:00Z',
          picks: [{ ...submittedPick, game: mockGames[0] }],
        }
      }),
    } as Response);

    // Go to review tab and submit
    const reviewTab = screen.getByRole('button', { name: /Review Picks/ });
    await act(async () => {
      await userEvent.click(reviewTab);
    });

    const submitButton = screen.getByRole('button', { name: /Submit All Picks/ });
    await act(async () => {
      await userEvent.click(submitButton);
    });

    // Verify the API was called with triple play preserved
    const submitCalls = mockFetch.mock.calls.filter(call => 
      call[0] === '/api/picks/bulk-submit' && call[1]?.method === 'POST'
    );
    
    expect(submitCalls.length).toBe(1);
    const submitBody = JSON.parse(submitCalls[0][1]?.body as string);
    expect(submitBody.picks).toHaveLength(1);
    expect(submitBody.picks[0].is_triple_play).toBe(true);
    expect(submitBody.picks[0].game_id).toBe(1);
    expect(submitBody.picks[0].pick_type).toBe('home_spread');
  });
});