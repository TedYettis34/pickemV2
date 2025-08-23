/**
 * User authentication utilities for picks functionality
 * This module provides functions to get the current user context
 * and handle authentication for the picks system
 */

// JWT payload interface for Cognito tokens
interface JWTPayload {
  sub?: string;
  username?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  exp?: number;
  iat?: number;
}

// JWT decode utility (simple base64 decode for payload)
function decodeJWT(token: string): JWTPayload | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload);
    return JSON.parse(decoded) as JWTPayload;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

// Simple user context type for picks functionality
export interface UserContext {
  userId: string;
  email: string;
  name: string;
  accessToken: string;
}

// Mock user context for development/testing
// In production, this would come from the actual authentication system
const mockUserContext: UserContext = {
  userId: 'mock-user-123',
  email: 'user@example.com',
  name: 'Test User',
  accessToken: 'mock-jwt-token',
};

/**
 * Get the current user context
 * Integrates with the Cognito authentication system
 */
export function getCurrentUserContext(): UserContext | null {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return null;
  }
  
  // For development, return mock user context  
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return mockUserContext;
  }
  
  // In production, check for valid authentication tokens
  const accessToken = localStorage.getItem('accessToken');
  const idToken = localStorage.getItem('idToken');
  
  if (!accessToken) {
    return null;
  }
  
  // Try to decode the ID token for user information (more reliable than access token)
  let userInfo: JWTPayload | null = null;
  if (idToken) {
    userInfo = decodeJWT(idToken);
  }
  
  // Fallback to access token if ID token is not available
  if (!userInfo && accessToken) {
    userInfo = decodeJWT(accessToken);
  }
  
  // Return user context with decoded information or fallbacks
  return {
    userId: userInfo?.sub || userInfo?.username || userInfo?.cognito_username || 'authenticated-user',
    email: userInfo?.email || userInfo?.username || 'user@authenticated.com',  
    name: userInfo?.name || userInfo?.given_name || userInfo?.family_name || userInfo?.username || 'Authenticated User',
    accessToken: accessToken,
  };
}

/**
 * Get authentication headers for API requests
 */
export function getAuthHeaders(): Record<string, string> {
  const userContext = getCurrentUserContext();
  
  if (!userContext) {
    return {};
  }
  
  return {
    'Authorization': `Bearer ${userContext.accessToken}`,
    'x-user-id': userContext.userId,
  };
}

/**
 * Check if user is authenticated
 */
export function isUserAuthenticated(): boolean {
  return getCurrentUserContext() !== null;
}

/**
 * Get current user ID
 */
export function getCurrentUserId(): string | null {
  const userContext = getCurrentUserContext();
  return userContext?.userId || null;
}