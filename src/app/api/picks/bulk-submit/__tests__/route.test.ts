/**
 * @jest-environment node
 */

// Mock dependencies BEFORE imports
jest.mock('../../../../../lib/database', () => ({
  getDatabase: jest.fn(),
  closeDatabasePool: jest.fn(),
  query: jest.fn(),
  transaction: jest.fn(),
}));

jest.mock('../../../../../lib/picks', () => ({
  createOrUpdatePick: jest.fn(),
  validatePick: jest.fn(),
  hasSubmittedPicksForWeek: jest.fn(),
}));

jest.mock('../../../../../lib/users', () => ({
  syncUserFromCognito: jest.fn(),
  getUserByCognitoId: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { query } from '../../../../../lib/database';
import { createOrUpdatePick, validatePick, hasSubmittedPicksForWeek } from '../../../../../lib/picks';
import { getUserByCognitoId } from '../../../../../lib/users';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockCreateOrUpdatePick = createOrUpdatePick as jest.MockedFunction<typeof createOrUpdatePick>;
const mockValidatePick = validatePick as jest.MockedFunction<typeof validatePick>;
const mockHasSubmittedPicksForWeek = hasSubmittedPicksForWeek as jest.MockedFunction<typeof hasSubmittedPicksForWeek>;
// const mockSyncUserFromCognito = syncUserFromCognito as jest.MockedFunction<typeof syncUserFromCognito>;
const mockGetUserByCognitoId = getUserByCognitoId as jest.MockedFunction<typeof getUserByCognitoId>;

describe('/api/picks/bulk-submit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default user mocks
    mockGetUserByCognitoId.mockResolvedValue({
      id: 1,
      cognito_user_id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      timezone: 'UTC',
      is_admin: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
  });

  describe('POST', () => {
    const mockPicks = [
      { game_id: 1, pick_type: 'home_spread', spread_value: -3.5 },
      { game_id: 2, pick_type: 'away_spread', spread_value: 2.5 },
      { game_id: 3, pick_type: 'home_spread', spread_value: -1.5 },
    ];

    const createRequest = (body: { weekId: number; picks: Array<{ game_id: number; pick_type: string; spread_value?: number }> }) => {
      return new NextRequest('http://localhost:3000/api/picks/bulk-submit', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'x-user-id': 'user123',
        },
      });
    };

    it('should reject bulk submission when picker choice limit is exceeded', async () => {
      // Mock that picks haven't been submitted yet
      mockHasSubmittedPicksForWeek.mockResolvedValue(false);

      // Mock game details - 1 must-pick, 2 picker's choice games
      mockQuery.mockResolvedValueOnce([
        { id: 1, must_pick: true, week_id: 1 },
        { id: 2, must_pick: false, week_id: 1 }, // Picker's choice
        { id: 3, must_pick: false, week_id: 1 }, // Picker's choice
      ]);

      // Mock week with limit of 1 picker's choice game
      mockQuery.mockResolvedValueOnce([{ max_picker_choice_games: 1 }]);

      // Mock current picker's choice picks count (0 existing)
      mockQuery.mockResolvedValueOnce([{ count: '0' }]);

      const request = createRequest({
        weekId: 1,
        picks: mockPicks,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Would exceed picker\'s choice limit of 1 games');
      expect(data.error).toContain('Attempting to add: 2');
      expect(mockCreateOrUpdatePick).not.toHaveBeenCalled();
    });

    it('should allow bulk submission when within picker choice limit', async () => {
      // Mock that picks haven't been submitted yet
      mockHasSubmittedPicksForWeek.mockResolvedValue(false);

      // Mock game details - 1 must-pick, 2 picker's choice games
      mockQuery.mockResolvedValueOnce([
        { id: 1, must_pick: true, week_id: 1 },
        { id: 2, must_pick: false, week_id: 1 }, // Picker's choice
        { id: 3, must_pick: false, week_id: 1 }, // Picker's choice
      ]);

      // Mock week with limit of 3 picker's choice games
      mockQuery.mockResolvedValueOnce([{ max_picker_choice_games: 3 }]);

      // Mock current picker's choice picks count (0 existing)
      mockQuery.mockResolvedValueOnce([{ count: '0' }]);

      // Mock must-pick games validation
      mockQuery.mockResolvedValueOnce([{ id: 1 }]);

      // Mock individual pick validation
      mockValidatePick.mockResolvedValue({ isValid: true });

      // Mock successful pick creation
      const mockCreatedPicks = mockPicks.map((pick, index) => ({
        id: index + 1,
        user_id: 'user123',
        ...pick,
        submitted: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      mockCreatedPicks.forEach((pick) => {
        mockCreateOrUpdatePick.mockResolvedValueOnce(pick);
      });

      const request = createRequest({
        weekId: 1,
        picks: mockPicks,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(3);
      expect(data.message).toBe('Successfully submitted 3 picks');
      expect(mockCreateOrUpdatePick).toHaveBeenCalledTimes(3);
    });

    it('should allow bulk submission when no picker choice limit is set', async () => {
      // Mock that picks haven't been submitted yet
      mockHasSubmittedPicksForWeek.mockResolvedValue(false);

      // Mock game details - all picker's choice games
      mockQuery.mockResolvedValueOnce([
        { id: 1, must_pick: false, week_id: 1 },
        { id: 2, must_pick: false, week_id: 1 },
        { id: 3, must_pick: false, week_id: 1 },
      ]);

      // Mock week with no limit set (null)
      mockQuery.mockResolvedValueOnce([{ max_picker_choice_games: null }]);

      // Mock must-pick games validation (no must-pick games)
      mockQuery.mockResolvedValueOnce([]);

      // Mock individual pick validation
      mockValidatePick.mockResolvedValue({ isValid: true });

      // Mock successful pick creation
      const mockCreatedPicks = mockPicks.map((pick, index) => ({
        id: index + 1,
        user_id: 'user123',
        ...pick,
        submitted: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      mockCreatedPicks.forEach((pick) => {
        mockCreateOrUpdatePick.mockResolvedValueOnce(pick);
      });

      const request = createRequest({
        weekId: 1,
        picks: mockPicks,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(3);
      expect(mockCreateOrUpdatePick).toHaveBeenCalledTimes(3);
    });

    it('should allow only must-pick games when picker choice limit is 0', async () => {
      const mustPickOnlyPicks = [
        { game_id: 1, pick_type: 'home_spread', spread_value: -3.5 },
      ];

      // Mock that picks haven't been submitted yet
      mockHasSubmittedPicksForWeek.mockResolvedValue(false);

      // Mock game details - only must-pick games
      mockQuery.mockResolvedValueOnce([
        { id: 1, must_pick: true, week_id: 1 },
      ]);

      // No need to mock week limit since validateBulkPickerChoiceLimits returns early for 0 picker choice games

      // Mock must-pick games validation 
      mockQuery.mockResolvedValueOnce([{ id: 1 }]);

      // Mock individual pick validation
      mockValidatePick.mockResolvedValue({ isValid: true });

      // Mock successful pick creation
      mockCreateOrUpdatePick.mockResolvedValue({
        id: 1,
        user_id: 'user123',
        game_id: 1,
        pick_type: 'home_spread',
        spread_value: -3.5,
        submitted: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      const request = createRequest({
        weekId: 1,
        picks: mustPickOnlyPicks,
      });

      const response = await POST(request);
      const data = await response.json();


      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(mockCreateOrUpdatePick).toHaveBeenCalledTimes(1);
    });

    it('should reject when games belong to different weeks', async () => {
      // Mock that picks haven't been submitted yet
      mockHasSubmittedPicksForWeek.mockResolvedValue(false);

      // Mock game details - games from different weeks
      mockQuery.mockResolvedValueOnce([
        { id: 1, must_pick: true, week_id: 1 },
        { id: 2, must_pick: false, week_id: 2 }, // Different week!
        { id: 3, must_pick: false, week_id: 1 },
      ]);

      const request = createRequest({
        weekId: 1,
        picks: mockPicks,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('do not belong to week 1');
      expect(mockCreateOrUpdatePick).not.toHaveBeenCalled();
    });

    it('should correctly handle resubmitted games in picker choice validation', async () => {
      // Mock that picks haven't been submitted yet
      mockHasSubmittedPicksForWeek.mockResolvedValue(false);

      // Mock game details - 1 must-pick, 2 picker's choice games
      mockQuery.mockResolvedValueOnce([
        { id: 1, must_pick: true, week_id: 1 },
        { id: 2, must_pick: false, week_id: 1 }, // Picker's choice
        { id: 3, must_pick: false, week_id: 1 }, // Picker's choice
      ]);

      // Mock week with limit of 2 picker's choice games
      mockQuery.mockResolvedValueOnce([{ max_picker_choice_games: 2 }]);

      // Mock current picker's choice picks count - user already has 1 pick for game 2,
      // but since game 2 is being resubmitted, it should not count toward the existing total
      mockQuery.mockResolvedValueOnce([{ count: '0' }]);

      // Mock must-pick games validation
      mockQuery.mockResolvedValueOnce([{ id: 1 }]);

      // Mock individual pick validation
      mockValidatePick.mockResolvedValue({ isValid: true });

      // Mock successful pick creation
      const mockCreatedPicks = mockPicks.map((pick, index) => ({
        id: index + 1,
        user_id: 'user123',
        ...pick,
        submitted: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      mockCreatedPicks.forEach((pick) => {
        mockCreateOrUpdatePick.mockResolvedValueOnce(pick);
      });

      const request = createRequest({
        weekId: 1,
        picks: mockPicks,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(3);
      expect(data.message).toBe('Successfully submitted 3 picks');
      expect(mockCreateOrUpdatePick).toHaveBeenCalledTimes(3);
      
      // Verify that the query excludes resubmitted games  
      // Using Cognito user ID as originally designed
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND g.id NOT IN'),
        expect.arrayContaining(['user123', 1, 1, 2, 3])
      );
    });

    it('should require at least one must-pick game when must-pick games exist', async () => {
      const pickerChoiceOnlyPicks = [
        { game_id: 2, pick_type: 'home_spread', spread_value: -3.5 },
        { game_id: 3, pick_type: 'away_spread', spread_value: 2.5 },
      ];

      // Mock that picks haven't been submitted yet
      mockHasSubmittedPicksForWeek.mockResolvedValue(false);

      // Mock game details - 1 must-pick game exists but user didn't pick it
      mockQuery.mockResolvedValueOnce([
        { id: 2, must_pick: false, week_id: 1 },
        { id: 3, must_pick: false, week_id: 1 },
      ]);

      // Mock week limit (needed for picker choice validation)
      mockQuery.mockResolvedValueOnce([{ max_picker_choice_games: 2 }]);

      // Mock current picker's choice picks count
      mockQuery.mockResolvedValueOnce([{ count: '0' }]);

      // Check if there are must-pick games for this week - user missed game 1
      mockQuery.mockResolvedValueOnce([
        { id: 1 },
      ]);

      const request = createRequest({
        weekId: 1,
        picks: pickerChoiceOnlyPicks,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('must pick all required games');
      expect(data.error).toContain('Missing must-pick games: 1');
      expect(mockCreateOrUpdatePick).not.toHaveBeenCalled();
    });

    it('should allow submission when all must-pick games are included', async () => {
      const allRequiredPicks = [
        { game_id: 1, pick_type: 'home_spread', spread_value: -3.5 }, // Must-pick
        { game_id: 2, pick_type: 'away_spread', spread_value: 2.5 },  // Picker's choice
      ];

      // Mock that picks haven't been submitted yet
      mockHasSubmittedPicksForWeek.mockResolvedValue(false);

      // Mock game details
      mockQuery.mockResolvedValueOnce([
        { id: 1, must_pick: true, week_id: 1 },
        { id: 2, must_pick: false, week_id: 1 },
      ]);

      // Mock week with limit of 2 picker's choice games
      mockQuery.mockResolvedValueOnce([{ max_picker_choice_games: 2 }]);

      // Mock current picker's choice picks count (0 existing)
      mockQuery.mockResolvedValueOnce([{ count: '0' }]);

      // Check must-pick games for this week
      mockQuery.mockResolvedValueOnce([
        { id: 1, must_pick: true, week_id: 1 },
      ]);

      // Mock individual pick validation
      mockValidatePick.mockResolvedValue({ isValid: true });

      // Mock successful pick creation
      allRequiredPicks.forEach((pick, index) => {
        mockCreateOrUpdatePick.mockResolvedValueOnce({
          id: index + 1,
          user_id: 'user123',
          ...pick,
          submitted: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        });
      });

      const request = createRequest({
        weekId: 1,
        picks: allRequiredPicks,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(mockCreateOrUpdatePick).toHaveBeenCalledTimes(2);
    });

    it('should handle edge case: user has existing picks but submits completely different games', async () => {
      const newGamePicks = [
        { game_id: 4, pick_type: 'home_spread', spread_value: -3.5 }, // Must-pick
        { game_id: 5, pick_type: 'away_spread', spread_value: 2.5 },  // Picker's choice
        { game_id: 6, pick_type: 'home_spread', spread_value: -1.5 }, // Picker's choice
      ];

      // Mock that picks haven't been submitted yet
      mockHasSubmittedPicksForWeek.mockResolvedValue(false);

      // Mock game details for new submission (all belong to week 1)
      mockQuery.mockResolvedValueOnce([
        { id: 4, must_pick: true, week_id: 1 },
        { id: 5, must_pick: false, week_id: 1 },
        { id: 6, must_pick: false, week_id: 1 },
      ]);

      // Mock week with limit of 2 picker's choice games
      mockQuery.mockResolvedValueOnce([{ max_picker_choice_games: 2 }]);

      // Mock current picker's choice picks count - user has 1 existing picker's choice pick
      // for a different game (not in current submission), so it should count
      mockQuery.mockResolvedValueOnce([{ count: '1' }]);

      const request = createRequest({
        weekId: 1,
        picks: newGamePicks,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Would exceed picker\'s choice limit of 2 games');
      expect(data.error).toContain('Current: 1, Attempting to add: 2, Total would be: 3');
    });

    it('should handle edge case: mix of resubmitted and new picker choice games within limit', async () => {
      const mixedPicks = [
        { game_id: 1, pick_type: 'home_spread', spread_value: -3.5 }, // Must-pick
        { game_id: 2, pick_type: 'away_spread', spread_value: 2.5 },  // Picker's choice (resubmitted)
        { game_id: 3, pick_type: 'home_spread', spread_value: -1.5 }, // Picker's choice (new)
      ];

      // Mock that picks haven't been submitted yet
      mockHasSubmittedPicksForWeek.mockResolvedValue(false);

      // Mock game details
      mockQuery.mockResolvedValueOnce([
        { id: 1, must_pick: true, week_id: 1 },
        { id: 2, must_pick: false, week_id: 1 },
        { id: 3, must_pick: false, week_id: 1 },
      ]);

      // Mock week with limit of 2 picker's choice games
      mockQuery.mockResolvedValueOnce([{ max_picker_choice_games: 2 }]);

      // Mock current picker's choice picks count - user has 1 existing for game 2,
      // but since game 2 is being resubmitted, only count non-resubmitted games (0)
      mockQuery.mockResolvedValueOnce([{ count: '0' }]);

      // Mock must-pick games validation
      mockQuery.mockResolvedValueOnce([{ id: 1 }]);

      // Mock individual pick validation
      mockValidatePick.mockResolvedValue({ isValid: true });

      // Mock successful pick creation
      mixedPicks.forEach((pick, index) => {
        mockCreateOrUpdatePick.mockResolvedValueOnce({
          id: index + 1,
          user_id: 'user123',
          ...pick,
          submitted: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        });
      });

      const request = createRequest({
        weekId: 1,
        picks: mixedPicks,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(3);
      expect(mockCreateOrUpdatePick).toHaveBeenCalledTimes(3);
    });

    it('should handle edge case: zero picker choice limit with only must-pick submissions', async () => {
      const mustPickOnlyPicks = [
        { game_id: 1, pick_type: 'home_spread', spread_value: -3.5 },
        { game_id: 2, pick_type: 'away_spread', spread_value: 2.5 },
      ];

      // Mock that picks haven't been submitted yet
      mockHasSubmittedPicksForWeek.mockResolvedValue(false);

      // Mock game details - all must-pick games
      mockQuery.mockResolvedValueOnce([
        { id: 1, must_pick: true, week_id: 1 },
        { id: 2, must_pick: true, week_id: 1 },
      ]);

      // Since there are no picker's choice games in submission, picker choice validation is skipped
      // No need to mock week limit or picker's choice count queries

      // Mock must-pick games validation
      mockQuery.mockResolvedValueOnce([
        { id: 1 },
        { id: 2 },
      ]);

      // Mock individual pick validation
      mockValidatePick.mockResolvedValue({ isValid: true });

      // Mock successful pick creation
      mustPickOnlyPicks.forEach((pick, index) => {
        mockCreateOrUpdatePick.mockResolvedValueOnce({
          id: index + 1,
          user_id: 'user123',
          ...pick,
          submitted: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        });
      });

      const request = createRequest({
        weekId: 1,
        picks: mustPickOnlyPicks,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(mockCreateOrUpdatePick).toHaveBeenCalledTimes(2);
    });
  });
});