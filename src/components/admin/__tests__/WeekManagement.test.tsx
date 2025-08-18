import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeekManagement } from '../WeekManagement';

// Mock the useWeeks hook
jest.mock('../../../hooks/useWeeks', () => ({
  useWeeks: jest.fn(),
}));

// Mock the WeekForm component
jest.mock('../WeekForm', () => ({
  WeekForm: ({ onSubmit, isSubmitting, submitLabel, initialData }: {
    onSubmit: (data: { name: string; start_date: string; end_date: string; description: string }) => void;
    isSubmitting: boolean;
    submitLabel: string;
    initialData?: { name: string; start_date: string; end_date: string; description: string };
  }) => (
    <div data-testid="week-form">
      <form onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name: 'Test Week',
          start_date: '2024-01-01T00:00:00Z',
          end_date: '2024-01-07T23:59:59Z',
          description: 'Test description'
        });
      }}>
        <input data-testid="week-name" defaultValue={initialData?.name || ''} />
        <button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </button>
      </form>
    </div>
  ),
}));

// Mock the WeekList component
jest.mock('../WeekList', () => ({
  WeekList: ({ weeks, onEdit, onDelete }: {
    weeks: Array<{ id: number; name: string }>;
    onEdit: (week: { id: number; name: string }) => void;
    onDelete: (week: { id: number; name: string }) => void;
  }) => (
    <div data-testid="week-list">
      {weeks.map((week) => (
        <div key={week.id} data-testid={`week-${week.id}`}>
          <span>{week.name}</span>
          <button onClick={() => onEdit(week)}>Edit</button>
          <button onClick={() => onDelete(week)}>Delete</button>
        </div>
      ))}
    </div>
  ),
}));

import { useWeeks } from '../../../hooks/useWeeks';

const mockUseWeeks = useWeeks as jest.MockedFunction<typeof useWeeks>;

describe('WeekManagement', () => {
  const mockWeeks = [
    {
      id: 1,
      name: 'Week 1',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-07T23:59:59Z',
      description: 'First week',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Week 2',
      start_date: '2024-01-08T00:00:00Z',
      end_date: '2024-01-14T23:59:59Z',
      description: 'Second week',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
  ];

  const defaultMockReturn = {
    weeks: mockWeeks,
    loading: false,
    error: null,
    createWeek: jest.fn(),
    updateWeek: jest.fn(),
    deleteWeek: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWeeks.mockReturnValue(defaultMockReturn);
  });

  it('should render loading state', () => {
    mockUseWeeks.mockReturnValue({
      ...defaultMockReturn,
      loading: true,
    });

    render(<WeekManagement />);

    expect(screen.getByText('Loading weeks...')).toBeInTheDocument();
  });

  it('should render week management header', () => {
    render(<WeekManagement />);

    expect(screen.getByText('Week Management')).toBeInTheDocument();
    expect(screen.getByText('Create and manage weeks for picks')).toBeInTheDocument();
  });

  it('should show create new week button initially', () => {
    render(<WeekManagement />);

    expect(screen.getByRole('button', { name: 'Create New Week' })).toBeInTheDocument();
  });

  it('should display weeks list when not in form mode', () => {
    render(<WeekManagement />);

    expect(screen.getByTestId('week-list')).toBeInTheDocument();
    expect(screen.getByTestId('week-1')).toBeInTheDocument();
    expect(screen.getByTestId('week-2')).toBeInTheDocument();
  });

  it('should display error message when there is an error', () => {
    mockUseWeeks.mockReturnValue({
      ...defaultMockReturn,
      error: 'Failed to load weeks',
    });

    render(<WeekManagement />);

    expect(screen.getByText('Error:')).toBeInTheDocument();
    expect(screen.getByText('Failed to load weeks')).toBeInTheDocument();
  });

  it('should show create form when create button is clicked', async () => {
    const user = userEvent.setup();
    render(<WeekManagement />);

    const createButton = screen.getByRole('button', { name: 'Quick Create (No Games)' });
    await user.click(createButton);

    expect(screen.getByTestId('week-form')).toBeInTheDocument();
    expect(screen.getByText('Create New Week')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Week' })).toBeInTheDocument();
  });

  it('should hide create button when form is shown', async () => {
    const user = userEvent.setup();
    render(<WeekManagement />);

    const createButton = screen.getByRole('button', { name: 'Quick Create (No Games)' });
    await user.click(createButton);

    expect(screen.queryByRole('button', { name: 'Create New Week' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quick Create (No Games)' })).not.toBeInTheDocument();
  });

  it('should show edit form when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<WeekManagement />);

    const editButton = screen.getAllByText('Edit')[0];
    await user.click(editButton);

    expect(screen.getByTestId('week-form')).toBeInTheDocument();
    expect(screen.getByText('Edit Week')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update Week' })).toBeInTheDocument();
  });

  it('should populate form with week data when editing', async () => {
    const user = userEvent.setup();
    render(<WeekManagement />);

    const editButton = screen.getAllByText('Edit')[0];
    await user.click(editButton);

    const nameInput = screen.getByTestId('week-name');
    expect(nameInput).toHaveValue('Week 1');
  });

  it('should close form when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<WeekManagement />);

    // Open form
    const createButton = screen.getByRole('button', { name: 'Create New Week' });
    await user.click(createButton);

    // Close form
    const closeButton = screen.getByRole('button', { name: '' }); // SVG close button
    await user.click(closeButton);

    expect(screen.queryByTestId('week-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('week-list')).toBeInTheDocument();
  });

  it('should create week successfully', async () => {
    const mockCreateWeek = jest.fn().mockResolvedValue({ success: true });
    mockUseWeeks.mockReturnValue({
      ...defaultMockReturn,
      createWeek: mockCreateWeek,
    });

    const user = userEvent.setup();
    render(<WeekManagement />);

    // Open create form
    const createButton = screen.getByRole('button', { name: 'Quick Create (No Games)' });
    await user.click(createButton);

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Create Week' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateWeek).toHaveBeenCalledWith({
        name: 'Test Week',
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2024-01-07T23:59:59Z',
        description: 'Test description'
      });
    });
  });

  it('should handle create week error', async () => {
    const mockCreateWeek = jest.fn().mockResolvedValue({ 
      success: false, 
      error: 'Failed to create week' 
    });
    mockUseWeeks.mockReturnValue({
      ...defaultMockReturn,
      createWeek: mockCreateWeek,
    });

    const user = userEvent.setup();
    render(<WeekManagement />);

    // Open create form
    const createButton = screen.getByRole('button', { name: 'Quick Create (No Games)' });
    await user.click(createButton);

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Create Week' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to create week')).toBeInTheDocument();
    });
  });

  it('should update week successfully', async () => {
    const mockUpdateWeek = jest.fn().mockResolvedValue({ success: true });
    mockUseWeeks.mockReturnValue({
      ...defaultMockReturn,
      updateWeek: mockUpdateWeek,
    });

    const user = userEvent.setup();
    render(<WeekManagement />);

    // Open edit form
    const editButton = screen.getAllByText('Edit')[0];
    await user.click(editButton);

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Update Week' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateWeek).toHaveBeenCalledWith(1, {
        name: 'Test Week',
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2024-01-07T23:59:59Z',
        description: 'Test description'
      });
    });
  });

  it('should handle update week error', async () => {
    const mockUpdateWeek = jest.fn().mockResolvedValue({ 
      success: false, 
      error: 'Failed to update week' 
    });
    mockUseWeeks.mockReturnValue({
      ...defaultMockReturn,
      updateWeek: mockUpdateWeek,
    });

    const user = userEvent.setup();
    render(<WeekManagement />);

    // Open edit form
    const editButton = screen.getAllByText('Edit')[0];
    await user.click(editButton);

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Update Week' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to update week')).toBeInTheDocument();
    });
  });

  it('should delete week with confirmation', async () => {
    const mockDeleteWeek = jest.fn().mockResolvedValue({ success: true });
    mockUseWeeks.mockReturnValue({
      ...defaultMockReturn,
      deleteWeek: mockDeleteWeek,
    });

    // Mock window.confirm
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();
    render(<WeekManagement />);

    const deleteButton = screen.getAllByText('Delete')[0];
    await user.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalledWith(
      'Are you sure you want to delete "Week 1"? This action cannot be undone.'
    );
    expect(mockDeleteWeek).toHaveBeenCalledWith(1);

    confirmSpy.mockRestore();
  });

  it('should not delete week if confirmation is denied', async () => {
    const mockDeleteWeek = jest.fn();
    mockUseWeeks.mockReturnValue({
      ...defaultMockReturn,
      deleteWeek: mockDeleteWeek,
    });

    // Mock window.confirm to return false
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    const user = userEvent.setup();
    render(<WeekManagement />);

    const deleteButton = screen.getAllByText('Delete')[0];
    await user.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDeleteWeek).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('should handle delete week error', async () => {
    const mockDeleteWeek = jest.fn().mockResolvedValue({ 
      success: false, 
      error: 'Failed to delete week' 
    });
    mockUseWeeks.mockReturnValue({
      ...defaultMockReturn,
      deleteWeek: mockDeleteWeek,
    });

    // Mock window.confirm and alert
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    const user = userEvent.setup();
    render(<WeekManagement />);

    const deleteButton = screen.getAllByText('Delete')[0];
    await user.click(deleteButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to delete week');
    });

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });
});