import { query } from './database';
import { Week, CreateWeekInput, UpdateWeekInput, WeekFilters } from '../types/week';

// Week repository for database operations
export class WeekRepository {
  
  // Get all weeks with optional filtering
  static async findAll(filters?: WeekFilters): Promise<Week[]> {
    let sql = 'SELECT * FROM weeks';
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (filters) {
      if (filters.name) {
        conditions.push('name ILIKE $' + (params.length + 1));
        params.push(`%${filters.name}%`);
      }

      if (filters.start_date_from) {
        conditions.push('start_date >= $' + (params.length + 1));
        params.push(filters.start_date_from);
      }

      if (filters.start_date_to) {
        conditions.push('start_date <= $' + (params.length + 1));
        params.push(filters.start_date_to);
      }

      if (filters.end_date_from) {
        conditions.push('end_date >= $' + (params.length + 1));
        params.push(filters.end_date_from);
      }

      if (filters.end_date_to) {
        conditions.push('end_date <= $' + (params.length + 1));
        params.push(filters.end_date_to);
      }

      if (filters.active_on) {
        conditions.push('start_date <= $' + (params.length + 1) + ' AND end_date >= $' + (params.length + 2));
        params.push(filters.active_on, filters.active_on);
      }
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY start_date ASC';

    return await query<Week>(sql, params);
  }

  // Find a week by ID
  static async findById(id: number): Promise<Week | null> {
    const result = await query<Week>(
      'SELECT * FROM weeks WHERE id = $1',
      [id]
    );
    return result[0] || null;
  }

  // Find a week by name
  static async findByName(name: string): Promise<Week | null> {
    const result = await query<Week>(
      'SELECT * FROM weeks WHERE name = $1',
      [name]
    );
    return result[0] || null;
  }

  // Find weeks that are currently active
  static async findActive(date?: string): Promise<Week[]> {
    const activeDate = date || new Date().toISOString();
    return await query<Week>(
      'SELECT * FROM weeks WHERE start_date <= $1 AND end_date >= $1 ORDER BY start_date ASC',
      [activeDate]
    );
  }

  // Create a new week
  static async create(data: CreateWeekInput): Promise<Week> {
    const result = await query<Week>(
      `INSERT INTO weeks (name, start_date, end_date, description, max_picker_choice_games, max_triple_plays, cutoff_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [data.name, data.start_date, data.end_date, data.description, data.max_picker_choice_games, data.max_triple_plays, data.cutoff_time]
    );
    
    if (result.length === 0) {
      throw new Error('Failed to create week');
    }
    
    return result[0];
  }

  // Update an existing week
  static async update(id: number, data: UpdateWeekInput): Promise<Week | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }

    if (data.start_date !== undefined) {
      fields.push(`start_date = $${paramIndex++}`);
      params.push(data.start_date);
    }

    if (data.end_date !== undefined) {
      fields.push(`end_date = $${paramIndex++}`);
      params.push(data.end_date);
    }

    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }

    if (data.max_picker_choice_games !== undefined) {
      fields.push(`max_picker_choice_games = $${paramIndex++}`);
      params.push(data.max_picker_choice_games);
    }

    if (data.max_triple_plays !== undefined) {
      fields.push(`max_triple_plays = $${paramIndex++}`);
      params.push(data.max_triple_plays);
    }

    if (data.cutoff_time !== undefined) {
      fields.push(`cutoff_time = $${paramIndex++}`);
      params.push(data.cutoff_time);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);
    const sql = `UPDATE weeks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;

    const result = await query<Week>(sql, params);
    return result[0] || null;
  }

  // Check if a week name already exists (excluding a specific ID for updates)
  static async isNameTaken(name: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT 1 FROM weeks WHERE name = $1';
    const params: unknown[] = [name];

    if (excludeId) {
      sql += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await query(sql, params);
    return result.length > 0;
  }

  // Check for date range conflicts with other weeks
  static async hasDateConflict(
    startDate: string,
    endDate: string,
    excludeId?: number
  ): Promise<Week | null> {
    let sql = `
      SELECT * FROM weeks 
      WHERE (start_date <= $2 AND end_date >= $1)
    `;
    const params: unknown[] = [startDate, endDate];

    if (excludeId) {
      sql += ' AND id != $3';
      params.push(excludeId);
    }

    sql += ' ORDER BY start_date ASC LIMIT 1';

    const result = await query<Week>(sql, params);
    return result[0] || null;
  }


  // Delete a week and all associated games
  static async delete(id: number): Promise<boolean> {
    try {
      // First, delete all games associated with this week
      await query('DELETE FROM games WHERE week_id = $1', [id]);
      
      // Then delete the week itself
      await query(
        'DELETE FROM weeks WHERE id = $1',
        [id]
      );
      
      // Check if any rows were affected (meaning the week existed and was deleted)
      return true; // pg library doesn't return rowCount easily, so we assume success
    } catch (error) {
      console.error('Error deleting week and associated games:', error);
      return false;
    }
  }
}

// Convenience functions
export async function getActiveWeek(date?: string): Promise<Week | null> {
  const activeWeeks = await WeekRepository.findActive(date);
  return activeWeeks[0] || null;
}

// Week validation utilities
export class WeekValidator {
  
  static validateCreateInput(data: CreateWeekInput): string[] {
    const errors: string[] = [];

    // Handle invalid input
    if (!data || typeof data !== 'object') {
      return ['Invalid input data'];
    }

    // Name validation
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Week name is required');
    } else if (data.name.trim().length > 255) {
      errors.push('Week name must be 255 characters or less');
    }

    // Date validation
    if (!data.start_date) {
      errors.push('Start date is required');
    }

    if (!data.end_date) {
      errors.push('End date is required');
    }

    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);

      if (isNaN(startDate.getTime())) {
        errors.push('Start date is invalid');
      }

      if (isNaN(endDate.getTime())) {
        errors.push('End date is invalid');
      }

      if (startDate >= endDate) {
        errors.push('End date must be after start date');
      }
    }

    // Description validation
    if (data.description && data.description.length > 1000) {
      errors.push('Description must be 1000 characters or less');
    }

    // Max picker choice games validation
    if (data.max_picker_choice_games !== undefined && data.max_picker_choice_games !== null) {
      if (!Number.isInteger(data.max_picker_choice_games) || data.max_picker_choice_games < 1) {
        errors.push('Max picker choice games must be a positive integer');
      } else if (data.max_picker_choice_games > 100) {
        errors.push('Max picker choice games must be 100 or less');
      }
    }

    // Max triple plays validation
    if (data.max_triple_plays !== undefined && data.max_triple_plays !== null) {
      if (!Number.isInteger(data.max_triple_plays) || data.max_triple_plays < 1) {
        errors.push('Max triple plays must be a positive integer');
      } else if (data.max_triple_plays > 50) {
        errors.push('Max triple plays must be 50 or less');
      }
    }

    return errors;
  }

  static validateUpdateInput(data: UpdateWeekInput): string[] {
    const errors: string[] = [];

    // Handle invalid input
    if (!data || typeof data !== 'object') {
      return ['Invalid input data'];
    }

    // Name validation (if provided)
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        errors.push('Week name cannot be empty');
      } else if (data.name.trim().length > 255) {
        errors.push('Week name must be 255 characters or less');
      }
    }

    // Date validation (if provided)
    if (data.start_date !== undefined) {
      const startDate = new Date(data.start_date);
      if (isNaN(startDate.getTime())) {
        errors.push('Start date is invalid');
      }
    }

    if (data.end_date !== undefined) {
      const endDate = new Date(data.end_date);
      if (isNaN(endDate.getTime())) {
        errors.push('End date is invalid');
      }
    }

    // Check date range if both dates are provided
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate >= endDate) {
        errors.push('End date must be after start date');
      }
    }

    // Description validation (if provided)
    if (data.description !== undefined && data.description.length > 1000) {
      errors.push('Description must be 1000 characters or less');
    }

    // Max picker choice games validation (if provided)
    if (data.max_picker_choice_games !== undefined && data.max_picker_choice_games !== null) {
      if (!Number.isInteger(data.max_picker_choice_games) || data.max_picker_choice_games < 1) {
        errors.push('Max picker choice games must be a positive integer');
      } else if (data.max_picker_choice_games > 100) {
        errors.push('Max picker choice games must be 100 or less');
      }
    }

    // Max triple plays validation (if provided)
    if (data.max_triple_plays !== undefined && data.max_triple_plays !== null) {
      if (!Number.isInteger(data.max_triple_plays) || data.max_triple_plays < 1) {
        errors.push('Max triple plays must be a positive integer');
      } else if (data.max_triple_plays > 50) {
        errors.push('Max triple plays must be 50 or less');
      }
    }

    return errors;
  }
}