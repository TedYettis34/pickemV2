// Mock the database module BEFORE imports
jest.mock('../database', () => ({
  query: jest.fn(),
}));

// Mock AWS SDK
jest.mock('@aws-sdk/client-cognito-identity-provider', () => {
  const mockSend = jest.fn();
  return {
    CognitoIdentityProviderClient: jest.fn(() => ({
      send: mockSend,
    })),
    GetUserCommand: jest.fn(),
    __mockSend: mockSend,
  };
});

import { 
  getUserByCognitoId, 
  getUserByEmail, 
  syncUserFromCognito, 
  getAllUsers, 
  updateUserAdminStatus,
  User 
} from '../users';
import { query } from '../database';
import { GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const mockQuery = query as jest.MockedFunction<typeof query>;

// Get access to the mock
const mockModule = jest.requireMock('@aws-sdk/client-cognito-identity-provider');
const mockSend = mockModule.__mockSend;

describe('Users Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockClear();
    mockSend.mockClear();
    // Set required environment variables for tests
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.NEXT_PUBLIC_AWS_REGION = 'us-east-1';
  });

  describe('getUserByCognitoId', () => {
    it('should return user when found', async () => {
      const mockUser: User = {
        id: 1,
        cognito_user_id: 'cognito-123',
        email: 'test@example.com',
        name: 'Test User',
        timezone: 'UTC',
        is_admin: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValue([mockUser]);

      const result = await getUserByCognitoId('cognito-123');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE cognito_user_id = $1',
        ['cognito-123']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await getUserByCognitoId('cognito-nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error when database query fails', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(getUserByCognitoId('cognito-123')).rejects.toThrow('Database error');
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      const mockUser: User = {
        id: 1,
        cognito_user_id: 'cognito-123',
        email: 'test@example.com',
        name: 'Test User',
        timezone: 'UTC',
        is_admin: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValue([mockUser]);

      const result = await getUserByEmail('test@example.com');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('syncUserFromCognito', () => {
    it('should update existing user', async () => {
      const existingUser: User = {
        id: 1,
        cognito_user_id: 'cognito-sub-123',
        email: 'old@example.com',
        name: 'Old Name',
        timezone: 'UTC',
        is_admin: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const updatedUser: User = {
        ...existingUser,
        email: 'new@example.com',
        name: 'New Name',
        updated_at: '2024-01-02T00:00:00Z',
      };

      // Mock Cognito response
      mockSend.mockResolvedValue({
        Username: 'cognito-123',
        UserAttributes: [
          { Name: 'sub', Value: 'cognito-sub-123' },
          { Name: 'email', Value: 'new@example.com' },
          { Name: 'name', Value: 'New Name' },
        ],
      });

      // Mock database responses
      mockQuery
        .mockResolvedValueOnce([existingUser]) // getUserByCognitoId
        .mockResolvedValueOnce([updatedUser]); // UPDATE query

      const result = await syncUserFromCognito('access-token');

      expect(mockSend).toHaveBeenCalledWith(expect.any(GetUserCommand));
      expect(result).toEqual(updatedUser);
    });

    it('should create new user when not exists', async () => {
      const newUser: User = {
        id: 1,
        cognito_user_id: 'cognito-sub-456',
        email: 'new@example.com',
        name: 'New User',
        timezone: 'UTC',
        is_admin: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock Cognito response
      mockSend.mockResolvedValue({
        Username: 'cognito-123',
        UserAttributes: [
          { Name: 'sub', Value: 'cognito-sub-456' },
          { Name: 'email', Value: 'new@example.com' },
          { Name: 'name', Value: 'New User' },
        ],
      });

      // Mock database responses
      mockQuery
        .mockResolvedValueOnce([]) // getUserByCognitoId (not found)
        .mockResolvedValueOnce([newUser]); // INSERT query

      const result = await syncUserFromCognito('access-token');

      expect(result).toEqual(newUser);
    });

    it('should throw error when cognitoUser is undefined', async () => {
      mockSend.mockResolvedValue(undefined);

      await expect(syncUserFromCognito('access-token')).rejects.toThrow('No username found in Cognito response');
    });

    it('should throw error when missing username', async () => {
      mockSend.mockResolvedValue({
        Username: undefined,
        UserAttributes: [],
      });

      await expect(syncUserFromCognito('access-token')).rejects.toThrow('No username found in Cognito response');
    });

    it('should handle missing name attribute by using email fallback', async () => {
      mockSend.mockResolvedValue({
        Username: 'cognito-123',
        UserAttributes: [
          { Name: 'sub', Value: 'cognito-sub-789' },
          { Name: 'email', Value: 'test@example.com' },
          // Missing name attribute - should use Cognito username as fallback
        ],
      });

      // Mock that user doesn't exist, so it creates new one
      mockQuery.mockResolvedValueOnce([]); // getUserByCognitoId returns no user
      mockQuery.mockResolvedValueOnce([{  // INSERT returns new user
        id: 1,
        cognito_user_id: 'cognito-sub-789',
        email: 'test@example.com',
        name: 'cognito-123', // Should use Cognito username as fallback
        timezone: 'UTC',
        is_admin: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }]);

      const result = await syncUserFromCognito('access-token');
      expect(result.name).toBe('cognito-123'); // Cognito username should be used as fallback
    });

    it('should throw error when missing email', async () => {
      mockSend.mockResolvedValue({
        Username: 'cognito-123',
        UserAttributes: [
          { Name: 'name', Value: 'Test User' },
          // Missing email attribute
        ],
      });

      await expect(syncUserFromCognito('access-token')).rejects.toThrow('Email is required from Cognito');
    });
  });

  describe('getAllUsers', () => {
    beforeEach(() => {
      mockQuery.mockReset();
    });
    
    it('should return list of users with default limit', async () => {
      const mockUsers: User[] = [
        {
          id: 1,
          cognito_user_id: 'cognito-123',
          email: 'user1@example.com',
          name: 'User 1',
          timezone: 'UTC',
          is_admin: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          cognito_user_id: 'cognito-456',
          email: 'user2@example.com',
          name: 'User 2',
          timezone: 'UTC',
          is_admin: true,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockQuery.mockResolvedValue(mockUsers);

      const result = await getAllUsers();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, cognito_user_id, email, name'),
        [50]
      );
      expect(result).toEqual(mockUsers);
    });

    it('should respect custom limit', async () => {
      mockQuery.mockResolvedValue([]);

      await getAllUsers(10);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [10]
      );
    });
  });

  describe('updateUserAdminStatus', () => {
    beforeEach(() => {
      mockQuery.mockReset();
    });
    
    it('should update user admin status', async () => {
      const updatedUser: User = {
        id: 1,
        cognito_user_id: 'cognito-123',
        email: 'test@example.com',
        name: 'Test User',
        timezone: 'UTC',
        is_admin: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockQuery.mockResolvedValue([updatedUser]);

      const result = await updateUserAdminStatus(1, true);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [1, true]
      );
      expect(result).toEqual(updatedUser);
    });

    it('should throw error when user not found', async () => {
      mockQuery.mockResolvedValue([]);

      await expect(updateUserAdminStatus(999, true)).rejects.toThrow('User not found');
    });
  });
});