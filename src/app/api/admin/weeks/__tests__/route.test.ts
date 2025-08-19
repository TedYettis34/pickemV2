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

jest.mock('../../../../../lib/weeks', () => ({
  WeekRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    findActive: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    isNameTaken: jest.fn(),
    hasDateConflict: jest.fn(),
  },
  WeekValidator: {
    validateCreateInput: jest.fn(),
    validateUpdateInput: jest.fn(),
  },
}));

jest.mock('../../../../../lib/adminAuth');

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { WeekRepository, WeekValidator } from '../../../../../lib/weeks';
import { requireAdmin } from '../../../../../lib/adminAuth';
import { Week, CreateWeekInput } from '../../../../../types/week';

const mockWeekRepository = WeekRepository as {
  findAll: jest.MockedFunction<(filters?: unknown) => Promise<Week[]>>;
  findById: jest.MockedFunction<(id: number) => Promise<Week | null>>;
  findByName: jest.MockedFunction<(name: string) => Promise<Week | null>>;
  findActive: jest.MockedFunction<(date?: string) => Promise<Week[]>>;
  create: jest.MockedFunction<(data: CreateWeekInput) => Promise<Week>>;
  update: jest.MockedFunction<(id: number, data: unknown) => Promise<Week | null>>;
  delete: jest.MockedFunction<(id: number) => Promise<boolean>>;
  isNameTaken: jest.MockedFunction<(name: string, excludeId?: number) => Promise<boolean>>;
  hasDateConflict: jest.MockedFunction<(startDate: string, endDate: string, excludeId?: number) => Promise<Week | null>>;
};

const mockWeekValidator = WeekValidator as {
  validateCreateInput: jest.MockedFunction<(data: CreateWeekInput) => string[]>;
  validateUpdateInput: jest.MockedFunction<(data: unknown) => string[]>;
};

const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;

describe('/api/admin/weeks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    const mockAdminAuth = jest.fn();

    beforeEach(() => {
      mockRequireAdmin.mockReturnValue(mockAdminAuth);
    });

    it('should return 401 when user is not authorized', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: false,
        error: 'Unauthorized',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/weeks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return weeks when user is authorized', async () => {
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

      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findAll.mockResolvedValue(mockWeeks);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockWeeks);
      expect(mockWeekRepository.findAll).toHaveBeenCalledWith({});
    });

    it('should apply filters from query parameters', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findAll.mockResolvedValue([]);

      const url = 'http://localhost:3000/api/admin/weeks?name=Week%201&start_date_from=2024-01-01&active_on=2024-01-05';
      const request = new NextRequest(url);
      await GET(request);

      expect(mockWeekRepository.findAll).toHaveBeenCalledWith({
        name: 'Week 1',
        start_date_from: '2024-01-01',
        active_on: '2024-01-05',
      });
    });

    it('should return 500 when database error occurs', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findAll.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/weeks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to fetch weeks');
    });
  });

  describe('POST', () => {
    const mockAdminAuth = jest.fn();

    beforeEach(() => {
      mockRequireAdmin.mockReturnValue(mockAdminAuth);
    });

    it('should return 401 when user is not authorized', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: false,
        error: 'Admin access required',
      });

      const requestBody = {
        name: 'Week 1',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        description: 'First week',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/weeks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Admin access required');
    });

    it('should return 400 when validation fails', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });

      // Mock validation to return errors
      mockWeekValidator.validateCreateInput.mockReturnValue(['Week name is required']);

      const requestBody = {
        name: '', // Invalid: empty name
        start_date: '2024-01-01',
        end_date: '2024-01-07',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/weeks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.message).toContain('Week name is required');
    });

    it('should return 409 when week name already exists', async () => {
      const existingWeek: Week = {
        id: 1,
        name: 'Week 1',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        description: 'Existing week',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      // Mock validation to pass
      mockWeekValidator.validateCreateInput.mockReturnValue([]);
      mockWeekRepository.findByName.mockResolvedValue(existingWeek);

      const requestBody = {
        name: 'Week 1',
        start_date: '2024-01-08',
        end_date: '2024-01-14',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/weeks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Week name already exists');
    });

    it('should return 409 when date range conflicts', async () => {
      const conflictingWeek: Week = {
        id: 1,
        name: 'Existing Week',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        description: 'Conflicting week',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      // Mock validation to pass
      mockWeekValidator.validateCreateInput.mockReturnValue([]);
      mockWeekRepository.findByName.mockResolvedValue(null);
      mockWeekRepository.hasDateConflict.mockResolvedValue(conflictingWeek);

      const requestBody = {
        name: 'Week 2',
        start_date: '2024-01-05',
        end_date: '2024-01-10',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/weeks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Date range conflicts with existing week: Existing Week');
    });

    it('should create week successfully when all validations pass', async () => {
      const requestBody: CreateWeekInput = {
        name: 'Week 1',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        description: 'First week',
      };

      const createdWeek: Week = {
        id: 1,
        ...requestBody,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      // Mock validation to pass
      mockWeekValidator.validateCreateInput.mockReturnValue([]);
      mockWeekRepository.findByName.mockResolvedValue(null);
      mockWeekRepository.hasDateConflict.mockResolvedValue(null);
      mockWeekRepository.create.mockResolvedValue(createdWeek);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        ...createdWeek,
        gamesPreview: { nfl: [], college: [] }
      });
      expect(data.message).toBe('Week created successfully with 0 games available');

      expect(mockWeekRepository.findByName).toHaveBeenCalledWith('Week 1');
      expect(mockWeekRepository.hasDateConflict).toHaveBeenCalledWith('2024-01-01', '2024-01-07');
      expect(mockWeekRepository.create).toHaveBeenCalledWith(requestBody);
    });

    it('should handle optional description field', async () => {
      const requestBody = {
        name: 'Week 1',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        // description is optional
      };

      const createdWeek: Week = {
        id: 1,
        ...requestBody,
        description: undefined,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      // Mock validation to pass
      mockWeekValidator.validateCreateInput.mockReturnValue([]);
      mockWeekRepository.findByName.mockResolvedValue(null);
      mockWeekRepository.hasDateConflict.mockResolvedValue(null);
      mockWeekRepository.create.mockResolvedValue(createdWeek);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(mockWeekRepository.create).toHaveBeenCalledWith({
        name: 'Week 1',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        description: undefined,
      });
    });

    it('should return 500 when database error occurs during creation', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      // Mock validation to pass
      mockWeekValidator.validateCreateInput.mockReturnValue([]);
      mockWeekRepository.findByName.mockResolvedValue(null);
      mockWeekRepository.hasDateConflict.mockResolvedValue(null);
      mockWeekRepository.create.mockRejectedValue(new Error('Database connection failed'));

      const requestBody = {
        name: 'Week 1',
        start_date: '2024-01-01',
        end_date: '2024-01-07',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/weeks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to create week');
    });
  });
});