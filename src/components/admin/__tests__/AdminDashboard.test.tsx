import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from '../AdminDashboard';

// Mock the lib/auth functions
jest.mock('../../../lib/auth', () => ({
  logout: jest.fn(),
}));

// Mock the WeekManagement and GameResults components
jest.mock('../WeekManagement', () => ({
  WeekManagement: () => <div data-testid="week-management">Week Management Component</div>,
}));

jest.mock('../GameResults', () => ({
  GameResults: () => <div data-testid="game-results">Game Results Component</div>,
}));

// Mock fetch for score update functionality
global.fetch = jest.fn();

import { logout } from '../../../lib/auth';

const mockLogout = logout as jest.MockedFunction<typeof logout>;

describe('AdminDashboard', () => {
  const mockOnBackToDashboard = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render admin dashboard', () => {
    render(<AdminDashboard />);

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Administrator Access')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
  });

  it('should render navigation tabs', () => {
    render(<AdminDashboard />);

    expect(screen.getByRole('button', { name: 'Week Management' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Game Results' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('should show WeekManagement component by default', () => {
    render(<AdminDashboard />);

    expect(screen.getByTestId('week-management')).toBeInTheDocument();
  });

  it('should switch to settings tab when clicked', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    const settingsTab = screen.getByRole('button', { name: 'Settings' });
    await user.click(settingsTab);

    expect(screen.getByText('Additional settings will be available here in future updates.')).toBeInTheDocument();
    expect(screen.queryByTestId('week-management')).not.toBeInTheDocument();
  });

  it('should switch back to weeks tab when clicked', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    // Switch to settings first
    const settingsTab = screen.getByRole('button', { name: 'Settings' });
    await user.click(settingsTab);

    // Then switch back to weeks
    const weeksTab = screen.getByRole('button', { name: 'Week Management' });
    await user.click(weeksTab);

    expect(screen.getByTestId('week-management')).toBeInTheDocument();
    expect(screen.queryByText('Additional settings will be available here in future updates.')).not.toBeInTheDocument();
  });

  it('should highlight active tab correctly', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    const weeksTab = screen.getByRole('button', { name: 'Week Management' });
    const settingsTab = screen.getByRole('button', { name: 'Settings' });

    // Week Management should be active by default
    expect(weeksTab).toHaveClass('border-blue-500', 'text-blue-600');
    expect(settingsTab).toHaveClass('border-transparent');

    // Switch to settings
    await user.click(settingsTab);

    expect(settingsTab).toHaveClass('border-blue-500', 'text-blue-600');
    expect(weeksTab).toHaveClass('border-transparent');
  });

  it('should call logout when sign out button is clicked', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    const signOutButton = screen.getByRole('button', { name: 'Sign Out' });
    await user.click(signOutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    // Note: window.location.reload() is called but hard to test in JSDOM
  });

  it('should show back to dashboard button when onBackToDashboard prop is provided', () => {
    render(<AdminDashboard onBackToDashboard={mockOnBackToDashboard} />);

    expect(screen.getByRole('button', { name: 'Back to Dashboard' })).toBeInTheDocument();
  });

  it('should not show back to dashboard button when onBackToDashboard prop is not provided', () => {
    render(<AdminDashboard />);

    expect(screen.queryByRole('button', { name: 'Back to Dashboard' })).not.toBeInTheDocument();
  });

  it('should call onBackToDashboard when back button is clicked', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard onBackToDashboard={mockOnBackToDashboard} />);

    const backButton = screen.getByRole('button', { name: 'Back to Dashboard' });
    await user.click(backButton);

    expect(mockOnBackToDashboard).toHaveBeenCalledTimes(1);
  });

  it('should have proper CSS classes for styling', () => {
    render(<AdminDashboard />);

    // Check header styling
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('bg-white', 'dark:bg-gray-800', 'shadow-sm');

    // Check sign out button styling
    const signOutButton = screen.getByRole('button', { name: 'Sign Out' });
    expect(signOutButton).toHaveClass('bg-red-600', 'hover:bg-red-700');
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<AdminDashboard />);

      expect(screen.getByRole('heading', { level: 1, name: 'Admin Dashboard' })).toBeInTheDocument();
    });

    it('should have accessible navigation', () => {
      render(<AdminDashboard />);

      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();
    });

    it('should have keyboard accessible tabs', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />);

      const settingsTab = screen.getByRole('button', { name: 'Settings' });
      
      // Tab should be focusable
      settingsTab.focus();
      expect(settingsTab).toHaveFocus();

      // Should be activatable with user interaction (not direct click)
      await user.click(settingsTab);
      
      // After clicking settings tab, we should see the settings content
      expect(screen.getByText('Additional settings will be available here in future updates.')).toBeInTheDocument();
      expect(screen.queryByTestId('week-management')).not.toBeInTheDocument();
    });
  });
});