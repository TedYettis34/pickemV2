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

// Mock the picks library
jest.mock('../../../../lib/picks', () => ({
  submitPicksForWeek: jest.fn(),
  hasSubmittedPicksForWeek: jest.fn(),
}));

import { submitPicksForWeek, hasSubmittedPicksForWeek } from '../../../../lib/picks';

const mockSubmitPicksForWeek = submitPicksForWeek as jest.MockedFunction<typeof submitPicksForWeek>;
const mockHasSubmittedPicksForWeek = hasSubmittedPicksForWeek as jest.MockedFunction<typeof hasSubmittedPicksForWeek>;

describe('/api/picks/submit POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should submit picks successfully', async () => {
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
      {
        id: 2,
        user_id: 'user123',
        game_id: 2,
        pick_type: 'away_spread',
        spread_value: 7.5,
        submitted: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
      },
    ];

    mockHasSubmittedPicksForWeek.mockResolvedValue(false);
    mockSubmitPicksForWeek.mockResolvedValue(mockSubmittedPicks);

    const request = new NextRequest('http://localhost/api/picks/submit', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ weekId: 1 }),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      message: 'Picks submitted successfully',
      data: mockSubmittedPicks,
    });
    expect(mockHasSubmittedPicksForWeek).toHaveBeenCalledWith('user123', 1);
    expect(mockSubmitPicksForWeek).toHaveBeenCalledWith('user123', 1);
  });

  it('should return 401 when no authorization header provided', async () => {
    const request = new NextRequest('http://localhost/api/picks/submit', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ weekId: 1 }),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'Authorization header required',
    });
  });

  it('should return 401 when no user ID provided', async () => {
    const request = new NextRequest('http://localhost/api/picks/submit', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ weekId: 1 }),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'User ID required',
    });
  });

  it('should return 400 when week ID is missing', async () => {
    const request = new NextRequest('http://localhost/api/picks/submit', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Week ID is required',
    });
  });

  it('should return 400 when week ID is invalid', async () => {
    const request = new NextRequest('http://localhost/api/picks/submit', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ weekId: 'invalid' }),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Invalid week ID',
    });
  });

  it('should return 400 when picks are already submitted', async () => {
    mockHasSubmittedPicksForWeek.mockResolvedValue(true);

    const request = new NextRequest('http://localhost/api/picks/submit', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ weekId: 1 }),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Picks have already been submitted for this week',
    });
    expect(mockHasSubmittedPicksForWeek).toHaveBeenCalledWith('user123', 1);
    expect(mockSubmitPicksForWeek).not.toHaveBeenCalled();
  });

  it('should return 500 when submission fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockHasSubmittedPicksForWeek.mockResolvedValue(false);
    mockSubmitPicksForWeek.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/picks/submit', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ weekId: 1 }),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to submit picks',
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error submitting picks:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should handle malformed JSON body', async () => {
    const request = new NextRequest('http://localhost/api/picks/submit', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: 'invalid json',
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid request body');
  });

  it('should handle zero week ID', async () => {
    const request = new NextRequest('http://localhost/api/picks/submit', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ weekId: 0 }),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Invalid week ID',
    });
  });

  it('should handle negative week ID', async () => {
    const request = new NextRequest('http://localhost/api/picks/submit', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ weekId: -1 }),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Invalid week ID',
    });
  });

  it('should handle submission check failure', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockHasSubmittedPicksForWeek.mockRejectedValue(new Error('Check failed'));

    const request = new NextRequest('http://localhost/api/picks/submit', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ weekId: 1 }),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to submit picks',
    });

    consoleErrorSpy.mockRestore();
  });

  it('should return empty array when no picks to submit', async () => {
    mockHasSubmittedPicksForWeek.mockResolvedValue(false);
    mockSubmitPicksForWeek.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/picks/submit', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ weekId: 1 }),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      message: 'Picks submitted successfully',
      data: [],
    });
  });

  it('should handle large week IDs correctly', async () => {
    mockHasSubmittedPicksForWeek.mockResolvedValue(false);
    mockSubmitPicksForWeek.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/picks/submit', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer token123',
        'x-user-id': 'user123',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ weekId: 999999 }),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(200);
    expect(mockHasSubmittedPicksForWeek).toHaveBeenCalledWith('user123', 999999);
    expect(mockSubmitPicksForWeek).toHaveBeenCalledWith('user123', 999999);
  });
});