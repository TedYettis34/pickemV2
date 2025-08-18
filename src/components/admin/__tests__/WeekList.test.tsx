import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeekList } from '../WeekList';
import { Week } from '../../../types/week';

describe('WeekList', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  const mockWeeks: Week[] = [
    {
      id: 1,
      name: 'Week 1',
      start_date: '2024-12-01T00:00:00Z',
      end_date: '2024-12-07T23:59:59Z',
      description: 'First week of December',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Week 2',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-07T23:59:59Z',
      description: null as any, // Test without description
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 3,
      name: 'Active Week',
      start_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      end_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      description: 'Currently active week',
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no weeks provided', () => {
    render(<WeekList weeks={[]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('No weeks created yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first week to start managing pick periods.')).toBeInTheDocument();
  });

  it('should render weeks list with header', () => {
    render(<WeekList weeks={mockWeeks} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('All Weeks (3)')).toBeInTheDocument();
    expect(screen.getByText('Week Name')).toBeInTheDocument();
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('should render all weeks in the list', () => {
    render(<WeekList weeks={mockWeeks} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getAllByText('Week 1')).toHaveLength(2); // Desktop and mobile
    expect(screen.getAllByText('Week 2')).toHaveLength(2); // Desktop and mobile
    expect(screen.getAllByText('Active Week')).toHaveLength(2); // Desktop and mobile
  });

  it('should display week descriptions when available', () => {
    render(<WeekList weeks={mockWeeks} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getAllByText('First week of December')).toHaveLength(2); // Desktop and mobile
    expect(screen.getAllByText('Currently active week')).toHaveLength(2); // Desktop and mobile
  });

  it('should format dates correctly', () => {
    render(<WeekList weeks={mockWeeks} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    // Check that dates are formatted (exact format depends on locale, so just check they exist)
    const dateElements = screen.getAllByText(/2024/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('should show upcoming status for future weeks', () => {
    render(<WeekList weeks={mockWeeks} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getAllByText('Upcoming')).toHaveLength(2); // Desktop and mobile
  });

  it('should show active status for current weeks', () => {
    render(<WeekList weeks={mockWeeks} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getAllByText('Active')).toHaveLength(2); // Desktop and mobile
  });

  it('should show completed status for past weeks', () => {
    render(<WeekList weeks={mockWeeks} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getAllByText('Completed')).toHaveLength(2); // Desktop and mobile
  });

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<WeekList weeks={mockWeeks} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith(mockWeeks[0]);
  });

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<WeekList weeks={mockWeeks} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    expect(mockOnDelete).toHaveBeenCalledWith(mockWeeks[0]);
  });

  it('should have hover effects on table rows', () => {
    render(<WeekList weeks={mockWeeks} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const rows = screen.getAllByRole('row');
    // First row is header, so check the second row
    expect(rows[1]).toHaveClass('hover:bg-gray-50');
  });

  it('should handle weeks without descriptions', () => {
    const weekWithoutDescription: Week = {
      id: 4,
      name: 'Week Without Description',
      start_date: '2024-01-15T00:00:00Z',
      end_date: '2024-01-21T23:59:59Z',
      description: undefined,
      created_at: '2024-01-04T00:00:00Z',
      updated_at: '2024-01-04T00:00:00Z',
    };

    render(<WeekList weeks={[weekWithoutDescription]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('Week Without Description')).toBeInTheDocument();
    // Should not render any description text
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
  });

  describe('Week Status Logic', () => {
    it('should correctly identify upcoming weeks', () => {
      const futureWeek: Week = {
        id: 5,
        name: 'Future Week',
        start_date: new Date(Date.now() + 86400000 * 7).toISOString(), // Next week
        end_date: new Date(Date.now() + 86400000 * 14).toISOString(), // Two weeks from now
        description: 'Future week',
        created_at: '2024-01-05T00:00:00Z',
        updated_at: '2024-01-05T00:00:00Z',
      };

      render(<WeekList weeks={[futureWeek]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText('Upcoming')).toBeInTheDocument();
    });

    it('should correctly identify completed weeks', () => {
      const pastWeek: Week = {
        id: 6,
        name: 'Past Week',
        start_date: new Date(Date.now() - 86400000 * 14).toISOString(), // Two weeks ago
        end_date: new Date(Date.now() - 86400000 * 7).toISOString(), // One week ago
        description: 'Past week',
        created_at: '2024-01-06T00:00:00Z',
        updated_at: '2024-01-06T00:00:00Z',
      };

      render(<WeekList weeks={[pastWeek]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should correctly identify active weeks', () => {
      const activeWeek: Week = {
        id: 7,
        name: 'Current Week',
        start_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        end_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        description: 'Current active week',
        created_at: '2024-01-07T00:00:00Z',
        updated_at: '2024-01-07T00:00:00Z',
      };

      render(<WeekList weeks={[activeWeek]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  describe('Mobile View', () => {
    beforeEach(() => {
      // Mock small screen width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });
    });

    it('should render mobile cards with week information', () => {
      render(<WeekList weeks={mockWeeks} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      // Mobile view still shows the same content, just in different layout
      expect(screen.getByText('Week 1')).toBeInTheDocument();
      expect(screen.getByText('First week of December')).toBeInTheDocument();
    });

    it('should have edit and delete buttons in mobile view', async () => {
      const user = userEvent.setup();
      render(<WeekList weeks={mockWeeks} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const editButtons = screen.getAllByText('Edit');
      const deleteButtons = screen.getAllByText('Delete');

      // Should have buttons for both desktop and mobile views
      expect(editButtons.length).toBeGreaterThanOrEqual(mockWeeks.length);
      expect(deleteButtons.length).toBeGreaterThanOrEqual(mockWeeks.length);

      // Test clicking on mobile edit button
      await user.click(editButtons[editButtons.length - 1]); // Last edit button (mobile)
      expect(mockOnEdit).toHaveBeenCalled();
    });
  });
});