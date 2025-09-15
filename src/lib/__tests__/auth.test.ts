// Mock environment variables first
process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID = 'test-client-id'
process.env.NEXT_PUBLIC_AWS_REGION = 'us-east-1'

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

jest.mock('@aws-sdk/client-cognito-identity-provider', () => {
  // Create send mock inside the factory to avoid hoisting issues
  const sendMock = jest.fn()
  const mockCognitoClient = {
    send: sendMock,
  }
  
  // Store reference to the send mock in a global so we can access it in tests
  global.__mockSend = sendMock
  
  return {
    CognitoIdentityProviderClient: jest.fn(() => mockCognitoClient),
    SignUpCommand: jest.fn(),
    ConfirmSignUpCommand: jest.fn(),  
    InitiateAuthCommand: jest.fn(),
    ResendConfirmationCodeCommand: jest.fn(),
    AuthFlowType: {
      USER_PASSWORD_AUTH: 'USER_PASSWORD_AUTH',
      REFRESH_TOKEN_AUTH: 'REFRESH_TOKEN_AUTH',
    },
  }
})

import {
  buildOAuthSignInUrl,
  buildOAuthSignUpUrl,
  logout,
  isAuthenticated,
} from '../auth'

// Cognito commands are mocked in the module mock above

// Mock fetch globally
global.fetch = jest.fn()

// Location mocking would be used for navigation tests
describe('OAuth Auth Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockClear()
  })

  describe('buildOAuthSignInUrl', () => {
    it('should build OAuth sign-in URL without email hint', () => {
      const result = buildOAuthSignInUrl()

      expect(result).toContain('https://pickem-dev-auth.auth.us-east-1.amazoncognito.com/oauth2/authorize')
      expect(result).toContain('response_type=code')
      expect(result).toContain('client_id=test-client-id')
      expect(result).toContain('scope=email+openid+profile')
      expect(result).toContain('redirect_uri=http%3A%2F%2Flocalhost%2Fauth%2Fcallback')
    })

    it('should build OAuth sign-in URL with email hint', () => {
      const result = buildOAuthSignInUrl('test@example.com')

      expect(result).toContain('login_hint=test%40example.com')
    })
  })

  describe('buildOAuthSignUpUrl', () => {
    it('should build OAuth sign-up URL with signup parameter', () => {
      const result = buildOAuthSignUpUrl('test@example.com')

      expect(result).toContain('https://pickem-dev-auth.auth.us-east-1.amazoncognito.com/oauth2/authorize')
      expect(result).toContain('signup=true')
      expect(result).toContain('login_hint=test%40example.com')
    })
  })

  describe('logout', () => {
    it('should clear all tokens from localStorage', () => {
      // Mock would prevent actual navigation in tests
      
      logout()

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('idToken')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('lastLoginTime')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('loginMethod')
    })
  })

  describe('isAuthenticated', () => {
    it('should return true when access token exists', () => {
      mockLocalStorage.getItem.mockReturnValue('test-access-token')

      const result = isAuthenticated()

      expect(localStorage.getItem).toHaveBeenCalledWith('accessToken')
      expect(result).toBe(true)
    })

    it('should return false when access token does not exist', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const result = isAuthenticated()

      expect(localStorage.getItem).toHaveBeenCalledWith('accessToken')
      expect(result).toBe(false)
    })

    it('should return false in server environment', () => {
      // Mock window being undefined (server environment)
      const originalWindow = global.window
      delete (global as unknown as { window?: unknown }).window

      const result = isAuthenticated()

      expect(result).toBe(false)

      // Restore window
      global.window = originalWindow
    })
  })
})
