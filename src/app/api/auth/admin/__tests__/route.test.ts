/**
 * @jest-environment node
 */

// Mock AWS SDK before imports
jest.mock('@aws-sdk/client-cognito-identity-provider', () => {
  const mockSend = jest.fn();
  return {
    CognitoIdentityProviderClient: jest.fn(() => ({
      send: mockSend,
    })),
    GetUserCommand: jest.fn(),
    AdminListGroupsForUserCommand: jest.fn(),
    __mockSend: mockSend,
  };
});

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { GetUserCommand, AdminListGroupsForUserCommand } from '@aws-sdk/client-cognito-identity-provider';

// Get access to the mock
const mockModule = jest.requireMock('@aws-sdk/client-cognito-identity-provider');
const mockSend = mockModule.__mockSend;

describe('/api/auth/admin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set required environment variables for tests
    process.env.NEXT_PUBLIC_USER_POOL_ID = 'test-user-pool';
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.NEXT_PUBLIC_AWS_REGION = 'us-east-1';
  });

  it('should return admin status when user is in admin group', async () => {
    // Mock GetUser response
    mockSend
      .mockResolvedValueOnce({
        Username: 'test-user',
        UserAttributes: [
          { Name: 'email', Value: 'admin@example.com' },
          { Name: 'name', Value: 'Admin User' },
        ],
      })
      // Mock AdminListGroupsForUser response
      .mockResolvedValueOnce({
        Groups: [
          { GroupName: 'admin' },
          { GroupName: 'users' },
        ],
      });

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: 'Bearer valid-access-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isAdmin).toBe(true);
    expect(data.user).toEqual({
      username: 'test-user',
      email: 'admin@example.com',
      name: 'Admin User',
      groups: ['admin', 'users'],
    });
    expect(mockSend).toHaveBeenCalledWith(expect.any(GetUserCommand));
    expect(mockSend).toHaveBeenCalledWith(expect.any(AdminListGroupsForUserCommand));
  });

  it('should return false when user is not in admin group', async () => {
    // Mock GetUser response
    mockSend
      .mockResolvedValueOnce({
        Username: 'test-user',
        UserAttributes: [
          { Name: 'email', Value: 'user@example.com' },
          { Name: 'name', Value: 'Regular User' },
        ],
      })
      // Mock AdminListGroupsForUser response
      .mockResolvedValueOnce({
        Groups: [
          { GroupName: 'users' },
        ],
      });

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: 'Bearer valid-access-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isAdmin).toBe(false);
    expect(data.user).toEqual({
      username: 'test-user',
      email: 'user@example.com',
      name: 'Regular User',
      groups: ['users'],
    });
  });

  it('should return 401 when no authorization header', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/admin');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authorization header required');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should return 401 when authorization header is malformed', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: 'InvalidFormat',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authorization header required');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should return 500 when Cognito returns generic error', async () => {
    mockSend.mockRejectedValue(new Error('Invalid token'));

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: 'Bearer invalid-access-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Authentication failed');
  });

  it('should handle user with multiple groups including admin', async () => {
    // Mock GetUser response
    mockSend
      .mockResolvedValueOnce({
        Username: 'test-user',
        UserAttributes: [
          { Name: 'email', Value: 'admin@example.com' },
          { Name: 'name', Value: 'Admin User' },
        ],
      })
      // Mock AdminListGroupsForUser response
      .mockResolvedValueOnce({
        Groups: [
          { GroupName: 'users' },
          { GroupName: 'admin' },
          { GroupName: 'moderators' },
        ],
      });

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: 'Bearer valid-access-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isAdmin).toBe(true);
    expect(data.user.groups).toEqual(['users', 'admin', 'moderators']);
  });

  it('should handle user with groups but not admin', async () => {
    // Mock GetUser response
    mockSend
      .mockResolvedValueOnce({
        Username: 'test-user',
        UserAttributes: [
          { Name: 'email', Value: 'user@example.com' },
          { Name: 'name', Value: 'Regular User' },
        ],
      })
      // Mock AdminListGroupsForUser response
      .mockResolvedValueOnce({
        Groups: [
          { GroupName: 'users' },
          { GroupName: 'moderators' },
        ],
      });

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: 'Bearer valid-access-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isAdmin).toBe(false);
    expect(data.user.groups).toEqual(['users', 'moderators']);
  });

  it('should return 401 when userResult is undefined', async () => {
    mockSend.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: 'Bearer valid-access-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid user token');
  });

  it('should return 401 when userResult lacks Username', async () => {
    mockSend.mockResolvedValue({
      UserAttributes: [
        { Name: 'email', Value: 'test@example.com' },
      ],
      // Missing Username property
    });

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: 'Bearer valid-access-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid user token');
  });

  it('should handle NotAuthorizedException', async () => {
    const notAuthorizedError = new Error('Token is expired');
    notAuthorizedError.name = 'NotAuthorizedException';
    
    mockSend.mockRejectedValue(notAuthorizedError);

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: 'Bearer expired-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid user token');
  });

  it('should handle UserNotFoundException', async () => {
    const userNotFoundError = new Error('User not found');
    userNotFoundError.name = 'UserNotFoundException';
    
    mockSend.mockRejectedValue(userNotFoundError);

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: 'Bearer invalid-user-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid user token');
  });

  it('should handle TokenExpiredException', async () => {
    const tokenExpiredError = new Error('Token expired');
    tokenExpiredError.name = 'TokenExpiredException';
    
    mockSend.mockRejectedValue(tokenExpiredError);

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: 'Bearer expired-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid user token');
  });

  it('should return 500 on unexpected server error', async () => {
    mockSend.mockRejectedValue(new Error('Service unavailable'));

    // Mock console.error to avoid test output pollution
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: 'Bearer valid-access-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Authentication failed');
    expect(consoleSpy).toHaveBeenCalledWith('Error validating admin auth:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});