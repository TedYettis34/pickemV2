/**
 * @jest-environment node
 */

// Mock dependencies BEFORE imports
jest.mock('../../../../../../lib/database', () => ({
  getDatabase: jest.fn(),
  closeDatabasePool: jest.fn(),
  query: jest.fn(),
  transaction: jest.fn(),
}));

jest.mock('../../../../../../lib/weeks', () => ({
  WeekRepository: {
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    isNameTaken: jest.fn(),
    hasDateConflict: jest.fn(),
  },
  WeekValidator: {
    validateUpdateInput: jest.fn(),
  },
}));

jest.mock('../../../../../../lib/adminAuth');

jest.mock('../../../../../../lib/games', () => ({
  getGamesByWeekId: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '../route';
import { WeekRepository, WeekValidator } from '../../../../../../lib/weeks';
import { requireAdmin } from '../../../../../../lib/adminAuth';
import { getGamesByWeekId } from '../../../../../../lib/games';
import { Week, UpdateWeekInput } from '../../../../../../types/week';

const mockWeekRepository = WeekRepository as {
  findById: jest.MockedFunction<(id: number) => Promise<Week | null>>;
  update: jest.MockedFunction<(id: number, data: UpdateWeekInput) => Promise<Week | null>>;
  delete: jest.MockedFunction<(id: number) => Promise<boolean>>;
  isNameTaken: jest.MockedFunction<(name: string, excludeId?: number) => Promise<boolean>>;
  hasDateConflict: jest.MockedFunction<(startDate: string, endDate: string, excludeId?: number) => Promise<Week | null>>;
};

const mockWeekValidator = WeekValidator as {
  validateUpdateInput: jest.MockedFunction<(data: UpdateWeekInput) => string[]>;
};

const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;

const mockGetGamesByWeekId = getGamesByWeekId as jest.MockedFunction<typeof getGamesByWeekId>;

describe('/api/admin/weeks/[id]', () => {
  const mockWeek: Week = {
    id: 1,
    name: 'Week 1',
    start_date: '2024-01-01',
    end_date: '2024-01-07',
    description: 'First week',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    const mockAdminAuth = jest.fn();

    beforeEach(() => {
      mockRequireAdmin.mockReturnValue(mockAdminAuth);
    });

    it('should return week when found and user is authorized', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(mockWeek);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1');
      const params = Promise.resolve({ id: '1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockWeek);
      expect(mockWeekRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should return 401 when user is not authorized', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: false,
        error: 'Unauthorized',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1');
      const params = Promise.resolve({ id: '1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid week ID', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/invalid');
      const params = Promise.resolve({ id: 'invalid' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid week ID');
    });

    it('should return 404 when week not found', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/999');
      const params = Promise.resolve({ id: '999' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Week not found');
    });

    it('should return 500 on database error', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1');
      const params = Promise.resolve({ id: '1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch week');
    });
  });

  describe('PUT', () => {
    const mockAdminAuth = jest.fn();

    beforeEach(() => {
      mockRequireAdmin.mockReturnValue(mockAdminAuth);
    });

    it('should update week successfully', async () => {
      const updateData: UpdateWeekInput = {
        name: 'Updated Week 1',
        description: 'Updated description',
      };

      const updatedWeek: Week = {
        ...mockWeek,
        ...updateData,
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(mockWeek);
      mockWeekValidator.validateUpdateInput.mockReturnValue([]);
      mockWeekRepository.isNameTaken.mockResolvedValue(false);
      mockWeekRepository.hasDateConflict.mockResolvedValue(null);
      mockWeekRepository.update.mockResolvedValue(updatedWeek);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = Promise.resolve({ id: '1' });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(updatedWeek);
      expect(data.message).toBe('Week updated successfully');
    });

    it('should return 404 when week not found', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/999', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Test' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = Promise.resolve({ id: '999' });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Week not found');
    });

    it('should return 400 for validation errors', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(mockWeek);
      mockWeekValidator.validateUpdateInput.mockReturnValue(['Name is required']);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1', {
        method: 'PUT',
        body: JSON.stringify({ name: '' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = Promise.resolve({ id: '1' });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.message).toBe('Name is required');
    });

    it('should return 409 for name conflicts', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(mockWeek);
      mockWeekValidator.validateUpdateInput.mockReturnValue([]);
      mockWeekRepository.isNameTaken.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Existing Week' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = Promise.resolve({ id: '1' });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Week name already exists');
    });

    it('should return 409 for date conflicts', async () => {
      const conflictingWeek: Week = {
        id: 2,
        name: 'Conflicting Week',
        start_date: '2024-01-05',
        end_date: '2024-01-10',
        description: 'Conflicts with update',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(mockWeek);
      mockWeekValidator.validateUpdateInput.mockReturnValue([]);
      mockWeekRepository.hasDateConflict.mockResolvedValue(conflictingWeek);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1', {
        method: 'PUT',
        body: JSON.stringify({ start_date: '2024-01-06' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = Promise.resolve({ id: '1' });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Date range conflicts with existing week: Conflicting Week');
    });

    it('should update week with max_picker_choice_games successfully', async () => {
      const updateData: UpdateWeekInput = {
        name: 'Updated Week 1',
        description: 'Updated description',
        max_picker_choice_games: 7,
      };

      const updatedWeek: Week = {
        ...mockWeek,
        ...updateData,
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(mockWeek);
      mockWeekValidator.validateUpdateInput.mockReturnValue([]);
      mockWeekRepository.isNameTaken.mockResolvedValue(false);
      mockWeekRepository.hasDateConflict.mockResolvedValue(null);
      mockWeekRepository.update.mockResolvedValue(updatedWeek);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = Promise.resolve({ id: '1' });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(updatedWeek);
      expect(data.message).toBe('Week updated successfully');
      expect(mockWeekRepository.update).toHaveBeenCalledWith(1, updateData);
    });
  });

  describe('DELETE', () => {
    const mockAdminAuth = jest.fn();

    beforeEach(() => {
      mockRequireAdmin.mockReturnValue(mockAdminAuth);
    });

    it('should delete week successfully', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(mockWeek);
      mockGetGamesByWeekId.mockResolvedValue([]); // Mock empty games array
      mockWeekRepository.delete.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: '1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Week "Week 1" and 0 associated games deleted successfully');
      expect(mockWeekRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should return 404 when week not found', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/999', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: '999' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Week not found');
    });

    it('should return 500 when delete fails', async () => {
      mockAdminAuth.mockResolvedValue({
        isAuthorized: true,
      });
      mockWeekRepository.findById.mockResolvedValue(mockWeek);
      mockGetGamesByWeekId.mockResolvedValue([]); // Mock empty games array
      mockWeekRepository.delete.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/weeks/1', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: '1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to delete week');
    });
  });
});