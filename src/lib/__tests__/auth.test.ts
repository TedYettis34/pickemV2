import { signUp, signIn, confirmSignUp, resendConfirmationCode, signOut, isAuthenticated } from '../auth'
import { mockSend } from '@aws-sdk/client-cognito-identity-provider'

// Mock the entire module
jest.mock('@aws-sdk/client-cognito-identity-provider')

// Get the mocked localStorage functions
const mockLocalStorage = localStorage as jest.Mocked<typeof localStorage>

describe('Auth Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
      mockSend.mockResolvedValueOnce(mockResponse)

      const result = await signUp('test@example.com', 'TempPass123!', 'Test User')

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            ClientId: 'test-client-id',
            Username: 'test@example.com',
            Password: 'TempPass123!',
            UserAttributes: [
              { Name: 'email', Value: 'test@example.com' },
              { Name: 'name', Value: 'Test User' }
            ]
          }
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle signup errors', async () => {
      const mockError = new Error('UsernameExistsException')
      mockSend.mockRejectedValueOnce(mockError)

      await expect(signUp('test@example.com', 'TempPass123!', 'Test User'))
        .rejects.toThrow('UsernameExistsException')
    })
  })

  describe('confirmSignUp', () => {
    it('should successfully confirm signup', async () => {
      const mockResponse = {}
      mockSend.mockResolvedValueOnce(mockResponse)

      const result = await confirmSignUp('test@example.com', '123456')

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            ClientId: 'test-client-id',
            Username: 'test@example.com',
            ConfirmationCode: '123456'
          }
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle confirmation errors', async () => {
      const mockError = new Error('CodeMismatchException')
      mockSend.mockRejectedValueOnce(mockError)

      await expect(confirmSignUp('test@example.com', '123456'))
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
      mockSend.mockResolvedValueOnce(mockResponse)

      const result = await signIn('test@example.com', 'TempPass123!')

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            ClientId: 'test-client-id',
            AuthFlow: 'USER_PASSWORD_AUTH',
            AuthParameters: {
              USERNAME: 'test@example.com',
              PASSWORD: 'TempPass123!'
            }
          }
        })
      )

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('accessToken', 'access-token')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('idToken', 'id-token')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token')
      expect(result).toEqual(mockResponse)
    })

    it('should handle signin errors', async () => {
      const mockError = new Error('NotAuthorizedException')
      mockSend.mockRejectedValueOnce(mockError)

      await expect(signIn('test@example.com', 'wrongpassword'))
        .rejects.toThrow('NotAuthorizedException')
    })

    it('should handle response without tokens', async () => {
      const mockResponse = { AuthenticationResult: {} }
      mockSend.mockResolvedValueOnce(mockResponse)

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
      mockSend.mockResolvedValueOnce(mockResponse)

      const result = await resendConfirmationCode('test@example.com')

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            ClientId: 'test-client-id',
            Username: 'test@example.com'
          }
        })
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('signOut', () => {
    it('should clear all tokens from localStorage', () => {
      localStorage.setItem('accessToken', 'test-access-token')
      localStorage.setItem('idToken', 'test-id-token')
      localStorage.setItem('refreshToken', 'test-refresh-token')

      signOut()

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('idToken')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken')
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