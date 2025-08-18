import { GET } from '../route';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      status: options?.status || 200,
      json: async () => data,
    })),
  },
}));

// Mock the weeks library
jest.mock('../../../../../lib/weeks', () => ({
  getActiveWeek: jest.fn(),
}));

import { getActiveWeek } from '../../../../../lib/weeks';

const mockGetActiveWeek = getActiveWeek as jest.MockedFunction<typeof getActiveWeek>;

describe('/api/weeks/active', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return active week when one exists', async () => {
    const mockWeek = {
      id: 1,
      name: 'Week 1',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-07T23:59:59Z',
      description: 'First week',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockGetActiveWeek.mockResolvedValue(mockWeek);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      data: mockWeek,
    });
    expect(mockGetActiveWeek).toHaveBeenCalledTimes(1);
  });

  it('should return null when no active week exists', async () => {
    mockGetActiveWeek.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      data: null,
      message: 'No active week found',
    });
    expect(mockGetActiveWeek).toHaveBeenCalledTimes(1);
  });

  it('should handle database errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetActiveWeek.mockRejectedValue(new Error('Database connection failed'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to fetch active week',
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching active week:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should handle unexpected errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetActiveWeek.mockRejectedValue('Unexpected error');

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to fetch active week',
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching active week:',
      'Unexpected error'
    );

    consoleErrorSpy.mockRestore();
  });
});