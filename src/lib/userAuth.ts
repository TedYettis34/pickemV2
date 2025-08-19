/**
 * User authentication utilities for picks functionality
 * This module provides functions to get the current user context
 * and handle authentication for the picks system
 */

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
 * For now, this returns a mock user context
 * In production, this would integrate with the actual auth system
 */
export function getCurrentUserContext(): UserContext | null {
  // TODO: Integrate with actual authentication system
  // This should check for valid JWT token, decode it, and return user info
  
  // For development, return mock user context
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return mockUserContext;
  }
  
  // In production, this would check for a valid session/token
  return null;
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