import { NextRequest } from 'next/server';
import { DELETE } from '../route';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, options) => ({
      status: options?.status || 200,
      json: async () => data,
    })),
  },
}));

// Mock the picks library
jest.mock('../../../../../lib/picks', () => ({
  deletePick: jest.fn(),
  validatePick: jest.fn(),
}));

import { deletePick, validatePick } from '../../../../../lib/picks';

const mockDeletePick = deletePick as jest.MockedFunction<typeof deletePick>;
const mockValidatePick = validatePick as jest.MockedFunction<typeof validatePick>;

describe('/api/picks/[gameId] DELETE', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete pick successfully', async () => {
    mockValidatePick.mockResolvedValue({ isValid: true });
    mockDeletePick.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/picks/1', {
      method: 'DELETE',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
      },
    });

    const response = await DELETE(request, { params: { gameId: '1' } });
    await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      message: 'Pick deleted successfully',
    });
    expect(mockValidatePick).toHaveBeenCalledWith('user123', 1);
    expect(mockDeletePick).toHaveBeenCalledWith('user123', 1);
  });

  it('should return 401 when no authorization header provided', async () => {
    const request = new NextRequest('http://localhost/api/picks/1', {
      method: 'DELETE',
      headers: {},
    });

    const response = await DELETE(request, { params: { gameId: '1' } });
    await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'Authorization header required',
    });
  });

  it('should return 401 when no user ID provided', async () => {
    const request = new NextRequest('http://localhost/api/picks/1', {
      method: 'DELETE',
      headers: {
        'authorization': 'Bearer token123',
      },
    });

    const response = await DELETE(request, { params: { gameId: '1' } });
    await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'User ID required',
    });
  });

  it('should return 400 when game ID is invalid', async () => {
    const request = new NextRequest('http://localhost/api/picks/invalid', {
      method: 'DELETE',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
      },
    });

    const response = await DELETE(request, { params: { gameId: 'invalid' } });
    await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Invalid game ID',
    });
  });

  it('should return 400 when pick validation fails', async () => {
    mockValidatePick.mockResolvedValue({ 
      isValid: false, 
      error: 'Picks have already been submitted' 
    });

    const request = new NextRequest('http://localhost/api/picks/1', {
      method: 'DELETE',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
      },
    });

    const response = await DELETE(request, { params: { gameId: '1' } });
    await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Picks have already been submitted',
    });
  });

  it('should return 500 when delete operation fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockValidatePick.mockResolvedValue({ isValid: true });
    mockDeletePick.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/picks/1', {
      method: 'DELETE',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
      },
    });

    const response = await DELETE(request, { params: { gameId: '1' } });
    await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to delete pick',
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error deleting pick:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should handle zero game ID', async () => {
    const request = new NextRequest('http://localhost/api/picks/0', {
      method: 'DELETE',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
      },
    });

    const response = await DELETE(request, { params: { gameId: '0' } });
    await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Invalid game ID',
    });
  });

  it('should handle negative game ID', async () => {
    const request = new NextRequest('http://localhost/api/picks/-1', {
      method: 'DELETE',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
      },
    });

    const response = await DELETE(request, { params: { gameId: '-1' } });
    await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Invalid game ID',
    });
  });

  it('should handle validation check failure', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockValidatePick.mockRejectedValue(new Error('Validation failed'));

    const request = new NextRequest('http://localhost/api/picks/1', {
      method: 'DELETE',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
      },
    });

    const response = await DELETE(request, { params: { gameId: '1' } });
    await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to delete pick',
    });

    consoleErrorSpy.mockRestore();
  });

  it('should parse game ID correctly for different values', async () => {
    mockValidatePick.mockResolvedValue({ isValid: true });
    mockDeletePick.mockResolvedValue(undefined);

    const testCases = [
      { gameId: '1', expectedGameId: 1 },
      { gameId: '10', expectedGameId: 10 },
      { gameId: '999', expectedGameId: 999 },
    ];

    for (const testCase of testCases) {
      jest.clearAllMocks();
      
      const request = new NextRequest(`http://localhost/api/picks/${testCase.gameId}`, {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer token123',
          'x-user-id': 'user123',
        },
      });

      await DELETE(request, { params: { gameId: testCase.gameId } });

      expect(mockValidatePick).toHaveBeenCalledWith('user123', testCase.expectedGameId);
      expect(mockDeletePick).toHaveBeenCalledWith('user123', testCase.expectedGameId);
    }
  });

  it('should handle large game IDs correctly', async () => {
    mockValidatePick.mockResolvedValue({ isValid: true });
    mockDeletePick.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/picks/999999', {
      method: 'DELETE',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
      },
    });

    const response = await DELETE(request, { params: { gameId: '999999' } });
    await response.json();

    expect(response.status).toBe(200);
    expect(mockValidatePick).toHaveBeenCalledWith('user123', 999999);
    expect(mockDeletePick).toHaveBeenCalledWith('user123', 999999);
  });

  it('should handle different validation error messages', async () => {
    const errorMessages = [
      'Game not found',
      'Game has already started',
      'Cannot delete picks on games that have already started',
      'Picks have already been submitted for this week',
    ];

    for (const errorMessage of errorMessages) {
      jest.clearAllMocks();
      
      mockValidatePick.mockResolvedValue({ 
        isValid: false, 
        error: errorMessage 
      });

      const request = new NextRequest('http://localhost/api/picks/1', {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer token123',
          'x-user-id': 'user123',
        },
      });

      const response = await DELETE(request, { params: { gameId: '1' } });
      await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: errorMessage,
      });
    }
  });
});