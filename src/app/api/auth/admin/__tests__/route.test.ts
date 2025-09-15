/**
 * @jest-environment node
 */

// Mock Buffer for JWT decoding in Node environment
global.Buffer = Buffer;

import { NextRequest } from 'next/server';
import { GET } from '../route';

// Helper to create a JWT token for testing
interface JWTPayload {
  sub?: string;
  'cognito:groups'?: string[];
  'cognito:username'?: string;
  email?: string;
  name?: string;
  exp?: number;
  [key: string]: unknown;
}

function createJWTToken(payload: JWTPayload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const signature = 'mock-signature';
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

describe('/api/auth/admin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console to avoid test output pollution
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return admin status when user is in admin group', async () => {
    // Create JWT token with admin group
    const jwtPayload = {
      sub: 'user-123',
      'cognito:groups': ['admin', 'users'],
      'cognito:username': 'test-user',
      email: 'admin@example.com',
      name: 'Admin User',
      exp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
    };
    const jwtToken = createJWTToken(jwtPayload);

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
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
  });

  it('should return false when user is not in admin group', async () => {
    // Create JWT token without admin group
    const jwtPayload = {
      sub: 'user-456',
      'cognito:groups': ['users'],
      'cognito:username': 'test-user',
      email: 'user@example.com',
      name: 'Regular User',
      exp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
    };
    const jwtToken = createJWTToken(jwtPayload);

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
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
    expect(data.error).toBe('Authorization header must start with Bearer');
  });

  it('should return 401 when JWT token is malformed', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: 'Bearer invalid-jwt-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid token format');
  });

  it('should handle user with multiple groups including admin', async () => {
    // Create JWT token with multiple groups including admin
    const jwtPayload = {
      sub: 'user-789',
      'cognito:groups': ['users', 'admin', 'moderators'],
      'cognito:username': 'test-user',
      email: 'admin@example.com',
      name: 'Admin User',
      exp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
    };
    const jwtToken = createJWTToken(jwtPayload);

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isAdmin).toBe(true);
    expect(data.user.groups).toEqual(['users', 'admin', 'moderators']);
  });

  it('should handle user with groups but not admin', async () => {
    // Create JWT token with groups but no admin
    const jwtPayload = {
      sub: 'user-101',
      'cognito:groups': ['users', 'moderators'],
      'cognito:username': 'test-user',
      email: 'user@example.com',
      name: 'Regular User',
      exp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
    };
    const jwtToken = createJWTToken(jwtPayload);

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isAdmin).toBe(false);
    expect(data.user.groups).toEqual(['users', 'moderators']);
  });

  it('should handle JWT token without required fields', async () => {
    // Create JWT token missing required fields
    const jwtPayload = {
      // Missing cognito:username, email, name, groups, sub
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const jwtToken = createJWTToken(jwtPayload);

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid user token');
  });

  it('should handle user with no groups', async () => {
    // Create JWT token with user but no groups
    const jwtPayload = {
      sub: 'user-nogroups',
      'cognito:username': 'test-user',
      email: 'user@example.com',
      name: 'User With No Groups',
      exp: Math.floor(Date.now() / 1000) + 3600,
      // No cognito:groups field
    };
    const jwtToken = createJWTToken(jwtPayload);

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isAdmin).toBe(false);
    expect(data.user).toEqual({
      username: 'test-user',
      email: 'user@example.com',
      name: 'User With No Groups',
      groups: [],
    });
  });
});