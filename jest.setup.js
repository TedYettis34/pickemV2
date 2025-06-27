import '@testing-library/jest-dom'

// Mock localStorage
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

// Mock environment variables for tests
process.env.NEXT_PUBLIC_AWS_REGION = 'us-east-1'
process.env.NEXT_PUBLIC_USER_POOL_ID = 'us-east-1_pGEqzqfTn'
process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID = 'test-client-id'