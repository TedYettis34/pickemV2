import { render, screen } from '@testing-library/react';
import { PickStatistics } from '../PickStatistics';
import { Pick } from '../../../types/pick';

describe('PickStatistics', () => {
  const basePick: Pick = {
    id: 1,
    user_id: 'test-user',
    game_id: 1,
    pick_type: 'home_spread',
    spread_value: -3,
    submitted: true,
    is_triple_play: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  test('should render no picks message when picks array is empty', () => {
    render(<PickStatistics picks={[]} />);
    
    expect(screen.getByText('Your Pick Statistics')).toBeInTheDocument();
    expect(screen.getByText('No completed picks to display')).toBeInTheDocument();
  });

  test('should render no picks message when all picks have no results', () => {
    const picksWithoutResults = [
      { ...basePick, id: 1, result: null },
      { ...basePick, id: 2, result: null }
    ];
    
    render(<PickStatistics picks={picksWithoutResults} />);
    
    expect(screen.getByText('No completed picks to display')).toBeInTheDocument();
  });

  test('should render statistics for picks with results', () => {
    const picksWithResults = [
      { ...basePick, id: 1, result: 'win' as const, is_triple_play: false },
      { ...basePick, id: 2, result: 'loss' as const, is_triple_play: false },
      { ...basePick, id: 3, result: 'push' as const, is_triple_play: false },
      { ...basePick, id: 4, result: 'win' as const, is_triple_play: true },
    ];
    
    render(<PickStatistics picks={picksWithResults} />);
    
    // Check title
    expect(screen.getByText('Your Pick Statistics')).toBeInTheDocument();
    
    // Check basic statistics
    expect(screen.getByText('4')).toBeInTheDocument(); // Total Picks
    expect(screen.getByText('Total Picks')).toBeInTheDocument();
    
    expect(screen.getByText('2')).toBeInTheDocument(); // Wins
    expect(screen.getByText('Wins')).toBeInTheDocument();
    
    // Use more specific selectors for duplicate values
    const lossesSection = screen.getByText('Losses').parentElement;
    expect(lossesSection).toHaveTextContent('1');
    expect(lossesSection).toHaveTextContent('Losses');
    
    const pushesSection = screen.getByText('Pushes').parentElement;
    expect(pushesSection).toHaveTextContent('1');
    expect(pushesSection).toHaveTextContent('Pushes');
    
    // Check win percentage (2 wins out of 3 decided picks = 66.67%)
    expect(screen.getByText(/66\.67%/)).toBeInTheDocument();
    expect(screen.getByText('Win Percentage')).toBeInTheDocument();
    
    // Check record display
    expect(screen.getByText('Record: 2-1-1')).toBeInTheDocument();
  });

  test('should display record without pushes when no pushes exist', () => {
    const picksWithoutPushes = [
      { ...basePick, id: 1, result: 'win' as const },
      { ...basePick, id: 2, result: 'loss' as const },
      { ...basePick, id: 3, result: 'win' as const },
    ];
    
    render(<PickStatistics picks={picksWithoutPushes} />);
    
    expect(screen.getByText('Record: 2-1')).toBeInTheDocument();
  });

  test('should show triple play statistics when triple play picks exist', () => {
    const picksWithTriplePlay = [
      { ...basePick, id: 1, result: 'win' as const, is_triple_play: true },
      { ...basePick, id: 2, result: 'loss' as const, is_triple_play: true },
      { ...basePick, id: 3, result: 'win' as const, is_triple_play: true },
      { ...basePick, id: 4, result: 'win' as const, is_triple_play: false },
    ];
    
    render(<PickStatistics picks={picksWithTriplePlay} />);
    
    expect(screen.getByText('Triple Play')).toBeInTheDocument();
    expect(screen.getByText('Results')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument(); // 2 wins out of 3 triple plays
    expect(screen.getByText('(67%)')).toBeInTheDocument(); // Triple play percentage
  });

  test('should not show triple play section when showTriplePlay is false', () => {
    const picksWithTriplePlay = [
      { ...basePick, id: 1, result: 'win' as const, is_triple_play: true },
      { ...basePick, id: 2, result: 'loss' as const, is_triple_play: true },
    ];
    
    render(<PickStatistics picks={picksWithTriplePlay} showTriplePlay={false} />);
    
    expect(screen.queryByText('Triple Play')).not.toBeInTheDocument();
  });

  test('should not show triple play section when no triple play picks exist', () => {
    const picksWithoutTriplePlay = [
      { ...basePick, id: 1, result: 'win' as const, is_triple_play: false },
      { ...basePick, id: 2, result: 'loss' as const, is_triple_play: false },
    ];
    
    render(<PickStatistics picks={picksWithoutTriplePlay} />);
    
    expect(screen.queryByText('Triple Play')).not.toBeInTheDocument();
  });

  test('should use custom title when provided', () => {
    const customTitle = 'Weekly Statistics';
    
    render(<PickStatistics picks={[]} title={customTitle} />);
    
    expect(screen.getByText(customTitle)).toBeInTheDocument();
    expect(screen.queryByText('Your Pick Statistics')).not.toBeInTheDocument();
  });

  test('should handle 100% win percentage correctly', () => {
    const allWins = [
      { ...basePick, id: 1, result: 'win' as const },
      { ...basePick, id: 2, result: 'win' as const },
      { ...basePick, id: 3, result: 'win' as const },
    ];
    
    render(<PickStatistics picks={allWins} />);
    
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Record: 3-0')).toBeInTheDocument();
  });

  test('should handle 0% win percentage correctly', () => {
    const allLosses = [
      { ...basePick, id: 1, result: 'loss' as const },
      { ...basePick, id: 2, result: 'loss' as const },
      { ...basePick, id: 3, result: 'push' as const }, // Pushes don't count toward win percentage
    ];
    
    render(<PickStatistics picks={allLosses} />);
    
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('Record: 0-2-1')).toBeInTheDocument();
  });

  test('should handle only pushes correctly', () => {
    const onlyPushes = [
      { ...basePick, id: 1, result: 'push' as const },
      { ...basePick, id: 2, result: 'push' as const },
    ];
    
    render(<PickStatistics picks={onlyPushes} />);
    
    expect(screen.getByText('0%')).toBeInTheDocument(); // No decided games
    expect(screen.getByText('Record: 0-0-2')).toBeInTheDocument();
    
    // Check specific sections for clarity since there are multiple 0s and 2s
    const totalSection = screen.getByText('Total Picks').parentElement;
    expect(totalSection).toHaveTextContent('2');
    expect(totalSection).toHaveTextContent('Total Picks');
    
    const winsSection = screen.getByText('Wins').parentElement;
    expect(winsSection).toHaveTextContent('0');
    expect(winsSection).toHaveTextContent('Wins');
    
    const lossesSection = screen.getByText('Losses').parentElement;
    expect(lossesSection).toHaveTextContent('0');
    expect(lossesSection).toHaveTextContent('Losses');
    
    const pushesSection = screen.getByText('Pushes').parentElement;
    expect(pushesSection).toHaveTextContent('2');
    expect(pushesSection).toHaveTextContent('Pushes');
  });

  test('should calculate triple play percentage correctly with perfect record', () => {
    const perfectTriplePlay = [
      { ...basePick, id: 1, result: 'win' as const, is_triple_play: true },
      { ...basePick, id: 2, result: 'win' as const, is_triple_play: true },
      { ...basePick, id: 3, result: 'win' as const, is_triple_play: true },
    ];
    
    render(<PickStatistics picks={perfectTriplePlay} />);
    
    expect(screen.getByText('3/3')).toBeInTheDocument();
    expect(screen.getByText('(100%)')).toBeInTheDocument();
  });

  test('should calculate triple play percentage correctly with no wins', () => {
    const noTriplePlayWins = [
      { ...basePick, id: 1, result: 'loss' as const, is_triple_play: true },
      { ...basePick, id: 2, result: 'loss' as const, is_triple_play: true },
    ];
    
    render(<PickStatistics picks={noTriplePlayWins} />);
    
    expect(screen.getByText('0/2')).toBeInTheDocument();
    expect(screen.getByText('(0%)')).toBeInTheDocument();
  });

  test('should round triple play percentage to nearest whole number', () => {
    const partialTriplePlayWins = [
      { ...basePick, id: 1, result: 'win' as const, is_triple_play: true },
      { ...basePick, id: 2, result: 'loss' as const, is_triple_play: true },
      { ...basePick, id: 3, result: 'loss' as const, is_triple_play: true },
      { ...basePick, id: 4, result: 'loss' as const, is_triple_play: true },
      { ...basePick, id: 5, result: 'loss' as const, is_triple_play: true },
      { ...basePick, id: 6, result: 'loss' as const, is_triple_play: true }, // 1/6 = 16.666...%
    ];
    
    render(<PickStatistics picks={partialTriplePlayWins} />);
    
    expect(screen.getByText('1/6')).toBeInTheDocument();
    expect(screen.getByText('(17%)')).toBeInTheDocument(); // Should round 16.67% to 17%
  });

  test('should handle mixed pick types and results correctly', () => {
    const mixedPicks = [
      { ...basePick, id: 1, result: 'win' as const, is_triple_play: false },
      { ...basePick, id: 2, result: 'loss' as const, is_triple_play: true },
      { ...basePick, id: 3, result: 'push' as const, is_triple_play: false },
      { ...basePick, id: 4, result: 'win' as const, is_triple_play: true },
      { ...basePick, id: 5, result: null, is_triple_play: false }, // Should be ignored
    ];
    
    render(<PickStatistics picks={mixedPicks} />);
    
    // Should only count picks with results (4 picks)
    const totalSection = screen.getByText('Total Picks').parentElement;
    expect(totalSection).toHaveTextContent('4');
    expect(totalSection).toHaveTextContent('Total Picks');
    
    const winsSection = screen.getByText('Wins').parentElement;
    expect(winsSection).toHaveTextContent('2');
    expect(winsSection).toHaveTextContent('Wins');
    
    const lossesSection = screen.getByText('Losses').parentElement;
    expect(lossesSection).toHaveTextContent('1');
    expect(lossesSection).toHaveTextContent('Losses');
    
    const pushesSection = screen.getByText('Pushes').parentElement;
    expect(pushesSection).toHaveTextContent('1');
    expect(pushesSection).toHaveTextContent('Pushes');
    expect(screen.getByText(/66\.67%/)).toBeInTheDocument(); // Win percentage (2/3 decided)
    expect(screen.getByText('Record: 2-1-1')).toBeInTheDocument();
    
    // Triple play stats: 1 win out of 2 triple plays
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('(50%)')).toBeInTheDocument();
  });
});