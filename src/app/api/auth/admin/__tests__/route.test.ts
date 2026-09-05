/**
 * @jest-environment node
 */

jest.mock('../../../../../lib/adminAuth.server', () => ({
  validateAdminAuth: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { validateAdminAuth } from '../../../../../lib/adminAuth.server';

const mockValidateAdminAuth = validateAdminAuth as jest.MockedFunction<typeof validateAdminAuth>;

describe('/api/auth/admin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return admin status and user when validation succeeds', async () => {
    mockValidateAdminAuth.mockResolvedValue({
      isValid: true,
      user: {
        uid: 'user-123',
        email: 'admin@example.com',
        name: 'Admin User',
        isAdmin: true,
      },
    });

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: { Authorization: 'Bearer valid-id-token' },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isAdmin).toBe(true);
    expect(data.user).toEqual({
      uid: 'user-123',
      email: 'admin@example.com',
      name: 'Admin User',
      isAdmin: true,
    });
  });

  it('should return 401 when the user is not an admin', async () => {
    mockValidateAdminAuth.mockResolvedValue({
      isValid: false,
      error: 'Admin access required',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: { Authorization: 'Bearer valid-id-token' },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Admin access required');
  });

  it('should return 401 when no authorization header is present', async () => {
    mockValidateAdminAuth.mockResolvedValue({
      isValid: false,
      error: 'Authorization header required',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/admin');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authorization header required');
  });

  it('should return 401 when the token is expired', async () => {
    mockValidateAdminAuth.mockResolvedValue({
      isValid: false,
      error: 'Token expired',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: { Authorization: 'Bearer expired-token' },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Token expired');
  });

  it('should return 401 with a generic error when validation throws', async () => {
    mockValidateAdminAuth.mockResolvedValue({
      isValid: false,
      error: 'Invalid access token',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/admin', {
      headers: { Authorization: 'Bearer garbage-token' },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid access token');
  });
});
