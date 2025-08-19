import {
  getUserPicksForWeek,
  getUserPickForGame,
  createOrUpdatePick,
  deletePick,
  submitPicksForWeek,
  hasSubmittedPicksForWeek,
  validatePick,
  getPicksCountForWeek,
} from '../picks';
import { query } from '../database';

// Mock the database module
jest.mock('../database');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Picks Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserPicksForWeek', () => {
    it('should return user picks with game data for a week', async () => {
      const mockPicksWithGames = [
        {
          id: 1,
          user_id: 'user123',
          game_id: 1,
          pick_type: 'home_spread',
          spread_value: -3.5,
          submitted: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          week_id: 1,
          sport: 'americanfootball_nfl',
          external_id: 'game1',
          home_team: 'Chiefs',
          away_team: 'Bills',
          commence_time: '2024-01-01T18:00:00Z',
          spread_home: -3.5,
          spread_away: 3.5,
          total_over_under: 47.5,
          moneyline_home: -150,
          moneyline_away: 130,
          bookmaker: 'FanDuel',
          odds_last_updated: '2024-01-01T12:00:00Z',
          game_created_at: '2024-01-01T00:00:00Z',
          game_updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockQuery.mockResolvedValue(mockPicksWithGames);

      const result = await getUserPicksForWeek('user123', 1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        user_id: 'user123',
        game_id: 1,
        pick_type: 'home_spread',
        spread_value: -3.5,
        submitted: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        game: {
          id: 1,
          week_id: 1,
          sport: 'americanfootball_nfl',
          external_id: 'game1',
          home_team: 'Chiefs',
          away_team: 'Bills',
          commence_time: '2024-01-01T18:00:00Z',
          spread_home: -3.5,
          spread_away: 3.5,
          total_over_under: 47.5,
          moneyline_home: -150,
          moneyline_away: 130,
          bookmaker: 'FanDuel',
          odds_last_updated: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['user123', 1]
      );
    });

    it('should return empty array when no picks exist', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await getUserPicksForWeek('user123', 1);

      expect(result).toEqual([]);
    });

    it('should throw error when database query fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(getUserPicksForWeek('user123', 1)).rejects.toThrow('Database error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching user picks for week:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getUserPickForGame', () => {
    it('should return pick for specific user and game', async () => {
      const mockPick = {
        id: 1,
        user_id: 'user123',
        game_id: 1,
        pick_type: 'home_spread',
        spread_value: -3.5,
        submitted: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValue([mockPick]);

      const result = await getUserPickForGame('user123', 1);

      expect(result).toEqual(mockPick);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM picks WHERE user_id = $1 AND game_id = $2',
        ['user123', 1]
      );
    });

    it('should return null when pick does not exist', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await getUserPickForGame('user123', 1);

      expect(result).toBeNull();
    });
  });

  describe('createOrUpdatePick', () => {
    it('should create new pick when none exists', async () => {
      const pickData = {
        game_id: 1,
        pick_type: 'home_spread' as const,
        spread_value: -3.5,
      };

      const mockCreatedPick = {
        id: 1,
        user_id: 'user123',
        game_id: 1,
        pick_type: 'home_spread',
        spread_value: -3.5,
        submitted: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock no existing pick
      mockQuery.mockResolvedValueOnce([]);
      // Mock successful creation
      mockQuery.mockResolvedValueOnce([mockCreatedPick]);

      const result = await createOrUpdatePick('user123', 1, pickData);

      expect(result).toEqual(mockCreatedPick);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should update existing pick', async () => {
      const pickData = {
        pick_type: 'away_spread' as const,
        spread_value: 3.5,
      };

      const existingPick = {
        id: 1,
        user_id: 'user123',
        game_id: 1,
        pick_type: 'home_spread',
        spread_value: -3.5,
        submitted: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const updatedPick = {
        ...existingPick,
        pick_type: 'away_spread',
        spread_value: 3.5,
        updated_at: '2024-01-01T01:00:00Z',
      };

      // Mock existing pick
      mockQuery.mockResolvedValueOnce([existingPick]);
      // Mock successful update
      mockQuery.mockResolvedValueOnce([updatedPick]);

      const result = await createOrUpdatePick('user123', 1, pickData);

      expect(result).toEqual(updatedPick);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('deletePick', () => {
    it('should delete pick successfully', async () => {
      mockQuery.mockResolvedValue([]);

      await deletePick('user123', 1);

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM picks WHERE user_id = $1 AND game_id = $2',
        ['user123', 1]
      );
    });

    it('should throw error when database delete fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValue(new Error('Delete failed'));

      await expect(deletePick('user123', 1)).rejects.toThrow('Delete failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error deleting pick:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('submitPicksForWeek', () => {
    it('should submit all unsubmitted picks for a week', async () => {
      const mockSubmittedPicks = [
        {
          id: 1,
          user_id: 'user123',
          game_id: 1,
          pick_type: 'home_spread',
          spread_value: -3.5,
          submitted: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T01:00:00Z',
        },
      ];

      mockQuery.mockResolvedValue(mockSubmittedPicks);

      const result = await submitPicksForWeek('user123', 1);

      expect(result).toEqual(mockSubmittedPicks);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE picks'),
        ['user123', 1]
      );
    });
  });

  describe('hasSubmittedPicksForWeek', () => {
    it('should return true when user has submitted picks', async () => {
      mockQuery.mockResolvedValue([{ count: '1' }]);

      const result = await hasSubmittedPicksForWeek('user123', 1);

      expect(result).toBe(true);
    });

    it('should return false when user has no submitted picks', async () => {
      mockQuery.mockResolvedValue([{ count: '0' }]);

      const result = await hasSubmittedPicksForWeek('user123', 1);

      expect(result).toBe(false);
    });
  });

  describe('validatePick', () => {
    it('should return valid for a valid pick', async () => {
      const mockGame = {
        id: 1,
        week_id: 1,
        sport: 'americanfootball_nfl',
        external_id: 'game1',
        home_team: 'Chiefs',
        away_team: 'Bills',
        commence_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock game exists
      mockQuery.mockResolvedValueOnce([mockGame]);
      // Mock no submitted picks
      mockQuery.mockResolvedValueOnce([{ count: '0' }]);
      // Mock no existing pick
      mockQuery.mockResolvedValueOnce([]);

      const result = await validatePick('user123', 1, 'home_spread');

      expect(result.isValid).toBe(true);
    });

    it('should return invalid when game does not exist', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await validatePick('user123', 999, 'home_spread');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Game not found');
    });

    it('should return invalid when game has already started', async () => {
      const mockGame = {
        id: 1,
        week_id: 1,
        sport: 'americanfootball_nfl',
        external_id: 'game1',
        home_team: 'Chiefs',
        away_team: 'Bills',
        commence_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValueOnce([mockGame]);

      const result = await validatePick('user123', 1, 'home_spread');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Cannot pick on games that have already started');
    });

    it('should return invalid when picks are already submitted', async () => {
      const mockGame = {
        id: 1,
        week_id: 1,
        sport: 'americanfootball_nfl',
        external_id: 'game1',
        home_team: 'Chiefs',
        away_team: 'Bills',
        commence_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock game exists
      mockQuery.mockResolvedValueOnce([mockGame]);
      // Mock submitted picks exist
      mockQuery.mockResolvedValueOnce([{ count: '1' }]);

      const result = await validatePick('user123', 1, 'home_spread');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Picks have already been submitted for this week');
    });
  });

  describe('getPicksCountForWeek', () => {
    it('should return correct count of picks for a week', async () => {
      mockQuery.mockResolvedValue([{ count: '3' }]);

      const result = await getPicksCountForWeek('user123', 1);

      expect(result).toBe(3);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count'),
        ['user123', 1]
      );
    });

    it('should return 0 when no picks exist', async () => {
      mockQuery.mockResolvedValue([{ count: '0' }]);

      const result = await getPicksCountForWeek('user123', 1);

      expect(result).toBe(0);
    });
  });
});