import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PickCard } from '../PickCard';
import { Game } from '../../../types/game';
import { Pick } from '../../../types/pick';

// Mock the spread changes utility
jest.mock('../../../lib/spreadChanges', () => ({
  calculateSpreadChange: jest.fn(),
  getSpreadChangeDisplayText: jest.fn(),
  getSpreadChangeClasses: jest.fn()
}));

import { 
  calculateSpreadChange,
  getSpreadChangeDisplayText, 
  getSpreadChangeClasses 
} from '../../../lib/spreadChanges';

const mockCalculateSpreadChange = calculateSpreadChange as jest.MockedFunction<typeof calculateSpreadChange>;
const mockGetSpreadChangeDisplayText = getSpreadChangeDisplayText as jest.MockedFunction<typeof getSpreadChangeDisplayText>;
const mockGetSpreadChangeClasses = getSpreadChangeClasses as jest.MockedFunction<typeof getSpreadChangeClasses>;

describe('PickCard', () => {
  const mockGame: Game = {
    id: 1,
    week_id: 1,
    sport: 'americanfootball_nfl',
    external_id: 'game1',
    home_team: 'Chiefs',
    away_team: 'Bills',
    commence_time: '2025-12-25T18:00:00Z', // Future date
    spread_home: -3.5,
    spread_away: 3.5,
    total_over_under: 47.5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockPick: Pick = {
    id: 1,
    user_id: 1,
    game_id: 1,
    week_id: 1,
    pick_type: 'home_spread',
    spread_value: -7.0, // Different from current spread to test spread change
    submitted: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockProps = {
    game: mockGame,
    onPickChange: jest.fn(),
    onPickDelete: jest.fn(),
    onUpdateToCurrentLine: jest.fn(),
    disabled: false,
    submitted: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    mockCalculateSpreadChange.mockReturnValue(undefined);
    mockGetSpreadChangeDisplayText.mockReturnValue('');
    mockGetSpreadChangeClasses.mockReturnValue('');
  });

  it('should render game information correctly', () => {
    render(<PickCard {...mockProps} />);

    expect(screen.getByText('NFL')).toBeInTheDocument();
    expect(screen.getByText('Bills @ Chiefs')).toBeInTheDocument();
    expect(screen.getByText('O/U: 47.5')).toBeInTheDocument();
  });

  it('should show pick options with spreads', () => {
    render(<PickCard {...mockProps} />);

    expect(screen.getByText('Chiefs -3.5')).toBeInTheDocument();
    expect(screen.getByText('Bills +3.5')).toBeInTheDocument();
    expect(screen.getByText('Make your pick:')).toBeInTheDocument();
  });

  it('should handle pick selection', async () => {
    const user = userEvent.setup();
    const onPickChange = jest.fn();
    
    render(<PickCard {...mockProps} onPickChange={onPickChange} />);

    const homeSpreadRadio = screen.getByDisplayValue('home_spread');
    await user.click(homeSpreadRadio);

    expect(onPickChange).toHaveBeenCalledWith(1, 'home_spread', -3.5);
  });

  it('should show current pick when user has made a pick', () => {
    render(<PickCard {...mockProps} currentPick={mockPick} />);

    expect(screen.getByText('Current pick:')).toBeInTheDocument();
    // Should show the pick option text that matches the pick type
    expect(screen.getAllByText('Chiefs -3.5')).toHaveLength(2); // One in options, one in current pick
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('should handle pick deletion', async () => {
    const user = userEvent.setup();
    const onPickDelete = jest.fn();
    
    render(<PickCard {...mockProps} currentPick={mockPick} onPickDelete={onPickDelete} />);

    const removeButton = screen.getByText('Remove');
    await user.click(removeButton);

    expect(onPickDelete).toHaveBeenCalledWith(1);
  });

  it('should disable picks when game has started', () => {
    const pastGame = {
      ...mockGame,
      commence_time: '2020-01-01T18:00:00Z', // Past date
    };

    render(<PickCard {...mockProps} game={pastGame} />);

    expect(screen.getByText('Started')).toBeInTheDocument();
    expect(screen.getByText('This game has already started')).toBeInTheDocument();
    
    const radioButtons = screen.getAllByRole('radio');
    radioButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('should disable picks when submitted', () => {
    render(<PickCard {...mockProps} submitted={true} />);

    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('Picks have been submitted')).toBeInTheDocument();
    
    const radioButtons = screen.getAllByRole('radio');
    radioButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('should disable picks when disabled prop is true', () => {
    render(<PickCard {...mockProps} disabled={true} />);

    expect(screen.getByText('Picking is currently disabled')).toBeInTheDocument();
    
    const radioButtons = screen.getAllByRole('radio');
    radioButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('should show no spread available when game has no spreads', () => {
    const gameWithoutSpreads = {
      ...mockGame,
      spread_home: undefined,
      spread_away: undefined,
    };

    render(<PickCard {...mockProps} game={gameWithoutSpreads} />);

    expect(screen.getByText('No spread available for this game')).toBeInTheDocument();
  });

  it('should show spread change information when available', () => {
    const mockSpreadChange = {
      hasChanged: true,
      originalSpread: -7.0,
      currentSpread: -3.5,
      isFavorable: true,
      improvementAmount: 3.5
    };

    mockCalculateSpreadChange.mockReturnValue(mockSpreadChange);
    mockGetSpreadChangeDisplayText.mockReturnValue('-7 → -3.5 (+3.5 better!)');
    mockGetSpreadChangeClasses.mockReturnValue('text-green-600 dark:text-green-400 font-medium');

    render(<PickCard {...mockProps} currentPick={mockPick} />);

    expect(screen.getByText('Line movement:')).toBeInTheDocument();
    expect(screen.getByText('-7 → -3.5 (+3.5 better!)')).toBeInTheDocument();
    expect(screen.getByText('✓ This line movement is favorable to your pick!')).toBeInTheDocument();
  });

  it('should show update to current line button when available', () => {
    const mockSpreadChange = {
      hasChanged: true,
      originalSpread: -7.0,
      currentSpread: -3.5,
      isFavorable: true,
      improvementAmount: 3.5
    };

    mockCalculateSpreadChange.mockReturnValue(mockSpreadChange);
    mockGetSpreadChangeDisplayText.mockReturnValue('-7 → -3.5 (+3.5 better!)');

    render(<PickCard {...mockProps} currentPick={mockPick} onUpdateToCurrentLine={jest.fn()} />);

    expect(screen.getByText('Update to Current Line')).toBeInTheDocument();
  });

  it('should handle update to current line button click', async () => {
    const user = userEvent.setup();
    const onUpdateToCurrentLine = jest.fn().mockResolvedValue(undefined);
    
    const mockSpreadChange = {
      hasChanged: true,
      originalSpread: -7.0,
      currentSpread: -3.5,
      isFavorable: true,
      improvementAmount: 3.5
    };

    mockCalculateSpreadChange.mockReturnValue(mockSpreadChange);

    render(<PickCard {...mockProps} currentPick={mockPick} onUpdateToCurrentLine={onUpdateToCurrentLine} />);

    const updateButton = screen.getByText('Update to Current Line');
    await user.click(updateButton);

    expect(onUpdateToCurrentLine).toHaveBeenCalledWith(1);
  });

  it('should show updating state during spread update', async () => {
    const user = userEvent.setup();
    const onUpdateToCurrentLine = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    const mockSpreadChange = {
      hasChanged: true,
      originalSpread: -7.0,
      currentSpread: -3.5,
      isFavorable: true,
      improvementAmount: 3.5
    };

    mockCalculateSpreadChange.mockReturnValue(mockSpreadChange);

    render(<PickCard {...mockProps} currentPick={mockPick} onUpdateToCurrentLine={onUpdateToCurrentLine} />);

    const updateButton = screen.getByText('Update to Current Line');
    await user.click(updateButton);

    expect(screen.getByText('Updating...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('should not show update button for unfavorable spread changes', () => {
    const mockSpreadChange = {
      hasChanged: true,
      originalSpread: -3.0,
      currentSpread: -7.0,
      isFavorable: false
    };

    mockCalculateSpreadChange.mockReturnValue(mockSpreadChange);
    mockGetSpreadChangeDisplayText.mockReturnValue('-3 → -7');

    render(<PickCard {...mockProps} currentPick={mockPick} />);

    expect(screen.queryByText('Update to Current Line')).not.toBeInTheDocument();
    expect(screen.queryByText('✓ This line movement is favorable to your pick!')).not.toBeInTheDocument();
  });

  it('should format game time correctly', () => {
    render(<PickCard {...mockProps} />);

    // Should show formatted date (format may vary by locale but should include day and date)
    expect(screen.getByText(/Dec 25/)).toBeInTheDocument();
  });

  it('should show correct sport display name', () => {
    const collegeGame = {
      ...mockGame,
      sport: 'americanfootball_ncaaf' as const,
    };

    render(<PickCard {...mockProps} game={collegeGame} />);

    expect(screen.getByText('College')).toBeInTheDocument();
  });

  it('should handle positive spreads correctly', () => {
    const gameWithPositiveHomeSpread = {
      ...mockGame,
      spread_home: 3.5,
      spread_away: -3.5,
    };

    render(<PickCard {...mockProps} game={gameWithPositiveHomeSpread} />);

    expect(screen.getByText('Chiefs +3.5')).toBeInTheDocument();
    expect(screen.getByText('Bills -3.5')).toBeInTheDocument();
  });

  it('should not show remove button when onPickDelete is not provided', () => {
    render(<PickCard {...mockProps} currentPick={mockPick} onPickDelete={undefined} />);

    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });

  it('should show correct pick selection when current pick exists', () => {
    render(<PickCard {...mockProps} currentPick={mockPick} />);

    const homeSpreadRadio = screen.getByLabelText('Chiefs -3.5') as HTMLInputElement;
    const awaySpreadRadio = screen.getByLabelText('Bills +3.5') as HTMLInputElement;

    expect(homeSpreadRadio.checked).toBe(true);
    expect(awaySpreadRadio.checked).toBe(false);
  });

  it('should prevent pick changes when cannot pick', async () => {
    const user = userEvent.setup();
    const onPickChange = jest.fn();
    
    render(<PickCard {...mockProps} onPickChange={onPickChange} disabled={true} />);

    const homeSpreadOption = screen.getByLabelText('Chiefs -3.5');
    await user.click(homeSpreadOption);

    expect(onPickChange).not.toHaveBeenCalled();
  });

  it('should prevent deletion when cannot pick', () => {
    const onPickDelete = jest.fn();
    
    render(<PickCard {...mockProps} currentPick={mockPick} onPickDelete={onPickDelete} disabled={true} />);

    // Remove button should not be visible when disabled
    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });

  it('should handle edge case with null total_over_under', () => {
    const gameWithoutTotal = {
      ...mockGame,
      total_over_under: null,
    };

    render(<PickCard {...mockProps} game={gameWithoutTotal} />);

    expect(screen.queryByText(/O\/U:/)).not.toBeInTheDocument();
  });

  it('should handle CreatePickInput type for currentPick', () => {
    const createPickInput = {
      user_id: 1,
      game_id: 1,
      week_id: 1,
      pick_type: 'away_spread' as const,
      spread_value: 3.5,
    };

    render(<PickCard {...mockProps} currentPick={createPickInput} />);

    const awaySpreadRadio = screen.getByLabelText('Bills +3.5') as HTMLInputElement;
    expect(awaySpreadRadio.checked).toBe(true);
  });

  it('should not calculate spread change for CreatePickInput without id', () => {
    const createPickInput = {
      user_id: 1,
      game_id: 1,
      week_id: 1,
      pick_type: 'away_spread' as const,
      spread_value: 3.5,
    };

    render(<PickCard {...mockProps} currentPick={createPickInput} />);

    expect(mockCalculateSpreadChange).not.toHaveBeenCalled();
    expect(screen.queryByText('Line movement:')).not.toBeInTheDocument();
  });

  it('should handle unknown sport types', () => {
    const unknownSportGame = {
      ...mockGame,
      sport: 'unknown_sport' as 'americanfootball_nfl',
    };

    render(<PickCard {...mockProps} game={unknownSportGame} />);

    expect(screen.getByText('unknown_sport')).toBeInTheDocument();
  });
});