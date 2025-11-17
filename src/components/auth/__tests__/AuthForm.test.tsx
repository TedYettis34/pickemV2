import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthForm from '../AuthForm'

// Mock environment variables
process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID = 'test-client-id'

describe('AuthForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Login Mode', () => {
    it('should render login form by default with email-only', () => {
      render(<AuthForm />)

      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument() // No password in login mode
      expect(screen.getByRole('button', { name: 'Continue to Sign In' })).toBeInTheDocument()
      expect(screen.getByText("You'll enter your password on the next page")).toBeInTheDocument()
    })

    it('should show loading state when submitting login form', async () => {
      const user = userEvent.setup()

      render(<AuthForm />)

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.click(screen.getByRole('button', { name: 'Continue to Sign In' }))

      // In test environment, no navigation occurs but we should see the loading state
      expect(screen.getByText('Redirecting to secure login...')).toBeInTheDocument()
    })

    it('should show validation error for missing email in login', async () => {
      const user = userEvent.setup()
      render(<AuthForm />)

      // Try to submit login form without email
      await user.click(screen.getByRole('button', { name: 'Continue to Sign In' }))

      // Wait for the error message to appear
      await waitFor(() => {
        expect(screen.getByText('Please enter your email')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })


  // Note: Confirmation and error handling tests removed since OAuth flow handles these automatically
})