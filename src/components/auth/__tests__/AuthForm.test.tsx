import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthForm from '../AuthForm'

// Mock environment variables
process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID = 'test-client-id'

const mockOnAuthSuccess = jest.fn()

describe('AuthForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Login Mode', () => {
    it('should render login form by default with email-only', () => {
      render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />)

      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument() // No password in login mode
      expect(screen.getByRole('button', { name: 'Continue to Sign In' })).toBeInTheDocument()
      expect(screen.getByText("Don't have an account? Sign up")).toBeInTheDocument()
      expect(screen.getByText("You'll enter your password on the next page")).toBeInTheDocument()
    })

    it('should show loading state when submitting login form', async () => {
      const user = userEvent.setup()
      
      render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />)

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.click(screen.getByRole('button', { name: 'Continue to Sign In' }))

      // In test environment, no navigation occurs but we should see the loading state  
      expect(screen.getByText('Redirecting to secure login...')).toBeInTheDocument()
    })

    it('should show validation error for missing email in login', async () => {
      const user = userEvent.setup()
      render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />)

      // Try to submit login form without email
      await user.click(screen.getByRole('button', { name: 'Continue to Sign In' }))

      // Wait for the error message to appear
      await waitFor(() => {
        expect(screen.getByText('Please enter your email')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Signup Mode', () => {
    it('should switch to signup mode', async () => {
      const user = userEvent.setup()
      render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />)

      await user.click(screen.getByText("Don't have an account? Sign up"))

      expect(screen.getByRole('button', { name: 'Continue to Sign Up' })).toBeInTheDocument()
      expect(screen.getByLabelText('Display Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Continue to Sign Up' })).toBeInTheDocument()
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

      const submitButton = screen.getByRole('button', { name: 'Continue to Sign Up' })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit when password is valid', async () => {
      const user = userEvent.setup()
      render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />)

      await user.click(screen.getByText("Don't have an account? Sign up"))
      await user.type(screen.getByLabelText('Display Name'), 'Test User')
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'ValidPass123!')

      const submitButton = screen.getByRole('button', { name: 'Continue to Sign Up' })
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

    it('should show loading state when submitting signup form', async () => {
      const user = userEvent.setup()
      
      render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />)

      await user.click(screen.getByText("Don't have an account? Sign up"))
      await user.type(screen.getByLabelText('Display Name'), 'Test User')
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'ValidPass123!')
      await user.click(screen.getByRole('button', { name: 'Continue to Sign Up' }))

      // In test environment, no navigation occurs but we should see the loading state
      expect(screen.getByText('Redirecting to sign up...')).toBeInTheDocument()
    })
  })

  // Note: Confirmation and error handling tests removed since OAuth flow handles these automatically
})