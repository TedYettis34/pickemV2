import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthForm from '../AuthForm';

jest.mock('../../../lib/firebase/auth', () => ({
  signIn: jest.fn(),
  signUp: jest.fn(),
  signInWithGoogle: jest.fn(),
}));

import { signIn, signUp, signInWithGoogle } from '../../../lib/firebase/auth';

const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockSignUp = signUp as jest.MockedFunction<typeof signUp>;
const mockSignInWithGoogle = signInWithGoogle as jest.MockedFunction<typeof signInWithGoogle>;

describe('AuthForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the sign-in form by default', () => {
    render(<AuthForm />);

    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
  });

  it('should show a validation error for missing email', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Please enter your email')).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('should show a validation error for missing password', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Please enter your password')).toBeInTheDocument();
  });

  it('should call signIn and onSuccess on successful login', async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    mockSignIn.mockResolvedValue({ success: true });

    render(<AuthForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('should show an error message when sign in fails', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ success: false, error: 'Invalid email or password.' });

    render(<AuthForm />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
  });

  it('should switch to sign-up mode and enforce password requirements', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(screen.getByText("Don't have an account? Sign up"));

    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();

    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'weak');
    expect(submitButton).toBeDisabled();

    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'StrongPass1!');
    expect(submitButton).not.toBeDisabled();
  });

  it('should call signUp on successful account creation', async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    mockSignUp.mockResolvedValue({ success: true });

    render(<AuthForm onSuccess={onSuccess} />);

    await user.click(screen.getByText("Don't have an account? Sign up"));
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'StrongPass1!');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'StrongPass1!');
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('should call signInWithGoogle when the Google button is clicked', async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    mockSignInWithGoogle.mockResolvedValue({ success: true });

    render(<AuthForm onSuccess={onSuccess} />);

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
