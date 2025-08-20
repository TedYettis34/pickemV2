import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeekForm } from '../WeekForm';

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
    expect(screen.getByLabelText(/max picker's choice games/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Week' })).toBeInTheDocument();
  });

  it('should populate form with initial data', () => {
    const initialData = {
      name: 'Test Week',
      start_date: '2024-09-01T00:00',
      end_date: '2024-09-08T23:59',
      description: 'Test description',
      max_picker_choice_games: 5,
    };

    render(<WeekForm {...defaultProps} initialData={initialData} />);

    expect(screen.getByDisplayValue('Test Week')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-09-01T00:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-09-08T23:59')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
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
      // Calculate expected dates considering timezone conversion
      const expectedStartDate = new Date('2024-09-01T00:00').toISOString();
      const expectedEndDate = new Date('2024-09-08T23:59').toISOString();
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Week',
        start_date: expectedStartDate,
        end_date: expectedEndDate,
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
      // Calculate expected dates considering timezone conversion
      const expectedStartDate = new Date('2024-09-01T00:00').toISOString();
      const expectedEndDate = new Date('2024-09-08T23:59').toISOString();
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Week',
        start_date: expectedStartDate,
        end_date: expectedEndDate,
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

  describe('Max Picker Choice Games', () => {
    it('should render max picker choice games field with help text', () => {
      render(<WeekForm {...defaultProps} />);

      const field = screen.getByLabelText(/max picker's choice games/i);
      expect(field).toBeInTheDocument();
      expect(field).toHaveAttribute('type', 'number');
      expect(field).toHaveAttribute('placeholder', 'Leave empty for no limit');
      expect(field).toHaveAttribute('min', '1');
      expect(field).toHaveAttribute('max', '100');
      
      expect(screen.getByText(/maximum number of non-must-pick games users can pick/i)).toBeInTheDocument();
    });

    it('should allow empty max picker choice games (no limit)', async () => {
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
          start_date: new Date('2024-09-01T00:00').toISOString(),
          end_date: new Date('2024-09-08T23:59').toISOString(),
          description: undefined,
          max_picker_choice_games: undefined,
        });
      });
    });

    it('should submit form with max picker choice games value', async () => {
      const user = userEvent.setup();
      render(<WeekForm {...defaultProps} />);

      const nameInput = screen.getByLabelText(/week name/i);
      const startDateInput = screen.getByLabelText(/start date & time/i);
      const endDateInput = screen.getByLabelText(/end date & time/i);
      const maxPickerChoiceInput = screen.getByLabelText(/max picker's choice games/i);

      await user.type(nameInput, 'Test Week');
      await user.type(startDateInput, '2024-09-01T00:00');
      await user.type(endDateInput, '2024-09-08T23:59');
      await user.type(maxPickerChoiceInput, '7');

      const submitButton = screen.getByRole('button', { name: 'Create Week' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Test Week',
          start_date: new Date('2024-09-01T00:00').toISOString(),
          end_date: new Date('2024-09-08T23:59').toISOString(),
          description: undefined,
          max_picker_choice_games: 7,
        });
      });
    });

    it('should validate max picker choice games - must be positive', async () => {
      const user = userEvent.setup();
      render(<WeekForm {...defaultProps} />);

      const maxPickerChoiceInput = screen.getByLabelText(/max picker's choice games/i);
      await user.type(maxPickerChoiceInput, '0');

      const submitButton = screen.getByRole('button', { name: 'Create Week' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Must be a positive integer')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should validate max picker choice games - must not exceed 100', async () => {
      const user = userEvent.setup();
      render(<WeekForm {...defaultProps} />);

      const maxPickerChoiceInput = screen.getByLabelText(/max picker's choice games/i);
      await user.type(maxPickerChoiceInput, '150');

      const submitButton = screen.getByRole('button', { name: 'Create Week' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Must be 100 or less')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should validate max picker choice games - must be integer', async () => {
      const user = userEvent.setup();
      render(<WeekForm {...defaultProps} />);

      const maxPickerChoiceInput = screen.getByLabelText(/max picker's choice games/i);
      await user.type(maxPickerChoiceInput, 'abc');

      const submitButton = screen.getByRole('button', { name: 'Create Week' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Must be a positive integer')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should clear max picker choice games error when user starts typing', async () => {
      const user = userEvent.setup();
      render(<WeekForm {...defaultProps} />);

      const maxPickerChoiceInput = screen.getByLabelText(/max picker's choice games/i);
      await user.type(maxPickerChoiceInput, '0');

      const submitButton = screen.getByRole('button', { name: 'Create Week' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Must be a positive integer')).toBeInTheDocument();
      });

      // Clear and type valid value
      await user.clear(maxPickerChoiceInput);
      await user.type(maxPickerChoiceInput, '5');

      // Error should be cleared
      expect(screen.queryByText('Must be a positive integer')).not.toBeInTheDocument();
    });
  });
});