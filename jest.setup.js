import '@testing-library/jest-dom'

// Mock localStorage only in jsdom environment
if (typeof window !== 'undefined') {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })
  global.localStorage = localStorageMock
}

// Mock environment variables for tests
process.env.NEXT_PUBLIC_AWS_REGION = 'us-east-1'
process.env.NEXT_PUBLIC_USER_POOL_ID = 'us-east-1_pGEqzqfTn'
process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID = 'test-client-id'
process.env.NODE_ENV = 'test'
process.env.AWS_REGION = 'us-east-1'
process.env.AWS_ACCESS_KEY_ID = 'test-access-key'
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key'
process.env.DB_CREDENTIALS_SECRET_ARN = 'test-secret-arn'

// Keep environment variable mocks only for now
// Specific module mocks will be handled in individual test files