// Mock the database module BEFORE imports
jest.mock('../database', () => ({
  query: jest.fn(),
}));

import { WeekValidator, WeekRepository } from '../weeks';
import { CreateWeekInput, UpdateWeekInput, Week } from '../../types/week';
import { query } from '../database';

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('WeekValidator', () => {
  describe('validateCreateInput', () => {
    it('should pass validation for valid input', () => {
      const validInput: CreateWeekInput = {
        name: 'Week 1',
        start_date: '2024-09-01T00:00:00.000Z',
        end_date: '2024-09-08T23:59:59.000Z',
        description: 'Opening week of the season',
      };

      const errors = WeekValidator.validateCreateInput(validInput);
      expect(errors).toEqual([]);
    });

    it('should require week name', () => {
      const input: CreateWeekInput = {
        name: '',
        start_date: '2024-09-01T00:00:00.000Z',
        end_date: '2024-09-08T23:59:59.000Z',
      };

      const errors = WeekValidator.validateCreateInput(input);
      expect(errors).toContain('Week name is required');
    });

    it('should reject name longer than 255 characters', () => {
      const input: CreateWeekInput = {
        name: 'a'.repeat(256),
        start_date: '2024-09-01T00:00:00.000Z',
        end_date: '2024-09-08T23:59:59.000Z',
      };

      const errors = WeekValidator.validateCreateInput(input);
      expect(errors).toContain('Week name must be 255 characters or less');
    });

    it('should require start date', () => {
      const input: CreateWeekInput = {
        name: 'Week 1',
        start_date: '',
        end_date: '2024-09-08T23:59:59.000Z',
      };

      const errors = WeekValidator.validateCreateInput(input);
      expect(errors).toContain('Start date is required');
    });

    it('should require end date', () => {
      const input: CreateWeekInput = {
        name: 'Week 1',
        start_date: '2024-09-01T00:00:00.000Z',
        end_date: '',
      };

      const errors = WeekValidator.validateCreateInput(input);
      expect(errors).toContain('End date is required');
    });

    it('should reject invalid start date', () => {
      const input: CreateWeekInput = {
        name: 'Week 1',
        start_date: 'invalid-date',
        end_date: '2024-09-08T23:59:59.000Z',
      };

      const errors = WeekValidator.validateCreateInput(input);
      expect(errors).toContain('Start date is invalid');
    });

    it('should reject invalid end date', () => {
      const input: CreateWeekInput = {
        name: 'Week 1',
        start_date: '2024-09-01T00:00:00.000Z',
        end_date: 'invalid-date',
      };

      const errors = WeekValidator.validateCreateInput(input);
      expect(errors).toContain('End date is invalid');
    });

    it('should reject end date before start date', () => {
      const input: CreateWeekInput = {
        name: 'Week 1',
        start_date: '2024-09-08T00:00:00.000Z',
        end_date: '2024-09-01T23:59:59.000Z',
      };

      const errors = WeekValidator.validateCreateInput(input);
      expect(errors).toContain('End date must be after start date');
    });

    it('should reject end date equal to start date', () => {
      const input: CreateWeekInput = {
        name: 'Week 1',
        start_date: '2024-09-01T00:00:00.000Z',
        end_date: '2024-09-01T00:00:00.000Z',
      };

      const errors = WeekValidator.validateCreateInput(input);
      expect(errors).toContain('End date must be after start date');
    });

    it('should reject description longer than 1000 characters', () => {
      const input: CreateWeekInput = {
        name: 'Week 1',
        start_date: '2024-09-01T00:00:00.000Z',
        end_date: '2024-09-08T23:59:59.000Z',
        description: 'a'.repeat(1001),
      };

      const errors = WeekValidator.validateCreateInput(input);
      expect(errors).toContain('Description must be 1000 characters or less');
    });

    it('should allow undefined description', () => {
      const input: CreateWeekInput = {
        name: 'Week 1',
        start_date: '2024-09-01T00:00:00.000Z',
        end_date: '2024-09-08T23:59:59.000Z',
      };

      const errors = WeekValidator.validateCreateInput(input);
      expect(errors).toEqual([]);
    });

    it('should validate max_triple_plays when provided', () => {
      const validInput: CreateWeekInput = {
        name: 'Week 1',
        start_date: '2024-09-01T00:00:00.000Z',
        end_date: '2024-09-08T23:59:59.000Z',
        max_triple_plays: 3,
      };

      const errors = WeekValidator.validateCreateInput(validInput);
      expect(errors).toEqual([]);
    });

    it('should reject max_triple_plays less than 1', () => {
      const input: CreateWeekInput = {
        name: 'Week 1',
        start_date: '2024-09-01T00:00:00.000Z',
        end_date: '2024-09-08T23:59:59.000Z',
        max_triple_plays: 0,
      };

      const errors = WeekValidator.validateCreateInput(input);
      expect(errors).toContain('Max triple plays must be a positive integer');
    });

    it('should reject max_triple_plays greater than 50', () => {
      const input: CreateWeekInput = {
        name: 'Week 1',
        start_date: '2024-09-01T00:00:00.000Z',
        end_date: '2024-09-08T23:59:59.000Z',
        max_triple_plays: 51,
      };

      const errors = WeekValidator.validateCreateInput(input);
      expect(errors).toContain('Max triple plays must be 50 or less');
    });

    it('should reject non-integer max_triple_plays', () => {
      const input: CreateWeekInput = {
        name: 'Week 1',
        start_date: '2024-09-01T00:00:00.000Z',
        end_date: '2024-09-08T23:59:59.000Z',
        max_triple_plays: 3.5,
      };

      const errors = WeekValidator.validateCreateInput(input);
      expect(errors).toContain('Max triple plays must be a positive integer');
    });

    it('should allow null max_triple_plays', () => {
      const input: CreateWeekInput = {
        name: 'Week 1',
        start_date: '2024-09-01T00:00:00.000Z',
        end_date: '2024-09-08T23:59:59.000Z',
        max_triple_plays: null,
      };

      const errors = WeekValidator.validateCreateInput(input);
      expect(errors).toEqual([]);
    });
  });

  describe('validateUpdateInput', () => {
    it('should pass validation for valid partial update', () => {
      const input: UpdateWeekInput = {
        name: 'Updated Week 1',
      };

      const errors = WeekValidator.validateUpdateInput(input);
      expect(errors).toEqual([]);
    });

    it('should reject empty name when provided', () => {
      const input: UpdateWeekInput = {
        name: '',
      };

      const errors = WeekValidator.validateUpdateInput(input);
      expect(errors).toContain('Week name cannot be empty');
    });

    it('should reject name longer than 255 characters', () => {
      const input: UpdateWeekInput = {
        name: 'a'.repeat(256),
      };

      const errors = WeekValidator.validateUpdateInput(input);
      expect(errors).toContain('Week name must be 255 characters or less');
    });

    it('should reject invalid start date when provided', () => {
      const input: UpdateWeekInput = {
        start_date: 'invalid-date',
      };

      const errors = WeekValidator.validateUpdateInput(input);
      expect(errors).toContain('Start date is invalid');
    });

    it('should reject invalid end date when provided', () => {
      const input: UpdateWeekInput = {
        end_date: 'invalid-date',
      };

      const errors = WeekValidator.validateUpdateInput(input);
      expect(errors).toContain('End date is invalid');
    });

    it('should reject end date before start date when both provided', () => {
      const input: UpdateWeekInput = {
        start_date: '2024-09-08T00:00:00.000Z',
        end_date: '2024-09-01T23:59:59.000Z',
      };

      const errors = WeekValidator.validateUpdateInput(input);
      expect(errors).toContain('End date must be after start date');
    });

    it('should allow valid date range when both provided', () => {
      const input: UpdateWeekInput = {
        start_date: '2024-09-01T00:00:00.000Z',
        end_date: '2024-09-08T23:59:59.000Z',
      };

      const errors = WeekValidator.validateUpdateInput(input);
      expect(errors).toEqual([]);
    });

    it('should reject description longer than 1000 characters', () => {
      const input: UpdateWeekInput = {
        description: 'a'.repeat(1001),
      };

      const errors = WeekValidator.validateUpdateInput(input);
      expect(errors).toContain('Description must be 1000 characters or less');
    });

    it('should validate max_triple_plays when provided in update', () => {
      const input: UpdateWeekInput = {
        max_triple_plays: 2,
      };

      const errors = WeekValidator.validateUpdateInput(input);
      expect(errors).toEqual([]);
    });

    it('should reject max_triple_plays less than 1 in update', () => {
      const input: UpdateWeekInput = {
        max_triple_plays: -1,
      };

      const errors = WeekValidator.validateUpdateInput(input);
      expect(errors).toContain('Max triple plays must be a positive integer');
    });

    it('should reject max_triple_plays greater than 50 in update', () => {
      const input: UpdateWeekInput = {
        max_triple_plays: 100,
      };

      const errors = WeekValidator.validateUpdateInput(input);
      expect(errors).toContain('Max triple plays must be 50 or less');
    });

    it('should allow null max_triple_plays in update', () => {
      const input: UpdateWeekInput = {
        max_triple_plays: null,
      };

      const errors = WeekValidator.validateUpdateInput(input);
      expect(errors).toEqual([]);
    });

    it('should allow empty object (no updates)', () => {
      const input: UpdateWeekInput = {};

      const errors = WeekValidator.validateUpdateInput(input);
      expect(errors).toEqual([]);
    });
  });
});

describe('WeekRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all weeks when no filters provided', async () => {
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
      ];

      mockQuery.mockResolvedValue(mockWeeks);

      const result = await WeekRepository.findAll();

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM weeks ORDER BY start_date ASC',
        []
      );
      expect(result).toEqual(mockWeeks);
    });

    it('should apply name filter', async () => {
      mockQuery.mockResolvedValue([]);

      await WeekRepository.findAll({ name: 'Week 1' });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM weeks WHERE name ILIKE $1 ORDER BY start_date ASC',
        ['%Week 1%']
      );
    });

    it('should apply date filters', async () => {
      mockQuery.mockResolvedValue([]);

      await WeekRepository.findAll({
        start_date_from: '2024-01-01',
        end_date_to: '2024-12-31',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM weeks WHERE start_date >= $1 AND end_date <= $2 ORDER BY start_date ASC',
        ['2024-01-01', '2024-12-31']
      );
    });

    it('should apply active_on filter', async () => {
      mockQuery.mockResolvedValue([]);

      await WeekRepository.findAll({ active_on: '2024-01-05' });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM weeks WHERE start_date <= $1 AND end_date >= $2 ORDER BY start_date ASC',
        ['2024-01-05', '2024-01-05']
      );
    });
  });

  describe('findById', () => {
    it('should return week when found', async () => {
      const mockWeek: Week = {
        id: 1,
        name: 'Week 1',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        description: 'First week',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValue([mockWeek]);

      const result = await WeekRepository.findById(1);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM weeks WHERE id = $1',
        [1]
      );
      expect(result).toEqual(mockWeek);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await WeekRepository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should return week when found', async () => {
      const mockWeek: Week = {
        id: 1,
        name: 'Week 1',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        description: 'First week',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValue([mockWeek]);

      const result = await WeekRepository.findByName('Week 1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM weeks WHERE name = $1',
        ['Week 1']
      );
      expect(result).toEqual(mockWeek);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await WeekRepository.findByName('Nonexistent Week');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and return new week without max_picker_choice_games', async () => {
      const input: CreateWeekInput = {
        name: 'Week 1',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        description: 'First week',
      };

      const mockWeek: Week = {
        id: 1,
        ...input,
        max_picker_choice_games: undefined,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValue([mockWeek]);

      const result = await WeekRepository.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        'INSERT INTO weeks (name, start_date, end_date, description, max_picker_choice_games, max_triple_plays)\n       VALUES ($1, $2, $3, $4, $5, $6)\n       RETURNING *',
        ['Week 1', '2024-01-01', '2024-01-07', 'First week', undefined, undefined]
      );
      expect(result).toEqual(mockWeek);
    });

    it('should create and return new week with max_picker_choice_games and max_triple_plays', async () => {
      const input: CreateWeekInput = {
        name: 'Week 1',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        description: 'First week',
        max_picker_choice_games: 5,
        max_triple_plays: 2,
      };

      const mockWeek: Week = {
        id: 1,
        ...input,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValue([mockWeek]);

      const result = await WeekRepository.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        'INSERT INTO weeks (name, start_date, end_date, description, max_picker_choice_games, max_triple_plays)\n       VALUES ($1, $2, $3, $4, $5, $6)\n       RETURNING *',
        ['Week 1', '2024-01-01', '2024-01-07', 'First week', 5, 2]
      );
      expect(result).toEqual(mockWeek);
    });

    it('should create and return new week with max_triple_plays only', async () => {
      const input: CreateWeekInput = {
        name: 'Week 1',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        description: 'First week',
        max_triple_plays: 3,
      };

      const mockWeek: Week = {
        id: 1,
        ...input,
        max_picker_choice_games: undefined,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValue([mockWeek]);

      const result = await WeekRepository.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO weeks (name, start_date, end_date, description, max_picker_choice_games, max_triple_plays)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
        ['Week 1', '2024-01-01', '2024-01-07', 'First week', undefined, 3]
      );
      expect(result).toEqual(mockWeek);
    });

    it('should throw error when creation fails', async () => {
      const input: CreateWeekInput = {
        name: 'Week 1',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
      };

      mockQuery.mockResolvedValue([]);

      await expect(WeekRepository.create(input)).rejects.toThrow('Failed to create week');
    });
  });

  describe('update', () => {
    it('should update week with max_picker_choice_games and max_triple_plays', async () => {
      const updateData: UpdateWeekInput = {
        name: 'Updated Week',
        max_picker_choice_games: 7,
        max_triple_plays: 3,
      };

      const expectedWeek: Week = {
        id: 1,
        name: 'Updated Week',
        start_date: '2024-09-01T00:00:00Z',
        end_date: '2024-09-08T23:59:59Z',
        description: 'Test description',
        max_picker_choice_games: 7,
        max_triple_plays: 3,
        created_at: '2024-08-19T12:00:00Z',
        updated_at: '2024-08-19T12:30:00Z',
      };

      mockQuery.mockResolvedValueOnce([expectedWeek]);

      const result = await WeekRepository.update(1, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE weeks SET name = $1, max_picker_choice_games = $2, max_triple_plays = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
        ['Updated Week', 7, 3, 1]
      );
      expect(result).toEqual(expectedWeek);
    });

    it('should update week and set max_picker_choice_games to null', async () => {
      const updateData: UpdateWeekInput = {
        max_picker_choice_games: null,
      };

      const expectedWeek: Week = {
        id: 1,
        name: 'Test Week',
        start_date: '2024-09-01T00:00:00Z',
        end_date: '2024-09-08T23:59:59Z',
        description: 'Test description',
        max_picker_choice_games: null,
        created_at: '2024-08-19T12:00:00Z',
        updated_at: '2024-08-19T12:30:00Z',
      };

      mockQuery.mockResolvedValueOnce([expectedWeek]);

      const result = await WeekRepository.update(1, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE weeks SET max_picker_choice_games = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [null, 1]
      );
      expect(result).toEqual(expectedWeek);
    });

    it('should update week with max_triple_plays only', async () => {
      const updateData: UpdateWeekInput = {
        max_triple_plays: 4,
      };

      const expectedWeek: Week = {
        id: 1,
        name: 'Test Week',
        start_date: '2024-09-01T00:00:00Z',
        end_date: '2024-09-08T23:59:59Z',
        description: 'Test description',
        max_picker_choice_games: undefined,
        max_triple_plays: 4,
        created_at: '2024-08-19T12:00:00Z',
        updated_at: '2024-08-19T12:30:00Z',
      };

      mockQuery.mockResolvedValueOnce([expectedWeek]);

      const result = await WeekRepository.update(1, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE weeks SET max_triple_plays = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [4, 1]
      );
      expect(result).toEqual(expectedWeek);
    });

    it('should update week and set max_triple_plays to null', async () => {
      const updateData: UpdateWeekInput = {
        max_triple_plays: null,
      };

      const expectedWeek: Week = {
        id: 1,
        name: 'Test Week',
        start_date: '2024-09-01T00:00:00Z',
        end_date: '2024-09-08T23:59:59Z',
        description: 'Test description',
        max_picker_choice_games: undefined,
        max_triple_plays: null,
        created_at: '2024-08-19T12:00:00Z',
        updated_at: '2024-08-19T12:30:00Z',
      };

      mockQuery.mockResolvedValueOnce([expectedWeek]);

      const result = await WeekRepository.update(1, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE weeks SET max_triple_plays = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [null, 1]
      );
      expect(result).toEqual(expectedWeek);
    });

    it('should update multiple fields including max_picker_choice_games and max_triple_plays', async () => {
      const updateData: UpdateWeekInput = {
        name: 'Updated Week',
        description: 'Updated description',
        max_picker_choice_games: 10,
        max_triple_plays: 5,
      };

      const expectedWeek: Week = {
        id: 1,
        name: 'Updated Week',
        start_date: '2024-09-01T00:00:00Z',
        end_date: '2024-09-08T23:59:59Z',
        description: 'Updated description',
        max_picker_choice_games: 10,
        max_triple_plays: 5,
        created_at: '2024-08-19T12:00:00Z',
        updated_at: '2024-08-19T12:30:00Z',
      };

      mockQuery.mockResolvedValueOnce([expectedWeek]);

      const result = await WeekRepository.update(1, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE weeks SET name = $1, description = $2, max_picker_choice_games = $3, max_triple_plays = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
        ['Updated Week', 'Updated description', 10, 5, 1]
      );
      expect(result).toEqual(expectedWeek);
    });

    it('should return null if no week is found', async () => {
      const updateData: UpdateWeekInput = {
        max_picker_choice_games: 5,
      };

      mockQuery.mockResolvedValueOnce([]);

      const result = await WeekRepository.update(999, updateData);

      expect(result).toBeNull();
    });

    it('should throw error if no fields to update', async () => {
      const updateData: UpdateWeekInput = {};

      await expect(WeekRepository.update(1, updateData)).rejects.toThrow('No fields to update');

      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('hasDateConflict', () => {
    it('should return conflicting week when overlap exists', async () => {
      const conflictingWeek: Week = {
        id: 1,
        name: 'Existing Week',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        description: 'Existing week',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValue([conflictingWeek]);

      const result = await WeekRepository.hasDateConflict('2024-01-05', '2024-01-10');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE (start_date <= $2 AND end_date >= $1)'),
        ['2024-01-05', '2024-01-10']
      );
      expect(result).toEqual(conflictingWeek);
    });

    it('should return null when no conflict exists', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await WeekRepository.hasDateConflict('2024-02-01', '2024-02-07');

      expect(result).toBeNull();
    });

    it('should exclude specific week ID when checking conflicts', async () => {
      mockQuery.mockResolvedValue([]);

      await WeekRepository.hasDateConflict('2024-01-05', '2024-01-10', 1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND id != $3'),
        ['2024-01-05', '2024-01-10', 1]
      );
    });
  });

  describe('isNameTaken', () => {
    it('should return true when name is taken', async () => {
      mockQuery.mockResolvedValue([{ id: 1 }]);

      const result = await WeekRepository.isNameTaken('Week 1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT 1 FROM weeks WHERE name = $1',
        ['Week 1']
      );
      expect(result).toBe(true);
    });

    it('should return false when name is available', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await WeekRepository.isNameTaken('Available Name');

      expect(result).toBe(false);
    });

    it('should exclude specific week ID when checking', async () => {
      mockQuery.mockResolvedValue([]);

      await WeekRepository.isNameTaken('Week 1', 1);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT 1 FROM weeks WHERE name = $1 AND id != $2',
        ['Week 1', 1]
      );
    });
  });
});