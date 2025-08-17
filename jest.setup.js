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

// Mock AWS SDK modules that might be imported
jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      SecretString: JSON.stringify({
        username: 'testuser',
        password: 'testpass',
        engine: 'postgres',
        host: 'localhost',
        port: 5432,
        dbname: 'testdb'
      })
    })
  })),
  GetSecretValueCommand: jest.fn()
}))

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn()
    }),
    end: jest.fn()
  }))
}))