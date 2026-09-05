import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../page';

type AuthChangeCallback = (user: { uid: string } | null) => void;

let authChangeCallback: AuthChangeCallback | null = null;
const mockUnsubscribe = jest.fn();

jest.mock('../../lib/firebase/auth', () => ({
  subscribeToAuthChanges: jest.fn((callback: AuthChangeCallback) => {
    authChangeCallback = callback;
    return mockUnsubscribe;
  }),
}));

jest.mock('../../lib/auth', () => ({
  logout: jest.fn().mockResolvedValue(undefined),
}));

// Mock the hooks
jest.mock('../../hooks/useAdminAuth', () => ({
  useAdminAuth: jest.fn(),
}));

// Mock the components
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
    onShowAdminPanel,
    isAuthenticated
  }: {
    onSignOut: () => void;
    isAdmin: boolean;
    onShowAdminPanel: () => void;
    isAuthenticated: boolean;
  }) {
    return (
      <div data-testid="user-dashboard">
        <h1>PickEm Dashboard</h1>
        <div>Welcome to your dashboard!</div>
        <div>Your pick&apos;em features will be built here.</div>
        {isAdmin && isAuthenticated && (
          <button onClick={onShowAdminPanel}>Admin Panel</button>
        )}
        {isAuthenticated ? (
          <button onClick={onSignOut}>Sign Out</button>
        ) : (
          <button>Login</button>
        )}
      </div>
    );
  },
}));

import { logout } from '../../lib/auth';
import { useAdminAuth } from '../../hooks/useAdminAuth';

const mockLogout = logout as jest.MockedFunction<typeof logout>;
const mockUseAdminAuth = useAdminAuth as jest.MockedFunction<typeof useAdminAuth>;

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authChangeCallback = null;
  });

  it('should render loading state initially', () => {
    mockUseAdminAuth.mockReturnValue({
      isAdmin: false,
      isLoading: true,
      accessToken: null,
      authError: null,
      recheckAuth: jest.fn(),
    });

    render(<Home />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render dashboard when not authenticated', async () => {
    mockUseAdminAuth.mockReturnValue({
      isAdmin: false,
      isLoading: false,
      accessToken: null,
      authError: null,
      recheckAuth: jest.fn(),
    });

    render(<Home />);
    authChangeCallback!(null);

    await waitFor(() => {
      expect(screen.getByTestId('user-dashboard')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });
  });

  it('should render main dashboard when authenticated but not admin', async () => {
    mockUseAdminAuth.mockReturnValue({
      isAdmin: false,
      isLoading: false,
      accessToken: 'test-token',
      authError: null,
      recheckAuth: jest.fn(),
    });

    render(<Home />);
    authChangeCallback!({ uid: 'user-123' });

    await waitFor(() => {
      expect(screen.getByText('PickEm Dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('user-dashboard')).toBeInTheDocument();
    });
  });

  it('should show admin dashboard button when user is admin', async () => {
    mockUseAdminAuth.mockReturnValue({
      isAdmin: true,
      isLoading: false,
      accessToken: 'test-token',
      authError: null,
      recheckAuth: jest.fn(),
    });

    render(<Home />);
    authChangeCallback!({ uid: 'admin-123' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Admin Panel' })).toBeInTheDocument();
    });
  });

  it('should switch to admin dashboard when admin button clicked', async () => {
    const user = userEvent.setup();
    mockUseAdminAuth.mockReturnValue({
      isAdmin: true,
      isLoading: false,
      accessToken: 'test-token',
      authError: null,
      recheckAuth: jest.fn(),
    });

    render(<Home />);
    authChangeCallback!({ uid: 'admin-123' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Admin Panel' })).toBeInTheDocument();
    });

    const adminButton = screen.getByRole('button', { name: 'Admin Panel' });
    await user.click(adminButton);

    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
  });

  it('should go back to main dashboard from admin dashboard', async () => {
    const user = userEvent.setup();
    mockUseAdminAuth.mockReturnValue({
      isAdmin: true,
      isLoading: false,
      accessToken: 'test-token',
      authError: null,
      recheckAuth: jest.fn(),
    });

    render(<Home />);
    authChangeCallback!({ uid: 'admin-123' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Admin Panel' })).toBeInTheDocument();
    });

    const adminButton = screen.getByRole('button', { name: 'Admin Panel' });
    await user.click(adminButton);

    const backButton = screen.getByRole('button', { name: 'Back to Dashboard' });
    await user.click(backButton);

    expect(screen.getByText('Welcome to your dashboard!')).toBeInTheDocument();
  });

  it('should handle sign out', async () => {
    const user = userEvent.setup();
    mockUseAdminAuth.mockReturnValue({
      isAdmin: false,
      isLoading: false,
      accessToken: 'test-token',
      authError: null,
      recheckAuth: jest.fn(),
    });

    render(<Home />);
    authChangeCallback!({ uid: 'user-123' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
    });

    const signOutButton = screen.getByRole('button', { name: 'Sign Out' });
    await user.click(signOutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByTestId('user-dashboard')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });
  });
});
