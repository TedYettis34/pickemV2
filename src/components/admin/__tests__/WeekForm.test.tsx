import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeekForm } from '../WeekForm';
import { CreateWeekInput } from '../../../types/week';

describe('WeekForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    onSubmit: mockOnSubmit,
    isSubmitting: false,
    submitLabel: 'Create Week',
  };

  it('should render form fields correctly', () => {
    render(<WeekForm {...defaultProps} />);

    expect(screen.getByLabelText(/week name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date & time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date & time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Week' })).toBeInTheDocument();
  });

  it('should populate form with initial data', () => {
    const initialData = {
      name: 'Test Week',
      start_date: '2024-09-01T00:00',
      end_date: '2024-09-08T23:59',
      description: 'Test description',
    };

    render(<WeekForm {...defaultProps} initialData={initialData} />);

    expect(screen.getByDisplayValue('Test Week')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-09-01T00:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-09-08T23:59')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<WeekForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: 'Create Week' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Week name is required')).toBeInTheDocument();
      expect(screen.getByText('Start date is required')).toBeInTheDocument();
      expect(screen.getByText('End date is required')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should validate date range', async () => {
    const user = userEvent.setup();
    render(<WeekForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/week name/i);
    const startDateInput = screen.getByLabelText(/start date & time/i);
    const endDateInput = screen.getByLabelText(/end date & time/i);

    await user.type(nameInput, 'Test Week');
    await user.type(startDateInput, '2024-09-08T00:00');
    await user.type(endDateInput, '2024-09-01T23:59');

    const submitButton = screen.getByRole('button', { name: 'Create Week' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    render(<WeekForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/week name/i);
    const startDateInput = screen.getByLabelText(/start date & time/i);
    const endDateInput = screen.getByLabelText(/end date & time/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    await user.type(nameInput, 'Test Week');
    await user.type(startDateInput, '2024-09-01T00:00');
    await user.type(endDateInput, '2024-09-08T23:59');
    await user.type(descriptionInput, 'Test description');

    const submitButton = screen.getByRole('button', { name: 'Create Week' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Week',
        start_date: '2024-09-01T00:00:00.000Z',
        end_date: '2024-09-08T23:59:00.000Z',
        description: 'Test description',
      });
    });
  });

  it('should handle submission without description', async () => {
    const user = userEvent.setup();
    render(<WeekForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/week name/i);
    const startDateInput = screen.getByLabelText(/start date & time/i);
    const endDateInput = screen.getByLabelText(/end date & time/i);

    await user.type(nameInput, 'Test Week');
    await user.type(startDateInput, '2024-09-01T00:00');
    await user.type(endDateInput, '2024-09-08T23:59');

    const submitButton = screen.getByRole('button', { name: 'Create Week' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Week',
        start_date: '2024-09-01T00:00:00.000Z',
        end_date: '2024-09-08T23:59:00.000Z',
        description: undefined,
      });
    });
  });

  it('should show character counts', () => {
    render(<WeekForm {...defaultProps} />);

    expect(screen.getByText('0/255 characters')).toBeInTheDocument();
    expect(screen.getByText('0/1000 characters')).toBeInTheDocument();
  });

  it('should update character counts as user types', async () => {
    const user = userEvent.setup();
    render(<WeekForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/week name/i);
    await user.type(nameInput, 'Test');

    expect(screen.getByText('4/255 characters')).toBeInTheDocument();
  });

  it('should disable form when submitting', () => {
    render(<WeekForm {...defaultProps} isSubmitting={true} />);

    expect(screen.getByLabelText(/week name/i)).toBeDisabled();
    expect(screen.getByLabelText(/start date & time/i)).toBeDisabled();
    expect(screen.getByLabelText(/end date & time/i)).toBeDisabled();
    expect(screen.getByLabelText(/description/i)).toBeDisabled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should show processing state when submitting', () => {
    render(<WeekForm {...defaultProps} isSubmitting={true} />);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('should clear errors when user starts typing', async () => {
    const user = userEvent.setup();
    render(<WeekForm {...defaultProps} />);

    // Submit empty form to trigger validation errors
    const submitButton = screen.getByRole('button', { name: 'Create Week' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Week name is required')).toBeInTheDocument();
    });

    // Start typing in name field
    const nameInput = screen.getByLabelText(/week name/i);
    await user.type(nameInput, 'T');

    // Error should be cleared
    expect(screen.queryByText('Week name is required')).not.toBeInTheDocument();
  });
});