import '@testing-library/jest-dom'

// Firebase's client SDK checks for a global `fetch` at module load time to
// detect its runtime environment. jsdom's test environment doesn't always
// provide one, so polyfill a no-op stub (tests that need real network
// behavior mock fetch themselves).
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn()
}
if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {}
}
if (typeof global.Request === 'undefined') {
  global.Request = class Request {}
}
if (typeof global.Response === 'undefined') {
  global.Response = class Response {}
}

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
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-firebase-api-key'
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-project.firebaseapp.com'
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project'
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-project.firebasestorage.app'
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789'
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abcdef'

// Keep environment variable mocks only for now
// Specific module mocks will be handled in individual test files