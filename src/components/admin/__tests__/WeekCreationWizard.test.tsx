import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeekCreationWizard } from '../WeekCreationWizard';

// Mock adminAuth module
jest.mock('../../../lib/adminAuth', () => ({
  getCurrentAccessToken: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

import { getCurrentAccessToken } from '../../../lib/adminAuth';

const mockGetCurrentAccessToken = getCurrentAccessToken as jest.MockedFunction<typeof getCurrentAccessToken>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('WeekCreationWizard', () => {
  const mockProps = {
    onWeekCreated: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentAccessToken.mockReturnValue('mock-token');
  });

  describe('Form Step', () => {
    it('should render the form initially', () => {
      render(<WeekCreationWizard {...mockProps} />);

      expect(screen.getByText('Create New Week')).toBeInTheDocument();
      expect(screen.getByLabelText('Week Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Start Date & Time *')).toBeInTheDocument();
      expect(screen.getByLabelText('End Date & Time *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Preview Games' })).toBeInTheDocument();
    });

    it('should handle form input changes', async () => {
      const user = userEvent.setup();
      render(<WeekCreationWizard {...mockProps} />);

      const nameInput = screen.getByLabelText('Week Name *');
      const startDateInput = screen.getByLabelText('Start Date & Time *');
      const endDateInput = screen.getByLabelText('End Date & Time *');
      const descriptionInput = screen.getByLabelText('Description');

      await user.type(nameInput, 'Week 1');
      await user.type(startDateInput, '2024-01-01T00:00');
      await user.type(endDateInput, '2024-01-07T23:59');
      await user.type(descriptionInput, 'First week of the season');

      expect(nameInput).toHaveValue('Week 1');
      expect(startDateInput).toHaveValue('2024-01-01T00:00');
      expect(endDateInput).toHaveValue('2024-01-07T23:59');
      expect(descriptionInput).toHaveValue('First week of the season');
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(<WeekCreationWizard {...mockProps} />);

      const previewButton = screen.getByRole('button', { name: 'Preview Games' });
      await user.click(previewButton);

      expect(screen.getByText('Week name is required')).toBeInTheDocument();
      expect(screen.getByText('Start date is required')).toBeInTheDocument();
      expect(screen.getByText('End date is required')).toBeInTheDocument();
    });

    it('should validate date range', async () => {
      const user = userEvent.setup();
      render(<WeekCreationWizard {...mockProps} />);

      const nameInput = screen.getByLabelText('Week Name *');
      const startDateInput = screen.getByLabelText('Start Date & Time *');
      const endDateInput = screen.getByLabelText('End Date & Time *');

      await user.type(nameInput, 'Week 1');
      await user.type(startDateInput, '2024-01-07T00:00');
      await user.type(endDateInput, '2024-01-01T23:59');

      const previewButton = screen.getByRole('button', { name: 'Preview Games' });
      await user.click(previewButton);

      expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
    });

    it('should clear field errors when user types', async () => {
      const user = userEvent.setup();
      render(<WeekCreationWizard {...mockProps} />);

      // Trigger validation errors
      const previewButton = screen.getByRole('button', { name: 'Preview Games' });
      await user.click(previewButton);

      expect(screen.getByText('Week name is required')).toBeInTheDocument();

      // Type in the field to clear error
      const nameInput = screen.getByLabelText('Week Name *');
      await user.type(nameInput, 'Week 1');

      expect(screen.queryByText('Week name is required')).not.toBeInTheDocument();
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<WeekCreationWizard {...mockProps} />);

      const cancelButton = screen.getByRole('button', { name: '' }); // Close button with X icon
      await user.click(cancelButton);

      expect(mockProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should preview games successfully', async () => {
      const user = userEvent.setup();
      const mockGamesResponse = {
        success: true,
        data: {
          nfl: [
            {
              external_id: 'game1',
              home_team: 'Chiefs',
              away_team: 'Bills',
              commence_time: '2024-01-01T18:00:00Z',
              sport: 'americanfootball_nfl',
              spread_home: -3.5,
            },
          ],
          college: [
            {
              external_id: 'game2',
              home_team: 'Alabama',
              away_team: 'Georgia',
              commence_time: '2024-01-02T20:00:00Z',
              sport: 'americanfootball_ncaaf',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGamesResponse,
      } as Response);

      render(<WeekCreationWizard {...mockProps} />);

      // Fill form
      await user.type(screen.getByLabelText('Week Name *'), 'Week 1');
      await user.type(screen.getByLabelText('Start Date & Time *'), '2024-01-01T00:00');
      await user.type(screen.getByLabelText('End Date & Time *'), '2024-01-07T23:59');
      await user.type(screen.getByLabelText('Description'), 'First week');

      const previewButton = screen.getByRole('button', { name: 'Preview Games' });
      await user.click(previewButton);

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/games/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: expect.stringContaining('"start_date"') && expect.stringContaining('"end_date"'),
      });

      // Should navigate to preview step
      await waitFor(() => {
        expect(screen.getByText('Preview Games for "Week 1"')).toBeInTheDocument();
      });
    });

    it('should handle API error during preview', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: 'API Error' }),
      } as Response);

      render(<WeekCreationWizard {...mockProps} />);

      // Fill form
      await user.type(screen.getByLabelText('Week Name *'), 'Week 1');
      await user.type(screen.getByLabelText('Start Date & Time *'), '2024-01-01T00:00');
      await user.type(screen.getByLabelText('End Date & Time *'), '2024-01-07T23:59');

      const previewButton = screen.getByRole('button', { name: 'Preview Games' });
      await user.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });

    it('should handle network error during preview', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<WeekCreationWizard {...mockProps} />);

      // Fill form
      await user.type(screen.getByLabelText('Week Name *'), 'Week 1');
      await user.type(screen.getByLabelText('Start Date & Time *'), '2024-01-01T00:00');
      await user.type(screen.getByLabelText('End Date & Time *'), '2024-01-07T23:59');

      const previewButton = screen.getByRole('button', { name: 'Preview Games' });
      await user.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should show loading state during preview', async () => {
      const user = userEvent.setup();
      // Mock a promise that doesn't resolve immediately
      let resolvePromise: (value: Response) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValueOnce(promise as Promise<Response>);

      render(<WeekCreationWizard {...mockProps} />);

      // Fill form
      await user.type(screen.getByLabelText('Week Name *'), 'Week 1');
      await user.type(screen.getByLabelText('Start Date & Time *'), '2024-01-01T00:00');
      await user.type(screen.getByLabelText('End Date & Time *'), '2024-01-07T23:59');

      const previewButton = screen.getByRole('button', { name: 'Preview Games' });
      await user.click(previewButton);

      expect(screen.getByText('Loading Games...')).toBeInTheDocument();
      expect(previewButton).toBeDisabled();

      // Resolve the promise to clean up
      resolvePromise!({
        ok: true,
        json: async () => ({ success: true, data: { nfl: [], college: [] } }),
      } as Response);
    });

    it('should handle missing auth token', async () => {
      const user = userEvent.setup();
      mockGetCurrentAccessToken.mockReturnValue(null);

      render(<WeekCreationWizard {...mockProps} />);

      // Fill form
      await user.type(screen.getByLabelText('Week Name *'), 'Week 1');
      await user.type(screen.getByLabelText('Start Date & Time *'), '2024-01-01T00:00');
      await user.type(screen.getByLabelText('End Date & Time *'), '2024-01-07T23:59');

      const previewButton = screen.getByRole('button', { name: 'Preview Games' });
      await user.click(previewButton);

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/games/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"start_date"') && expect.stringContaining('"end_date"'),
      });
    });
  });

  describe('Preview Step', () => {
    const setupPreviewStep = async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            nfl: [
              {
                external_id: 'game1',
                home_team: 'Chiefs',
                away_team: 'Bills',
                commence_time: '2024-01-01T18:00:00Z',
                sport: 'americanfootball_nfl',
                spread_home: -3.5,
              },
            ],
            college: [
              {
                external_id: 'game2',
                home_team: 'Alabama',
                away_team: 'Georgia',
                commence_time: '2024-01-02T20:00:00Z',
                sport: 'americanfootball_ncaaf',
                spread_home: 7,
              },
            ],
          },
        }),
      } as Response);

      render(<WeekCreationWizard {...mockProps} />);

      // Fill form and preview
      await user.type(screen.getByLabelText('Week Name *'), 'Week 1');
      await user.type(screen.getByLabelText('Start Date & Time *'), '2024-01-01T00:00');
      await user.type(screen.getByLabelText('End Date & Time *'), '2024-01-07T23:59');
      await user.type(screen.getByLabelText('Description'), 'First week');

      await user.click(screen.getByRole('button', { name: 'Preview Games' }));
      await waitFor(() => {
        expect(screen.getByText('Preview Games for "Week 1"')).toBeInTheDocument();
      });

      return user;
    };

    it('should display preview with games', async () => {
      await setupPreviewStep();

      expect(screen.getByText('Preview Games for "Week 1"')).toBeInTheDocument();
      expect(screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4} - \d{1,2}\/\d{1,2}\/\d{4}/)).toBeInTheDocument();
      // Just check for key elements that show the preview is working
      expect(screen.getByText(/1 NFL games/)).toBeInTheDocument();
      expect(screen.getByText(/1 college games/)).toBeInTheDocument();
      
      expect(screen.getByText('NFL Games (1)')).toBeInTheDocument();
      expect(screen.getByText('Bills @ Chiefs')).toBeInTheDocument();
      expect(screen.getByText('Spread: Chiefs -3.5')).toBeInTheDocument();
      
      expect(screen.getByText('College Games (1)')).toBeInTheDocument();
      expect(screen.getByText('Georgia @ Alabama')).toBeInTheDocument();
      expect(screen.getByText('Spread: Alabama +7')).toBeInTheDocument();
    });

    it('should display no games message when no games found', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { nfl: [], college: [] },
        }),
      } as Response);

      render(<WeekCreationWizard {...mockProps} />);

      // Fill form and preview
      await user.type(screen.getByLabelText('Week Name *'), 'Week 1');
      await user.type(screen.getByLabelText('Start Date & Time *'), '2024-01-01T00:00');
      await user.type(screen.getByLabelText('End Date & Time *'), '2024-01-07T23:59');

      await user.click(screen.getByRole('button', { name: 'Preview Games' }));

      await waitFor(() => {
        expect(screen.getByText('No games found for this date range. You can still create the week, but no games will be available.')).toBeInTheDocument();
      });
    });

    it('should go back to form when back button clicked', async () => {
      const user = await setupPreviewStep();

      const backButton = screen.getByRole('button', { name: 'Back to Form' });
      await user.click(backButton);

      expect(screen.getByText('Create New Week')).toBeInTheDocument();
      expect(screen.getByLabelText('Week Name *')).toHaveValue('Week 1');
    });

    it('should create week when create button clicked', async () => {
      const user = await setupPreviewStep();

      const createButton = screen.getByRole('button', { name: 'Create Week with These Games' });
      await user.click(createButton);

      expect(mockProps.onWeekCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Week 1',
          description: 'First week',
        }),
        {
          nfl: [
            {
              external_id: 'game1',
              home_team: 'Chiefs',
              away_team: 'Bills',
              commence_time: '2024-01-01T18:00:00Z',
              sport: 'americanfootball_nfl',
              spread_home: -3.5,
            },
          ],
          college: [
            {
              external_id: 'game2',
              home_team: 'Alabama',
              away_team: 'Georgia',
              commence_time: '2024-01-02T20:00:00Z',
              sport: 'americanfootball_ncaaf',
              spread_home: 7,
            },
          ],
        }
      );
    });

    it('should call onCancel when cancel button clicked in preview', async () => {
      const user = await setupPreviewStep();

      const cancelButton = screen.getAllByRole('button', { name: '' })[0]; // Close button with X icon
      await user.click(cancelButton);

      expect(mockProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should handle games without spreads', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            nfl: [
              {
                external_id: 'game1',
                home_team: 'Chiefs',
                away_team: 'Bills',
                commence_time: '2024-01-01T18:00:00Z',
                sport: 'americanfootball_nfl',
              },
            ],
            college: [],
          },
        }),
      } as Response);

      render(<WeekCreationWizard {...mockProps} />);

      // Fill form and preview
      await user.type(screen.getByLabelText('Week Name *'), 'Week 1');
      await user.type(screen.getByLabelText('Start Date & Time *'), '2024-01-01T00:00');
      await user.type(screen.getByLabelText('End Date & Time *'), '2024-01-07T23:59');

      await user.click(screen.getByRole('button', { name: 'Preview Games' }));

      await waitFor(() => {
        expect(screen.getByText('Bills @ Chiefs')).toBeInTheDocument();
        expect(screen.queryByText(/Spread:/)).not.toBeInTheDocument();
      });
    });

    it('should display game times correctly', async () => {
      await setupPreviewStep();

      // Check that times are displayed (format may vary by locale)
      const date1Elements = screen.getAllByText(/1\/1\/2024/);
      const date2Elements = screen.getAllByText(/1\/2\/2024/);
      expect(date1Elements.length).toBeGreaterThan(0);
      expect(date2Elements.length).toBeGreaterThan(0);
    });

    it('should handle games with missing external_id', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            nfl: [
              {
                home_team: 'Chiefs',
                away_team: 'Bills',
                commence_time: '2024-01-01T18:00:00Z',
                sport: 'americanfootball_nfl',
              },
            ],
            college: [],
          },
        }),
      } as Response);

      render(<WeekCreationWizard {...mockProps} />);

      // Fill form and preview
      await user.type(screen.getByLabelText('Week Name *'), 'Week 1');
      await user.type(screen.getByLabelText('Start Date & Time *'), '2024-01-01T00:00');
      await user.type(screen.getByLabelText('End Date & Time *'), '2024-01-07T23:59');

      await user.click(screen.getByRole('button', { name: 'Preview Games' }));

      await waitFor(() => {
        expect(screen.getByText('Bills @ Chiefs')).toBeInTheDocument();
      });
    });
  });
});