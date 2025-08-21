/**
 * @jest-environment node
 */

// Mock the scoreUpdater module
jest.mock('../../../../../lib/scoreUpdater', () => ({
  updateScoresFromApi: jest.fn(),
}));

import { GET, POST } from '../route';
import { updateScoresFromApi } from '../../../../../lib/scoreUpdater';

const mockUpdateScoresFromApi = updateScoresFromApi as jest.MockedFunction<typeof updateScoresFromApi>;

describe('/api/scores/update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('POST', () => {
    test('should successfully update scores and return result', async () => {
      const mockResult = {
        gamesChecked: 5,
        gamesUpdated: 3,
        errors: []
      };

      mockUpdateScoresFromApi.mockResolvedValue(mockResult);

      const response = await POST();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        success: true,
        data: mockResult,
        message: 'Score update complete: 3/5 games updated'
      });
      expect(mockUpdateScoresFromApi).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith('Score update requested');
    });

    test('should handle updateScoresFromApi errors', async () => {
      const mockError = new Error('API rate limit exceeded');
      mockUpdateScoresFromApi.mockRejectedValue(mockError);

      const response = await POST();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({
        success: false,
        error: 'API rate limit exceeded'
      });
      expect(console.error).toHaveBeenCalledWith('Error in score update API:', mockError);
    });

    test('should handle non-Error exceptions', async () => {
      const mockError = 'String error';
      mockUpdateScoresFromApi.mockRejectedValue(mockError);

      const response = await POST();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({
        success: false,
        error: 'Failed to update scores'
      });
    });

    test('should handle partial updates with errors', async () => {
      const mockResult = {
        gamesChecked: 3,
        gamesUpdated: 1,
        errors: [
          'Game 2: Could not extract valid scores',
          'Game 3: API timeout'
        ]
      };

      mockUpdateScoresFromApi.mockResolvedValue(mockResult);

      const response = await POST();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        success: true,
        data: mockResult,
        message: 'Score update complete: 1/3 games updated'
      });
    });
  });

  describe('GET', () => {
    test('should successfully update scores via GET request', async () => {
      const mockResult = {
        gamesChecked: 2,
        gamesUpdated: 2,
        errors: []
      };

      mockUpdateScoresFromApi.mockResolvedValue(mockResult);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        success: true,
        data: mockResult,
        message: 'Score update complete: 2/2 games updated'
      });
      expect(mockUpdateScoresFromApi).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith('Score update requested');
    });

    test('should handle updateScoresFromApi errors in GET', async () => {
      const mockError = new Error('Database connection failed');
      mockUpdateScoresFromApi.mockRejectedValue(mockError);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({
        success: false,
        error: 'Database connection failed'
      });
      expect(console.error).toHaveBeenCalledWith('Error in score update API:', mockError);
    });

    test('should handle no games needing updates', async () => {
      const mockResult = {
        gamesChecked: 0,
        gamesUpdated: 0,
        errors: []
      };

      mockUpdateScoresFromApi.mockResolvedValue(mockResult);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        success: true,
        data: mockResult,
        message: 'Score update complete: 0/0 games updated'
      });
    });
  });

  describe('Error handling consistency', () => {
    test('POST and GET should handle errors identically', async () => {
      const mockError = new Error('Identical error handling test');
      mockUpdateScoresFromApi.mockRejectedValue(mockError);

      const postResponse = await POST();
      const postBody = await postResponse.json();

      // Reset the mock for GET test
      mockUpdateScoresFromApi.mockRejectedValue(mockError);
      const getResponse = await GET();
      const getBody = await getResponse.json();

      expect(postResponse.status).toBe(getResponse.status);
      expect(postBody).toEqual(getBody);
    });

    test('POST and GET should handle success identically', async () => {
      const mockResult = {
        gamesChecked: 1,
        gamesUpdated: 1,
        errors: []
      };

      mockUpdateScoresFromApi.mockResolvedValue(mockResult);
      const postResponse = await POST();
      const postBody = await postResponse.json();

      // Reset the mock for GET test
      mockUpdateScoresFromApi.mockResolvedValue(mockResult);
      const getResponse = await GET();
      const getBody = await getResponse.json();

      expect(postResponse.status).toBe(getResponse.status);
      expect(postBody).toEqual(getBody);
    });
  });
});