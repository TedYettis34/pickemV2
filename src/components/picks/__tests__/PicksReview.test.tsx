import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PicksReview } from '../PicksReview';
import { PicksSummary } from '../../../types/pick';

describe('PicksReview', () => {
  const mockPicksSummary: PicksSummary = {
    weekId: 1,
    weekName: 'Week 1',
    totalGames: 5,
    totalPicks: 3,
    submittedAt: null,
    picks: [
      {
        id: 1,
        user_id: 'user123',
        game_id: 1,
        pick_type: 'home_spread',
        spread_value: -3.5,
        submitted: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        game: {
          id: 1,
          week_id: 1,
          sport: 'americanfootball_nfl',
          external_id: 'game1',
          home_team: 'Chiefs',
          away_team: 'Bills',
          commence_time: '2024-01-01T18:00:00Z',
          spread_home: -3.5,
          spread_away: 3.5,
          total_over_under: 47.5,
          moneyline_home: -150,
          moneyline_away: 130,
          bookmaker: 'FanDuel',
          odds_last_updated: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      },
      {
        id: 2,
        user_id: 'user123',
        game_id: 2,
        pick_type: 'away_spread',
        spread_value: 7.5,
        submitted: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        game: {
          id: 2,
          week_id: 1,
          sport: 'americanfootball_nfl',
          external_id: 'game2',
          home_team: 'Cowboys',
          away_team: 'Giants',
          commence_time: '2024-01-02T18:00:00Z',
          spread_home: -7.5,
          spread_away: 7.5,
          total_over_under: 45.0,
          moneyline_home: -300,
          moneyline_away: 250,
          bookmaker: 'DraftKings',
          odds_last_updated: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      },
    ],
  };

  const mockProps = {
    picksSummary: mockPicksSummary,
    onSubmitPicks: jest.fn(),
    onEditPick: jest.fn(),
    onDeletePick: jest.fn(),
    isSubmitting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render picks summary correctly', () => {
    render(<PicksReview {...mockProps} />);

    expect(screen.getByText('Review Your Picks')).toBeInTheDocument();
    expect(screen.getByText('Week 1')).toBeInTheDocument();
    expect(screen.getByText('3 of 5 games picked')).toBeInTheDocument();
  });

  it('should display all picks with game information', () => {
    render(<PicksReview {...mockProps} />);

    expect(screen.getByText('Bills @ Chiefs')).toBeInTheDocument();
    expect(screen.getByText('Chiefs -3.5')).toBeInTheDocument();
    expect(screen.getByText('Giants @ Cowboys')).toBeInTheDocument();
    expect(screen.getByText('Giants +7.5')).toBeInTheDocument();
  });

  it('should show edit and delete buttons for each pick when not submitted', () => {
    render(<PicksReview {...mockProps} />);

    const editButtons = screen.getAllByText('Edit');
    const deleteButtons = screen.getAllByText('Delete');

    expect(editButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);
  });

  it('should handle edit pick action', async () => {
    const user = userEvent.setup();
    const onEditPick = jest.fn();
    
    render(<PicksReview {...mockProps} onEditPick={onEditPick} />);

    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    expect(onEditPick).toHaveBeenCalledWith(1);
  });

  it('should handle delete pick action', async () => {
    const user = userEvent.setup();
    const onDeletePick = jest.fn().mockResolvedValue(undefined);
    
    render(<PicksReview {...mockProps} onDeletePick={onDeletePick} />);

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    expect(onDeletePick).toHaveBeenCalledWith(1);
  });

  it('should show submit button when picks are not submitted', () => {
    render(<PicksReview {...mockProps} />);

    expect(screen.getByText('Submit All Picks')).toBeInTheDocument();
  });

  it('should handle submit picks action with confirmation', async () => {
    const user = userEvent.setup();
    const onSubmitPicks = jest.fn().mockResolvedValue(undefined);
    
    // Mock window.confirm to return true
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(<PicksReview {...mockProps} onSubmitPicks={onSubmitPicks} />);

    const submitButton = screen.getByText('Submit All Picks');
    await user.click(submitButton);

    expect(confirmSpy).toHaveBeenCalledWith(
      'Are you sure you want to submit all picks? This action cannot be undone.'
    );
    expect(onSubmitPicks).toHaveBeenCalledWith(1);

    confirmSpy.mockRestore();
  });

  it('should not submit picks when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const onSubmitPicks = jest.fn();
    
    // Mock window.confirm to return false
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    
    render(<PicksReview {...mockProps} onSubmitPicks={onSubmitPicks} />);

    const submitButton = screen.getByText('Submit All Picks');
    await user.click(submitButton);

    expect(confirmSpy).toHaveBeenCalled();
    expect(onSubmitPicks).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('should show loading state during submission', () => {
    render(<PicksReview {...mockProps} isSubmitting={true} />);

    expect(screen.getByText('Submitting...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submitting...' })).toBeDisabled();
  });

  it('should show submitted state when picks are submitted', () => {
    const submittedPicksSummary = {
      ...mockPicksSummary,
      submittedAt: '2024-01-01T12:00:00Z',
    };

    render(<PicksReview {...mockProps} picksSummary={submittedPicksSummary} />);

    expect(screen.getByText('Picks Submitted')).toBeInTheDocument();
    expect(screen.getByText(/Submitted on/)).toBeInTheDocument();
    expect(screen.queryByText('Submit All Picks')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('should handle no picks scenario', () => {
    const emptyPicksSummary = {
      ...mockPicksSummary,
      totalPicks: 0,
      picks: [],
    };

    render(<PicksReview {...mockProps} picksSummary={emptyPicksSummary} />);

    expect(screen.getByText('0 of 5 games picked')).toBeInTheDocument();
    expect(screen.getByText('No picks made yet')).toBeInTheDocument();
    expect(screen.queryByText('Submit All Picks')).not.toBeInTheDocument();
  });

  it('should format game time correctly', () => {
    render(<PicksReview {...mockProps} />);

    expect(screen.getByText(/Mon, Jan 1/)).toBeInTheDocument();
    expect(screen.getByText(/Tue, Jan 2/)).toBeInTheDocument();
  });

  it('should show correct sport display names', () => {
    const collegePicksSummary = {
      ...mockPicksSummary,
      picks: [
        {
          ...mockPicksSummary.picks[0],
          game: {
            ...mockPicksSummary.picks[0].game,
            sport: 'americanfootball_ncaaf' as const,
          },
        },
      ],
    };

    render(<PicksReview {...mockProps} picksSummary={collegePicksSummary} />);

    expect(screen.getByText('College')).toBeInTheDocument();
  });

  it('should show error message when delete fails', async () => {
    const user = userEvent.setup();
    const onDeletePick = jest.fn().mockRejectedValue(new Error('Delete failed'));
    
    render(<PicksReview {...mockProps} onDeletePick={onDeletePick} />);

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeInTheDocument();
    });
  });

  it('should show error message when submit fails', async () => {
    const user = userEvent.setup();
    const onSubmitPicks = jest.fn().mockRejectedValue(new Error('Submit failed'));
    
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(<PicksReview {...mockProps} onSubmitPicks={onSubmitPicks} />);

    const submitButton = screen.getByText('Submit All Picks');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Submit failed')).toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });

  it('should show completion percentage', () => {
    render(<PicksReview {...mockProps} />);

    // 3 of 5 games picked = 60%
    expect(screen.getByText('60% complete')).toBeInTheDocument();
  });

  it('should handle positive spreads correctly', () => {
    const positiveSpreadSummary = {
      ...mockPicksSummary,
      picks: [
        {
          ...mockPicksSummary.picks[0],
          pick_type: 'home_spread' as const,
          spread_value: 3.5,
          game: {
            ...mockPicksSummary.picks[0].game,
            spread_home: 3.5,
            spread_away: -3.5,
          },
        },
      ],
    };

    render(<PicksReview {...mockProps} picksSummary={positiveSpreadSummary} />);

    expect(screen.getByText('Chiefs +3.5')).toBeInTheDocument();
  });
});