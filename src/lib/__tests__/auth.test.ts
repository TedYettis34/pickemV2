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
  signUp,
  confirmSignUp,
  signIn,
  resendConfirmationCode,
  signOut,
  isAuthenticated,
} from '../auth'

import { SignUpCommand, ConfirmSignUpCommand, InitiateAuthCommand, ResendConfirmationCodeCommand } from '@aws-sdk/client-cognito-identity-provider'

describe('Auth Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    if (global.__mockSend) {
      global.__mockSend.mockClear()
    }
  })

  describe('signUp', () => {
    it('should successfully sign up a user', async () => {
      const mockResponse = {
        UserSub: 'test-user-id',
        CodeDeliveryDetails: {
          Destination: 'test@example.com',
          DeliveryMedium: 'EMAIL'
        }
      }
      global.__mockSend.mockResolvedValueOnce(mockResponse)

      const result = await signUp('test@example.com', 'TempPass123!', 'Test User')

      expect(global.__mockSend).toHaveBeenCalledWith(
        expect.any(SignUpCommand)
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle signup errors', async () => {
      const mockError = new Error('UsernameExistsException')
      global.__mockSend.mockRejectedValueOnce(mockError)

      await expect(signUp('test@example.com', 'TempPass123!', 'Test User'))
        .rejects.toThrow('UsernameExistsException')
    })
  })

  describe('confirmSignUp', () => {
    it('should successfully confirm signup', async () => {
      const mockResponse = {}
      global.__mockSend.mockResolvedValueOnce(mockResponse)

      const result = await confirmSignUp('Test User', '123456')

      expect(global.__mockSend).toHaveBeenCalledWith(
        expect.any(ConfirmSignUpCommand)
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle confirmation errors', async () => {
      const mockError = new Error('CodeMismatchException')
      global.__mockSend.mockRejectedValueOnce(mockError)

      await expect(confirmSignUp('Test User', '123456'))
        .rejects.toThrow('CodeMismatchException')
    })
  })

  describe('signIn', () => {
    it('should successfully sign in and store tokens', async () => {
      const mockResponse = {
        AuthenticationResult: {
          AccessToken: 'access-token',
          IdToken: 'id-token',
          RefreshToken: 'refresh-token'
        }
      }
      global.__mockSend.mockResolvedValueOnce(mockResponse)

      const result = await signIn('test@example.com', 'TempPass123!')

      expect(global.__mockSend).toHaveBeenCalledWith(
        expect.any(InitiateAuthCommand)
      )

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('accessToken', 'access-token')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('idToken', 'id-token')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('lastLoginTime', expect.any(String))
      expect(result).toEqual(mockResponse)
    })

    it('should handle signin errors', async () => {
      const mockError = new Error('NotAuthorizedException')
      global.__mockSend.mockRejectedValueOnce(mockError)

      await expect(signIn('test@example.com', 'wrongpassword'))
        .rejects.toThrow('NotAuthorizedException')
    })

    it('should handle response without tokens', async () => {
      const mockResponse = { AuthenticationResult: {} }
      global.__mockSend.mockResolvedValueOnce(mockResponse)

      const result = await signIn('test@example.com', 'TempPass123!')

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
    })
  })

  describe('resendConfirmationCode', () => {
    it('should successfully resend confirmation code', async () => {
      const mockResponse = {
        CodeDeliveryDetails: {
          Destination: 'test@example.com',
          DeliveryMedium: 'EMAIL'
        }
      }
      global.__mockSend.mockResolvedValueOnce(mockResponse)

      const result = await resendConfirmationCode('Test User')

      expect(global.__mockSend).toHaveBeenCalledWith(
        expect.any(ResendConfirmationCodeCommand)
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('signOut', () => {
    it('should clear all tokens from localStorage', () => {
      signOut()

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('idToken')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('lastLoginTime')
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
