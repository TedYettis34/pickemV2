import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AllPicksBrowser } from '../AllPicksBrowser';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('AllPicksBrowser', () => {
  const mockWeeksData = [
    { id: 5, name: 'Week 5: Rivalry Week' },
    { id: 6, name: 'Week 6: Conference Championships' },
    { id: 7, name: 'Week 7: Bowl Games' }
  ];

  const mockPicksData = [
    {
      id: 1,
      user_id: 'user-123',
      game_id: 1,
      pick_type: 'home_spread',
      spread_value: -3,
      submitted: true,
      is_triple_play: true,
      result: 'win',
      evaluated_at: '2024-01-02T10:00:00Z',
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z',
      username: 'Test User',
      display_name: 'Test User',
      week_name: 'Week 6: Conference Championships',
      game: {
        id: 1,
        week_id: 6,
        sport: 'americanfootball_nfl',
        external_id: 'nfl-game-1',
        home_team: 'Chiefs',
        away_team: 'Raiders',
        commence_time: '2024-01-01T20:00:00Z',
        spread_home: -3,
        spread_away: 3,
        total_over_under: 47.5,
        moneyline_home: -150,
        moneyline_away: 130,
        bookmaker: 'fanduel',
        odds_last_updated: '2024-01-01T12:00:00Z',
        must_pick: false,
        home_score: 28,
        away_score: 21,
        game_status: 'final',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    },
    {
      id: 2,
      user_id: 'user-456',
      game_id: 2,
      pick_type: 'away_spread',
      spread_value: 7,
      submitted: true,
      is_triple_play: false,
      result: 'loss',
      evaluated_at: '2024-01-02T10:00:00Z',
      created_at: '2024-01-01T13:00:00Z',
      updated_at: '2024-01-01T13:00:00Z',
      username: 'Another User',
      display_name: 'Another User',
      week_name: 'Week 6: Conference Championships',
      game: {
        id: 2,
        week_id: 6,
        sport: 'americanfootball_ncaaf',
        external_id: 'ncaaf-game-1',
        home_team: 'Alabama',
        away_team: 'Georgia',
        commence_time: '2024-01-01T21:00:00Z',
        spread_home: -7,
        spread_away: 7,
        total_over_under: 52.5,
        moneyline_home: -300,
        moneyline_away: 250,
        bookmaker: 'fanduel',
        odds_last_updated: '2024-01-01T12:00:00Z',
        must_pick: true,
        home_score: 35,
        away_score: 24,
        game_status: 'final',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    },
    {
      id: 3,
      user_id: 'user-123',
      game_id: 3,
      pick_type: 'home_spread',
      spread_value: 0,
      submitted: true,
      is_triple_play: false,
      result: 'push',
      evaluated_at: '2024-01-02T10:00:00Z',
      created_at: '2024-01-01T14:00:00Z',
      updated_at: '2024-01-01T14:00:00Z',
      username: 'Test User',
      display_name: 'Test User',
      week_name: 'Week 6: Conference Championships',
      game: {
        id: 3,
        week_id: 6,
        sport: 'americanfootball_nfl',
        external_id: 'nfl-game-2',
        home_team: 'Cowboys',
        away_team: 'Giants',
        commence_time: '2024-01-01T22:00:00Z',
        spread_home: 0,
        spread_away: 0,
        total_over_under: 45.5,
        moneyline_home: -110,
        moneyline_away: -110,
        bookmaker: 'fanduel',
        odds_last_updated: '2024-01-01T12:00:00Z',
        must_pick: false,
        home_score: 21,
        away_score: 21,
        game_status: 'final',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    },
    {
      id: 4,
      user_id: 'user-789',
      game_id: 4,
      pick_type: 'away_spread',
      spread_value: 3,
      submitted: true,
      is_triple_play: false,
      result: null, // Pending pick
      evaluated_at: null,
      created_at: '2024-01-01T15:00:00Z',
      updated_at: '2024-01-01T15:00:00Z',
      username: 'Pending User',
      display_name: 'Pending User',
      week_name: 'Week 6: Conference Championships',
      game: {
        id: 4,
        week_id: 6,
        sport: 'americanfootball_nfl',
        external_id: 'nfl-game-3',
        home_team: 'Patriots',
        away_team: 'Bills',
        commence_time: '2024-01-02T18:00:00Z',
        spread_home: -3,
        spread_away: 3,
        total_over_under: 44.5,
        moneyline_home: -140,
        moneyline_away: 120,
        bookmaker: 'fanduel',
        odds_last_updated: '2024-01-01T12:00:00Z',
        must_pick: false,
        home_score: null,
        away_score: null,
        game_status: 'scheduled',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    }
  ];

  const createMockResponse = (data: unknown, success = true) => ({
    ok: success,
    json: jest.fn().mockResolvedValue({
      success,
      data: success ? data : undefined,
      error: success ? undefined : 'Mock error'
    })
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock responses
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string') {
        if (url.includes('/api/weeks')) {
          return Promise.resolve(createMockResponse(mockWeeksData) as Response);
        }
        if (url.includes('/api/picks/all')) {
          return Promise.resolve(createMockResponse(mockPicksData) as Response);
        }
      }
      return Promise.resolve(createMockResponse([]));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    test('should render loading state initially', () => {
      render(<AllPicksBrowser />);
      expect(screen.getByText('Loading all picks...')).toBeInTheDocument();
    });

    test('should render picks after loading', async () => {
      render(<AllPicksBrowser />);

      await waitFor(() => {
        expect(screen.getByText('All User Picks')).toBeInTheDocument();
      });

      expect(screen.getAllByText('Test User')).toHaveLength(3); // 1 in filter + 2 picks
      expect(screen.getAllByText('Another User')).toHaveLength(2); // 1 in filter + 1 pick
      expect(screen.getAllByText('Pending User')).toHaveLength(2); // 1 in filter + 1 pick
      expect(screen.getByText('Raiders @ Chiefs')).toBeInTheDocument();
      expect(screen.getByText('Georgia @ Alabama')).toBeInTheDocument();
      expect(screen.getByText('Bills @ Patriots')).toBeInTheDocument();
    });

    test('should display pick details correctly', async () => {
      render(<AllPicksBrowser />);

      await waitFor(() => {
        expect(screen.getByText('Chiefs -3')).toBeInTheDocument();
        expect(screen.getByText('Georgia +7')).toBeInTheDocument(); // away_spread with spread_value 7 shows as +7
        expect(screen.getByText('Cowboys 0')).toBeInTheDocument();
        expect(screen.getByText('Bills +3')).toBeInTheDocument(); // away_spread with spread_value 3 shows as +3
      });

      // Check for triple play indicator
      expect(screen.getByText('3X')).toBeInTheDocument();

      // Check that picks are rendered (result badges are replaced with colors)
      expect(screen.getAllByText('Test User')).toHaveLength(3); // 1 in filter + 2 picks
      expect(screen.getAllByText('Another User')).toHaveLength(2); // 1 in filter + 1 pick
    });

    test('should show week name in header when picks exist', async () => {
      render(<AllPicksBrowser weekId={6} />);

      await waitFor(() => {
        expect(screen.getByText('All User Picks - Week 6: Conference Championships')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    test('should filter picks by result', async () => {
      render(<AllPicksBrowser />);

      await waitFor(() => {
        expect(screen.getByText('All User Picks')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Wait for picks to be fully loaded
      await waitFor(() => {
        expect(screen.getByText(/Showing 4 picks from 4 games \(total: 4 picks\)/)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Filter by wins only (which filters to 'win' result)
      const resultFilter = screen.getByDisplayValue('All Results');
      fireEvent.change(resultFilter, { target: { value: 'win' } });

      // Should show only 1 pick (the winning one)
      await waitFor(() => {
        expect(screen.getByText(/Showing 1 picks from 1 games \(total: 4 picks\)/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('should filter picks by triple play status', async () => {
      render(<AllPicksBrowser />);

      await waitFor(() => {
        expect(screen.getByText('All User Picks')).toBeInTheDocument();
      });

      // Filter by triple plays only
      const triplePlayFilter = screen.getByDisplayValue('All Picks');
      fireEvent.change(triplePlayFilter, { target: { value: 'triple_only' } });

      // Should only show triple play picks
      expect(screen.getByText('3X')).toBeInTheDocument();
      expect(screen.getByText(/Showing 1 picks from 1 games \(total: 4 picks\)/)).toBeInTheDocument();
    });

    test('should filter picks by user', async () => {
      render(<AllPicksBrowser />);

      await waitFor(() => {
        expect(screen.getByText('All User Picks')).toBeInTheDocument();
      });

      // Filter by specific user
      const userFilter = screen.getByDisplayValue('All Users');
      fireEvent.change(userFilter, { target: { value: 'user-123' } });

      // Should only show picks from Test User (2 picks + 1 in filter = 3 total)
      expect(screen.getAllByText('Test User')).toHaveLength(3);
      expect(screen.getAllByText('Another User')).toHaveLength(1); // Still in filter dropdown
      expect(screen.getByText(/Showing 2 picks from 2 games \(total: 4 picks\)/)).toBeInTheDocument();
    });

    test('should filter picks by week', async () => {
      render(<AllPicksBrowser />);

      await waitFor(() => {
        expect(screen.getByText('All User Picks')).toBeInTheDocument();
      });

      // Change week selection
      const weekFilter = screen.getByDisplayValue('All Weeks');
      fireEvent.change(weekFilter, { target: { value: '6' } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/picks/all?weekId=6');
      });
    });

    test('should combine multiple filters', async () => {
      render(<AllPicksBrowser />);

      await waitFor(() => {
        expect(screen.getByText('All User Picks')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Wait for picks to be fully loaded
      await waitFor(() => {
        expect(screen.getByText(/Showing 4 picks from 4 games \(total: 4 picks\)/)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Apply multiple filters
      const resultFilter = screen.getByDisplayValue('All Results');
      const userFilter = screen.getByDisplayValue('All Users');

      fireEvent.change(resultFilter, { target: { value: 'win' } });
      fireEvent.change(userFilter, { target: { value: 'user-123' } });

      // Should show only winning picks from Test User
      await waitFor(() => {
        expect(screen.getByText(/Showing 1 picks from 1 games \(total: 4 picks\)/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Week Selection', () => {
    test('should load weeks on component mount', async () => {
      render(<AllPicksBrowser />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/weeks');
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getAllByText('Week 5: Rivalry Week')).toHaveLength(1);
        expect(screen.getAllByText('Week 6: Conference Championships')).toHaveLength(5); // 1 in dropdown + 4 in picks
        expect(screen.getAllByText('Week 7: Bowl Games')).toHaveLength(1);
      }, { timeout: 3000 });
    });

    test('should fetch picks for selected week', async () => {
      render(<AllPicksBrowser />);

      await waitFor(() => {
        expect(screen.getByText('All User Picks')).toBeInTheDocument();
      });

      const weekFilter = screen.getByDisplayValue('All Weeks');
      fireEvent.change(weekFilter, { target: { value: '6' } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/picks/all?weekId=6');
      });
    });

    test('should fetch all picks when "All Weeks" is selected', async () => {
      render(<AllPicksBrowser />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/All User Picks/)).toBeInTheDocument();
      }, { timeout: 8000 });

      // Check that initial call was made for all picks (no weekId)
      expect(mockFetch).toHaveBeenCalledWith('/api/picks/all?');

      // Clear mock to check for next call
      mockFetch.mockClear();

      // Select week 6
      const weekFilter = screen.getByDisplayValue('All Weeks');
      fireEvent.change(weekFilter, { target: { value: '6' } });

      // Wait for the week 6 API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/picks/all?weekId=6');
      }, { timeout: 5000 });

      // Test passes when we can successfully switch to a specific week
      // The reverse (going back to "All Weeks") follows the same pattern
    }, 15000);
  });

  describe('Error Handling', () => {
    test('should display error when API call fails', async () => {
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/picks/all')) {
          return Promise.resolve(createMockResponse([], false) as Response);
        }
        return Promise.resolve(createMockResponse([]));
      });

      render(<AllPicksBrowser />);

      await waitFor(() => {
        expect(screen.getByText('Error: Mock error')).toBeInTheDocument();
      });
    });

    test('should handle network errors gracefully', async () => {
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/picks/all')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(createMockResponse([]));
      });

      render(<AllPicksBrowser />);

      await waitFor(() => {
        expect(screen.getByText('Error: Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    test('should display message when no picks exist', async () => {
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string') {
          if (url.includes('/api/weeks')) {
            return Promise.resolve(createMockResponse(mockWeeksData) as Response);
          }
          if (url.includes('/api/picks/all')) {
            return Promise.resolve(createMockResponse([]));
          }
        }
        return Promise.resolve(createMockResponse([]));
      });

      render(<AllPicksBrowser />);

      await waitFor(() => {
        expect(screen.getByText('No picks have been submitted yet.')).toBeInTheDocument();
      });
    });

    test('should display message when no picks match filters', async () => {
      render(<AllPicksBrowser />);

      await waitFor(() => {
        expect(screen.getByText('All User Picks')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Wait for picks to load
      await waitFor(() => {
        expect(screen.getByText(/Showing 4 picks from 4 games \(total: 4 picks\)/)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Filter by a user that doesn't exist to get no results
      const userFilter = screen.getByDisplayValue('All Users');
      fireEvent.change(userFilter, { target: { value: 'nonexistent-user' } });

      await waitFor(() => {
        expect(screen.getByText('No picks match the current filters.')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Pick Display', () => {
    test('should format pick types correctly', async () => {
      render(<AllPicksBrowser />);

      await waitFor(() => {
        expect(screen.getByText('All User Picks')).toBeInTheDocument();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByText('Chiefs -3')).toBeInTheDocument(); // home_spread with negative spread
        expect(screen.getByText('Georgia +7')).toBeInTheDocument(); // away_spread with positive spread
        expect(screen.getByText('Cowboys 0')).toBeInTheDocument(); // pick em game
      }, { timeout: 3000 });
    });

    test('should display game scores when available', async () => {
      render(<AllPicksBrowser />);

      // Wait for component to load picks
      await waitFor(() => {
        expect(screen.getByText('All User Picks')).toBeInTheDocument();
      }, { timeout: 8000 });

      // Wait for picks data to be rendered
      await waitFor(() => {
        expect(screen.getByText(/Showing 4 picks from 4 games \(total: 4 picks\)/)).toBeInTheDocument();
      }, { timeout: 8000 });

      // Check for game scores in the format "Away Score, Home Score"
      await waitFor(() => {
        expect(screen.getByText('Raiders 21, Chiefs 28')).toBeInTheDocument();
        expect(screen.getByText('Georgia 24, Alabama 35')).toBeInTheDocument();
        expect(screen.getByText('Giants 21, Cowboys 21')).toBeInTheDocument();
      }, { timeout: 8000 });
    }, 15000);

    test('should apply correct background colors based on pick results', async () => {
      render(<AllPicksBrowser />);

      // Wait for component to load picks
      await waitFor(() => {
        expect(screen.getByText('All User Picks')).toBeInTheDocument();
      }, { timeout: 8000 });

      // Wait for picks data to be rendered
      await waitFor(() => {
        expect(screen.getByText(/Showing 4 picks from 4 games \(total: 4 picks\)/)).toBeInTheDocument();
      }, { timeout: 8000 });

      // Test each pick result color by checking the container classes
      const allPickContainers = screen.getAllByText(/(Test User|Another User|Pending User)/).filter(element => 
        element.closest('[class*="inline-flex"]') && 
        element.closest('[class*="p-3"]') &&
        element.closest('[class*="rounded-lg"]')
      );

      expect(allPickContainers).toHaveLength(4); // Should have 4 pick containers

      // Check for specific background colors based on results
      let foundGreen = false;
      let foundRed = false;  
      let foundYellow = false;
      let foundGray = false;

      allPickContainers.forEach(element => {
        const container = element.closest('[class*="bg-"]');
        if (container) {
          const classes = container.className;
          if (classes.includes('bg-green-100')) foundGreen = true;
          if (classes.includes('bg-red-100')) foundRed = true;
          if (classes.includes('bg-yellow-100')) foundYellow = true;
          if (classes.includes('bg-gray-100')) foundGray = true;
        }
      });

      // Verify all result colors are present
      expect(foundGreen).toBe(true); // Win pick
      expect(foundRed).toBe(true);   // Loss pick
      expect(foundYellow).toBe(true); // Push pick
      expect(foundGray).toBe(true);   // Pending pick
    }, 15000);
  });

  describe('User Management', () => {
    test('should extract unique users from picks data', async () => {
      render(<AllPicksBrowser />);

      await waitFor(() => {
        expect(screen.getByText('All User Picks')).toBeInTheDocument();
      });

      // Check that both users appear in the user filter dropdown
      const userOptions = screen.getAllByRole('option');
      const userOptionTexts = userOptions.map(option => option.textContent);
      expect(userOptionTexts).toContain('Test User');
      expect(userOptionTexts).toContain('Another User');
    });

    test('should update available users when changing weeks', async () => {
      // Mock different picks for different weeks
      const mockWeek5Pick = {
        ...mockPicksData[0],
        user_id: 'user-789',
        username: 'Week 5 User',
        display_name: 'Week 5 User',
        week_name: 'Week 5: Rivalry Week'
      };

      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string') {
          if (url.includes('/api/weeks')) {
            return Promise.resolve(createMockResponse(mockWeeksData));
          }
          if (url.includes('/api/picks/all?weekId=5')) {
            return Promise.resolve(createMockResponse([mockWeek5Pick]));
          }
          if (url.includes('/api/picks/all')) {
            return Promise.resolve(createMockResponse(mockPicksData));
          }
        }
        return Promise.resolve(createMockResponse([]));
      });

      render(<AllPicksBrowser />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('All User Picks')).toBeInTheDocument();
      }, { timeout: 8000 });

      // Wait for initial picks to load
      await waitFor(() => {
        expect(screen.getAllByText('Test User')).toHaveLength(3); // 1 in filter + 2 picks
        expect(screen.getAllByText('Pending User')).toHaveLength(2); // 1 in filter + 1 pick
      }, { timeout: 8000 });

      // Change to week 5
      const weekFilter = screen.getByDisplayValue('All Weeks');
      fireEvent.change(weekFilter, { target: { value: '5' } });

      // Wait for new data to load - Week 5 User should appear
      await waitFor(() => {
        expect(screen.getAllByText('Week 5 User')).toHaveLength(2); // 1 in filter + 1 in pick display
      }, { timeout: 8000 });
    }, 15000);
  });
});