import { WeekValidator } from '../weeks';
import { CreateWeekInput, UpdateWeekInput } from '../../types/week';

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

    it('should allow empty object (no updates)', () => {
      const input: UpdateWeekInput = {};

      const errors = WeekValidator.validateUpdateInput(input);
      expect(errors).toEqual([]);
    });
  });
});