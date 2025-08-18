import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../page';

// Mock the auth functions
jest.mock('../../lib/auth', () => ({
  isAuthenticated: jest.fn(),
  signOut: jest.fn(),
}));

// Mock the hooks
jest.mock('../../hooks/useAdminAuth', () => ({
  useAdminAuth: jest.fn(),
}));

// Mock the components
jest.mock('../../components/auth/AuthForm', () => {
  return function MockAuthForm({ onAuthSuccess }: { onAuthSuccess: () => void }) {
    return (
      <div data-testid="auth-form">
        <button onClick={() => onAuthSuccess()}>Login</button>
      </div>
    );
  };
});

jest.mock('../../components/admin/AdminDashboard', () => {
  return function MockAdminDashboard({ onBackToDashboard }: { onBackToDashboard?: () => void }) {
    return (
      <div data-testid="admin-dashboard">
        <button onClick={onBackToDashboard}>Back to Dashboard</button>
      </div>
    );
  };
});

jest.mock('../../components/user/UserDashboard', () => ({
  UserDashboard: function MockUserDashboard({ 
    onSignOut, 
    isAdmin, 
    onShowAdminPanel 
  }: { 
    onSignOut: () => void; 
    isAdmin: boolean; 
    onShowAdminPanel: () => void; 
  }) {
    return (
      <div data-testid="user-dashboard">
        <h1>PickEm Dashboard</h1>
        <div>Welcome to your dashboard!</div>
        <div>Your pick&apos;em features will be built here.</div>
        {isAdmin && (
          <button onClick={onShowAdminPanel}>Admin Panel</button>
        )}
        <button onClick={onSignOut}>Sign Out</button>
      </div>
    );
  },
}));

import { isAuthenticated, signOut } from '../../lib/auth';
import { useAdminAuth } from '../../hooks/useAdminAuth';

const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockUseAdminAuth = useAdminAuth as jest.MockedFunction<typeof useAdminAuth>;

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    mockIsAuthenticated.mockReturnValue(false);
    mockUseAdminAuth.mockReturnValue({
      isAdmin: false,
      isLoading: true,
    });

    render(<Home />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render auth form when not authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(false);
    mockUseAdminAuth.mockReturnValue({
      isAdmin: false,
      isLoading: false,
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-form')).toBeInTheDocument();
    });
  });

  it('should render main dashboard when authenticated but not admin', async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockUseAdminAuth.mockReturnValue({
      isAdmin: false,
      isLoading: false,
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Welcome to your dashboard!')).toBeInTheDocument();
      expect(screen.getByText("Your pick&apos;em features will be built here.")).toBeInTheDocument();
    });
  });

  it('should show admin dashboard button when user is admin', async () => {
    mockIsAuthenticated.mockReturnValue(true);
    mockUseAdminAuth.mockReturnValue({
      isAdmin: true,
      isLoading: false,
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Admin Panel' })).toBeInTheDocument();
    });
  });

  it('should switch to admin dashboard when admin button clicked', async () => {
    const user = userEvent.setup();
    mockIsAuthenticated.mockReturnValue(true);
    mockUseAdminAuth.mockReturnValue({
      isAdmin: true,
      isLoading: false,
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Admin Panel' })).toBeInTheDocument();
    });

    const adminButton = screen.getByRole('button', { name: 'Admin Panel' });
    await user.click(adminButton);

    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
  });

  it('should go back to main dashboard from admin dashboard', async () => {
    const user = userEvent.setup();
    mockIsAuthenticated.mockReturnValue(true);
    mockUseAdminAuth.mockReturnValue({
      isAdmin: true,
      isLoading: false,
    });

    render(<Home />);

    // Go to admin dashboard
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Admin Panel' })).toBeInTheDocument();
    });

    const adminButton = screen.getByRole('button', { name: 'Admin Panel' });
    await user.click(adminButton);

    // Go back to main dashboard
    const backButton = screen.getByRole('button', { name: 'Back to Dashboard' });
    await user.click(backButton);

    expect(screen.getByText('Welcome to your dashboard!')).toBeInTheDocument();
  });

  it('should handle authentication success', async () => {
    const user = userEvent.setup();
    mockIsAuthenticated.mockReturnValue(false);
    mockUseAdminAuth.mockReturnValue({
      isAdmin: false,
      isLoading: false,
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-form')).toBeInTheDocument();
    });

    const loginButton = screen.getByRole('button', { name: 'Login' });
    await user.click(loginButton);

    // Should show main dashboard after successful auth
    await waitFor(() => {
      expect(screen.getByText('Welcome to your dashboard!')).toBeInTheDocument();
    });
  });

  it('should handle sign out', async () => {
    const user = userEvent.setup();
    mockIsAuthenticated.mockReturnValue(true);
    mockUseAdminAuth.mockReturnValue({
      isAdmin: false,
      isLoading: false,
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
    });

    const signOutButton = screen.getByRole('button', { name: 'Sign Out' });
    await user.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    
    // Should show auth form after sign out
    await waitFor(() => {
      expect(screen.getByTestId('auth-form')).toBeInTheDocument();
    });
  });
});