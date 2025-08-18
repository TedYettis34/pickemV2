import { NextRequest } from 'next/server';
import { POST } from '../route';

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

// Helper to create mock request with proper headers
const createMockRequest = (url: string, options: {
  method: string;
  headers: Record<string, string>;
  body?: string;
}) => {
  const headers = new Map(Object.entries(options.headers));
  return {
    url,
    method: options.method,
    headers: {
      get: (key: string) => headers.get(key.toLowerCase()) || null,
    },
    json: async () => options.body ? JSON.parse(options.body) : {},
  } as unknown as NextRequest;
};

// Mock the picks library
jest.mock('../../../../lib/picks', () => ({
  createOrUpdatePick: jest.fn(),
  validatePick: jest.fn(),
}));

import { createOrUpdatePick, validatePick } from '../../../../lib/picks';

const mockCreateOrUpdatePick = createOrUpdatePick as jest.MockedFunction<typeof createOrUpdatePick>;
const mockValidatePick = validatePick as jest.MockedFunction<typeof validatePick>;

describe('/api/picks POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a pick successfully', async () => {
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

    mockValidatePick.mockResolvedValue({ isValid: true });
    mockCreateOrUpdatePick.mockResolvedValue(mockPick);

    const request = createMockRequest('http://localhost/api/picks', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        game_id: 1,
        pick_type: 'home_spread',
        spread_value: -3.5,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      data: mockPick,
    });
    expect(mockValidatePick).toHaveBeenCalledWith('user123', 1);
    expect(mockCreateOrUpdatePick).toHaveBeenCalledWith('user123', 1, {
      game_id: 1,
      pick_type: 'home_spread',
      spread_value: -3.5,
    });
  });

  it('should return 401 when no authorization header provided', async () => {
    const request = createMockRequest('http://localhost/api/picks', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        game_id: 1,
        pick_type: 'home_spread',
        spread_value: -3.5,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'Authorization header required',
    });
  });

  it('should return 401 when no user ID provided', async () => {
    const request = createMockRequest('http://localhost/api/picks', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        game_id: 1,
        pick_type: 'home_spread',
        spread_value: -3.5,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'User ID required',
    });
  });

  it('should return 400 when required fields are missing', async () => {
    const request = createMockRequest('http://localhost/api/picks', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        game_id: 1,
        // missing pick_type
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Game ID and pick type are required',
    });
  });

  it('should return 400 when pick type is invalid', async () => {
    const request = createMockRequest('http://localhost/api/picks', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        game_id: 1,
        pick_type: 'invalid_type',
        spread_value: -3.5,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Invalid pick type',
    });
  });

  it('should return 400 when pick validation fails', async () => {
    mockValidatePick.mockResolvedValue({ 
      isValid: false, 
      error: 'Game has already started' 
    });

    const request = createMockRequest('http://localhost/api/picks', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        game_id: 1,
        pick_type: 'home_spread',
        spread_value: -3.5,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Game has already started',
    });
  });

  it('should return 500 when database operation fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockValidatePick.mockResolvedValue({ isValid: true });
    mockCreateOrUpdatePick.mockRejectedValue(new Error('Database error'));

    const request = createMockRequest('http://localhost/api/picks', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        game_id: 1,
        pick_type: 'home_spread',
        spread_value: -3.5,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to create pick',
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error creating/updating pick:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should handle away spread picks', async () => {
    const mockPick = {
      id: 1,
      user_id: 'user123',
      game_id: 1,
      pick_type: 'away_spread',
      spread_value: 3.5,
      submitted: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockValidatePick.mockResolvedValue({ isValid: true });
    mockCreateOrUpdatePick.mockResolvedValue(mockPick);

    const request = createMockRequest('http://localhost/api/picks', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        game_id: 1,
        pick_type: 'away_spread',
        spread_value: 3.5,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.pick_type).toBe('away_spread');
    expect(data.data.spread_value).toBe(3.5);
  });

  it('should handle null spread values', async () => {
    const mockPick = {
      id: 1,
      user_id: 'user123',
      game_id: 1,
      pick_type: 'home_spread',
      spread_value: null,
      submitted: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockValidatePick.mockResolvedValue({ isValid: true });
    mockCreateOrUpdatePick.mockResolvedValue(mockPick);

    const request = createMockRequest('http://localhost/api/picks', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        game_id: 1,
        pick_type: 'home_spread',
        spread_value: null,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.spread_value).toBeNull();
  });
});