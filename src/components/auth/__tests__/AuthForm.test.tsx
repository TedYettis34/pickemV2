import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthForm from '../AuthForm'
import { signUp, signIn, confirmSignUp, resendConfirmationCode } from '../../../lib/auth'

// Mock the auth functions
jest.mock('../../../lib/auth')

const mockSignUp = signUp as jest.MockedFunction<typeof signUp>
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>
const mockConfirmSignUp = confirmSignUp as jest.MockedFunction<typeof confirmSignUp>
const mockResendConfirmationCode = resendConfirmationCode as jest.MockedFunction<typeof resendConfirmationCode>

describe('AuthForm', () => {
  const mockOnAuthSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Login Mode', () => {
    it('should render login form by default', () => {
      render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />)

      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
      expect(screen.getByText("Don't have an account? Sign up")).toBeInTheDocument()
    })

    it('should successfully sign in', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValueOnce({} as unknown)

      render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />)

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'TempPass123!')
      await user.click(screen.getByRole('button', { name: 'Sign In' }))

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'TempPass123!')
        expect(mockOnAuthSuccess).toHaveBeenCalled()
      })
    })

    it('should display error on sign in failure', async () => {
      const user = userEvent.setup()
      mockSignIn.mockRejectedValueOnce(new Error('Invalid credentials'))

      render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />)

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: 'Sign In' }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })
  })

  describe('Signup Mode', () => {
    it('should switch to signup mode', async () => {
      const user = userEvent.setup()
      render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />)

      await user.click(screen.getByText("Don't have an account? Sign up"))

      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
      expect(screen.getByLabelText('Display Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
      expect(screen.getByText('Already have an account? Sign in')).toBeInTheDocument()
    })

    it('should show password validation during signup', async () => {
      const user = userEvent.setup()
      render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />)

      await user.click(screen.getByText("Don't have an account? Sign up"))
      await user.type(screen.getByLabelText('Password'), 'weak')

      expect(screen.getByText('Password requirements:')).toBeInTheDocument()
      expect(screen.getByText('At least 8 characters')).toBeInTheDocument()
      expect(screen.getByText('Contains lowercase letter')).toBeInTheDocument()
      expect(screen.getByText('Contains uppercase letter')).toBeInTheDocument()
      expect(screen.getByText('Contains number')).toBeInTheDocument()
      expect(screen.getByText('Contains symbol')).toBeInTheDocument()
    })

    it('should validate password requirements and disable submit', async () => {
      const user = userEvent.setup()
      render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />)

      await user.click(screen.getByText("Don't have an account? Sign up"))
      await user.type(screen.getByLabelText('Display Name'), 'Test User')
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'weak')

      const submitButton = screen.getByRole('button', { name: 'Create Account' })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit when password is valid', async () => {
      const user = userEvent.setup()
      render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />)

      await user.click(screen.getByText("Don't have an account? Sign up"))
      await user.type(screen.getByLabelText('Display Name'), 'Test User')
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'ValidPass123!')

      const submitButton = screen.getByRole('button', { name: 'Create Account' })
      expect(submitButton).not.toBeDisabled()
    })

    it('should enforce 20 character limit on display name', async () => {
      const user = userEvent.setup()
      render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />)

      await user.click(screen.getByText("Don't have an account? Sign up"))
      const nameInput = screen.getByLabelText('Display Name')
      
      await user.type(nameInput, 'This is a very long name that exceeds twenty characters')

      expect(nameInput).toHaveValue('This is a very long ')
      expect(screen.getByText('20/20 characters')).toBeInTheDocument()
    })

    it('should successfully sign up and show confirmation mode', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValueOnce({} as unknown)

      render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />)

      await user.click(screen.getByText("Don't have an account? Sign up"))
      await user.type(screen.getByLabelText('Display Name'), 'Test User')
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'ValidPass123!')
      await user.click(screen.getByRole('button', { name: 'Create Account' }))

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'ValidPass123!', 'Test User')
        expect(screen.getByText('Confirm Your Account')).toBeInTheDocument()
      })
    })
  })

  describe('Confirmation Mode', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValueOnce({} as unknown)

      render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />)

      await user.click(screen.getByText("Don't have an account? Sign up"))
      await user.type(screen.getByLabelText('Display Name'), 'Test User')
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'ValidPass123!')
      await user.click(screen.getByRole('button', { name: 'Create Account' }))

      await waitFor(() => {
        expect(screen.getByText('Confirm Your Account')).toBeInTheDocument()
      })
    })

    it('should render confirmation form', () => {
      expect(screen.getByText('Confirm Your Account')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirmation Code')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Confirm Account' })).toBeInTheDocument()
      expect(screen.getByText('Resend confirmation code')).toBeInTheDocument()
    })

    it('should successfully confirm account', async () => {
      const user = userEvent.setup()
      mockConfirmSignUp.mockResolvedValueOnce({} as unknown)

      await user.type(screen.getByLabelText('Confirmation Code'), '123456')
      await user.click(screen.getByRole('button', { name: 'Confirm Account' }))

      await waitFor(() => {
        expect(mockConfirmSignUp).toHaveBeenCalledWith('Test User', '123456')
        expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
        expect(screen.getByText('Account confirmed! Please log in.')).toBeInTheDocument()
      })
    })

    it('should resend confirmation code', async () => {
      const user = userEvent.setup()
      mockResendConfirmationCode.mockResolvedValueOnce({} as unknown)

      await user.click(screen.getByText('Resend confirmation code'))

      await waitFor(() => {
        expect(mockResendConfirmationCode).toHaveBeenCalledWith('Test User')
        expect(screen.getByText('Confirmation code resent!')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should clear error when switching modes', async () => {
      const user = userEvent.setup()
      mockSignIn.mockRejectedValueOnce(new Error('Test error'))

      render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />)

      // Trigger an error in login mode
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: 'Sign In' }))

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument()
      })

      // Switch to signup mode
      await user.click(screen.getByText("Don't have an account? Sign up"))

      // Error should be cleared
      expect(screen.queryByText('Test error')).not.toBeInTheDocument()
    })
  })
})