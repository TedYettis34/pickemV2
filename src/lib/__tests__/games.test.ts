import { 
  getGamesByWeekId,
  createGamesForWeek,
  deleteGamesByWeekId,
  updateGameOdds,
  weekHasGames,
  getGamesCountByWeek 
} from '../games';
import { query } from '../database';

// Mock the database module
jest.mock('../database');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Games Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGamesByWeekId', () => {
    it('should return games for a valid week ID', async () => {
      const mockGames = [
        {
          id: 1,
          week_id: 1,
          sport: 'americanfootball_nfl',
          external_id: 'game1',
          home_team: 'Chiefs',
          away_team: 'Bills',
          commence_time: '2024-01-01T18:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockQuery.mockResolvedValue(mockGames);

      const result = await getGamesByWeekId(1);

      expect(result).toEqual(mockGames);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM games'),
        [1]
      );
    });

    it('should return empty array when no games exist', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await getGamesByWeekId(1);

      expect(result).toEqual([]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM games'),
        [1]
      );
    });

    it('should throw error when database query fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(getGamesByWeekId(1)).rejects.toThrow('Database error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching games by week ID:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('createGamesForWeek', () => {
    it('should create multiple games successfully', async () => {
      const inputGames = [
        {
          week_id: 1,
          sport: 'americanfootball_nfl' as const,
          external_id: 'game1',
          home_team: 'Chiefs',
          away_team: 'Bills',
          commence_time: '2024-01-01T18:00:00Z',
          spread_home: -3.5,
        },
        {
          week_id: 1,
          sport: 'americanfootball_ncaaf' as const,
          external_id: 'game2',
          home_team: 'Alabama',
          away_team: 'Georgia',
          commence_time: '2024-01-02T20:00:00Z',
        },
      ];

      const mockCreatedGames = [
        { ...inputGames[0], id: 1, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
        { ...inputGames[1], id: 2, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      ];

      mockQuery.mockResolvedValue(mockCreatedGames);

      const result = await createGamesForWeek(inputGames);

      expect(result).toEqual(mockCreatedGames);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO games'),
        expect.any(Array)
      );
    });

    it('should return empty array when no games provided', async () => {
      const result = await createGamesForWeek([]);

      expect(result).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should handle games with minimal data', async () => {
      const inputGames = [
        {
          week_id: 1,
          sport: 'americanfootball_nfl' as const,
          external_id: 'game1',
          home_team: 'Chiefs',
          away_team: 'Bills',
          commence_time: '2024-01-01T18:00:00Z',
        },
      ];

      const mockCreatedGames = [
        { ...inputGames[0], id: 1, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      ];

      mockQuery.mockResolvedValue(mockCreatedGames);

      const result = await createGamesForWeek(inputGames);

      expect(result).toEqual(mockCreatedGames);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO games'),
        expect.arrayContaining([1, 'americanfootball_nfl', 'game1', 'Chiefs', 'Bills', '2024-01-01T18:00:00Z'])
      );
    });

    it('should throw error when database insert fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const inputGames = [
        {
          week_id: 1,
          sport: 'americanfootball_nfl' as const,
          external_id: 'game1',
          home_team: 'Chiefs',
          away_team: 'Bills',
          commence_time: '2024-01-01T18:00:00Z',
        },
      ];

      mockQuery.mockRejectedValue(new Error('Insert failed'));

      await expect(createGamesForWeek(inputGames)).rejects.toThrow('Insert failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error creating games for week:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('deleteGamesByWeekId', () => {
    it('should delete games successfully', async () => {
      mockQuery.mockResolvedValue([]);

      await deleteGamesByWeekId(1);

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM games WHERE week_id = $1',
        [1]
      );
    });

    it('should throw error when database delete fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValue(new Error('Delete failed'));

      await expect(deleteGamesByWeekId(1)).rejects.toThrow('Delete failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error deleting games by week ID:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateGameOdds', () => {
    it('should update game odds successfully', async () => {
      const mockUpdatedGame = {
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
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValue([mockUpdatedGame]);

      const odds = {
        spread_home: -3.5,
        spread_away: 3.5,
        total_over_under: 47.5,
        bookmaker: 'FanDuel',
        odds_last_updated: '2024-01-01T12:00:00Z',
      };

      const result = await updateGameOdds(1, odds);

      expect(result).toEqual(mockUpdatedGame);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE games'),
        expect.arrayContaining([-3.5, 3.5, 47.5, null, null, 'FanDuel', '2024-01-01T12:00:00Z', 1])
      );
    });

    it('should return null when game not found', async () => {
      mockQuery.mockResolvedValue([]);

      const odds = { spread_home: -3.5 };
      const result = await updateGameOdds(999, odds);

      expect(result).toBeNull();
    });

    it('should handle partial odds updates', async () => {
      const mockUpdatedGame = {
        id: 1,
        week_id: 1,
        sport: 'americanfootball_nfl',
        external_id: 'game1',
        home_team: 'Chiefs',
        away_team: 'Bills',
        commence_time: '2024-01-01T18:00:00Z',
        spread_home: -7,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValue([mockUpdatedGame]);

      const odds = { spread_home: -7 };
      const result = await updateGameOdds(1, odds);

      expect(result).toEqual(mockUpdatedGame);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE games'),
        expect.arrayContaining([-7, null, null, null, null, null, null, 1])
      );
    });

    it('should throw error when database update fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValue(new Error('Update failed'));

      const odds = { spread_home: -3.5 };
      await expect(updateGameOdds(1, odds)).rejects.toThrow('Update failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error updating game odds:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('weekHasGames', () => {
    it('should return true when week has games', async () => {
      mockQuery.mockResolvedValue([{ count: '5' }]);

      const result = await weekHasGames(1);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM games WHERE week_id = $1',
        [1]
      );
    });

    it('should return false when week has no games', async () => {
      mockQuery.mockResolvedValue([{ count: '0' }]);

      const result = await weekHasGames(1);

      expect(result).toBe(false);
    });

    it('should throw error when database query fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValue(new Error('Query failed'));

      await expect(weekHasGames(1)).rejects.toThrow('Query failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error checking if week has games:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getGamesCountByWeek', () => {
    it('should return correct counts for NFL and college games', async () => {
      mockQuery.mockResolvedValue([
        { sport: 'americanfootball_nfl', count: '3' },
        { sport: 'americanfootball_ncaaf', count: '5' },
      ]);

      const result = await getGamesCountByWeek(1);

      expect(result).toEqual({
        nfl: 3,
        college: 5,
        total: 8,
      });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      );
    });

    it('should return zero counts when no games exist', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await getGamesCountByWeek(1);

      expect(result).toEqual({
        nfl: 0,
        college: 0,
        total: 0,
      });
    });

    it('should handle only NFL games', async () => {
      mockQuery.mockResolvedValue([
        { sport: 'americanfootball_nfl', count: '4' },
      ]);

      const result = await getGamesCountByWeek(1);

      expect(result).toEqual({
        nfl: 4,
        college: 0,
        total: 4,
      });
    });

    it('should handle only college games', async () => {
      mockQuery.mockResolvedValue([
        { sport: 'americanfootball_ncaaf', count: '7' },
      ]);

      const result = await getGamesCountByWeek(1);

      expect(result).toEqual({
        nfl: 0,
        college: 7,
        total: 7,
      });
    });

    it('should throw error when database query fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValue(new Error('Query failed'));

      await expect(getGamesCountByWeek(1)).rejects.toThrow('Query failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error getting games count by week:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});