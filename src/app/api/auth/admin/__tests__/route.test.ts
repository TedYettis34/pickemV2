/**
 * @jest-environment node
 */

// Mock AWS SDK before imports
jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  GetUserCommand: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { CognitoIdentityProviderClient, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const mockSend = jest.fn();

// Mock the CognitoIdentityProviderClient
(CognitoIdentityProviderClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

describe('/api/auth/admin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return admin status when user is in admin group', async () => {
    mockSend.mockResolvedValue({
      Username: 'test-user',
      UserAttributes: [
        { Name: 'email', Value: 'admin@example.com' },
        { Name: 'cognito:groups', Value: 'admin' },
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
    expect(mockSend).toHaveBeenCalledWith(expect.any(GetUserCommand));
  });

  it('should return false when user is not in admin group', async () => {
    mockSend.mockResolvedValue({
      Username: 'test-user',
      UserAttributes: [
        { Name: 'email', Value: 'user@example.com' },
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
  });

  it('should return 401 when no authorization header', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/admin');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('No authorization header');
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
    expect(data.error).toBe('Invalid authorization header');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should return 401 when Cognito returns error', async () => {
    mockSend.mockRejectedValue(new Error('Invalid token'));

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: 'Bearer invalid-access-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should handle user with multiple groups including admin', async () => {
    mockSend.mockResolvedValue({
      Username: 'test-user',
      UserAttributes: [
        { Name: 'email', Value: 'admin@example.com' },
        { Name: 'cognito:groups', Value: 'users,admin,moderators' },
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
  });

  it('should handle user with groups but not admin', async () => {
    mockSend.mockResolvedValue({
      Username: 'test-user',
      UserAttributes: [
        { Name: 'email', Value: 'user@example.com' },
        { Name: 'cognito:groups', Value: 'users,moderators' },
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

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(consoleSpy).toHaveBeenCalledWith('Error checking admin status:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});