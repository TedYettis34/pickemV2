import { render, screen } from '@testing-library/react';
import { PicksReview } from '../PicksReview';
import { PicksSummary } from '../../../types/pick';

describe('PicksReview - Color Logic', () => {
  const mockOnSubmitPicks = jest.fn();

  it('should show orange background for started games without results', () => {
    const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
    
    const picksSummary: PicksSummary = {
      weekId: 1,
      weekName: 'Week 1',
      totalGames: 1,
      totalPicks: 1,
      submittedAt: '2024-01-01T12:00:00Z',
      cutoffTime: null,
      picks: [
        {
          id: 1,
          user_id: 'user123',
          game_id: 1,
          pick_type: 'home_spread',
          spread_value: -3.5,
          submitted: true,
          is_triple_play: false,
          result: null, // No result yet
          evaluated_at: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          game: {
            id: 1,
            week_id: 1,
            sport: 'americanfootball_nfl',
            external_id: 'game1',
            home_team: 'Chiefs',
            away_team: 'Bills',
            commence_time: pastTime, // Game has started
            spread_home: -3.5,
            spread_away: 3.5,
            total_over_under: 47.5,
            moneyline_home: -150,
            moneyline_away: 130,
            bookmaker: 'FanDuel',
            odds_last_updated: '2024-01-01T12:00:00Z',
            must_pick: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      ],
    };

    render(
      <PicksReview
        picksSummary={picksSummary}
        onSubmitPicks={mockOnSubmitPicks}
      />
    );

    // Find the pick container - need to go up to the outer container div
    const pickText = screen.getByText('Chiefs -3.5');
    const pickContainer = pickText.closest('[class*="bg-orange-50"]') || 
                         pickText.closest('[class*="rounded-lg"]');
    
    // Should have orange background classes for started game without result
    expect(pickContainer).toHaveClass('bg-orange-50');
    expect(pickContainer).toHaveClass('border-orange-200');
  });

  it('should show red background for games with loss result', () => {
    const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
    
    const picksSummary: PicksSummary = {
      weekId: 1,
      weekName: 'Week 1', 
      totalGames: 1,
      totalPicks: 1,
      submittedAt: '2024-01-01T12:00:00Z',
      cutoffTime: null,
      picks: [
        {
          id: 1,
          user_id: 'user123',
          game_id: 1,
          pick_type: 'home_spread',
          spread_value: -3.5,
          submitted: true,
          is_triple_play: false,
          result: 'loss', // Has result
          evaluated_at: '2024-01-01T20:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          game: {
            id: 1,
            week_id: 1,
            sport: 'americanfootball_nfl',
            external_id: 'game1',
            home_team: 'Chiefs',
            away_team: 'Bills',
            commence_time: pastTime, // Game has started
            spread_home: -3.5,
            spread_away: 3.5,
            total_over_under: 47.5,
            moneyline_home: -150,
            moneyline_away: 130,
            bookmaker: 'FanDuel',
            odds_last_updated: '2024-01-01T12:00:00Z',
            must_pick: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      ],
    };

    render(
      <PicksReview
        picksSummary={picksSummary}
        onSubmitPicks={mockOnSubmitPicks}
      />
    );

    // Find the pick container - need to go up to the outer container div
    const pickText = screen.getByText('Chiefs -3.5');
    const pickContainer = pickText.closest('[class*="bg-red-50"]') || 
                         pickText.closest('[class*="rounded-lg"]');
    
    // Should have red background classes for loss result
    expect(pickContainer).toHaveClass('bg-red-50');
    expect(pickContainer).toHaveClass('border-red-200');
  });

  it('should show green background for games with win result', () => {
    const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
    
    const picksSummary: PicksSummary = {
      weekId: 1,
      weekName: 'Week 1',
      totalGames: 1,
      totalPicks: 1,
      submittedAt: '2024-01-01T12:00:00Z',
      cutoffTime: null,
      picks: [
        {
          id: 1,
          user_id: 'user123',
          game_id: 1,
          pick_type: 'home_spread',
          spread_value: -3.5,
          submitted: true,
          is_triple_play: false,
          result: 'win', // Has result
          evaluated_at: '2024-01-01T20:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          game: {
            id: 1,
            week_id: 1,
            sport: 'americanfootball_nfl',
            external_id: 'game1',
            home_team: 'Chiefs',
            away_team: 'Bills',
            commence_time: pastTime, // Game has started
            spread_home: -3.5,
            spread_away: 3.5,
            total_over_under: 47.5,
            moneyline_home: -150,
            moneyline_away: 130,
            bookmaker: 'FanDuel',
            odds_last_updated: '2024-01-01T12:00:00Z',
            must_pick: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      ],
    };

    render(
      <PicksReview
        picksSummary={picksSummary}
        onSubmitPicks={mockOnSubmitPicks}
      />
    );

    // Find the pick container - need to go up to the outer container div
    const pickText = screen.getByText('Chiefs -3.5');
    const pickContainer = pickText.closest('[class*="bg-green-50"]') || 
                         pickText.closest('[class*="rounded-lg"]');
    
    // Should have green background classes for win result
    expect(pickContainer).toHaveClass('bg-green-50');
    expect(pickContainer).toHaveClass('border-green-200');
  });

  it('should show gray background for games that have not started', () => {
    const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now
    
    const picksSummary: PicksSummary = {
      weekId: 1,
      weekName: 'Week 1',
      totalGames: 1,
      totalPicks: 1,
      submittedAt: null, // Not submitted
      cutoffTime: null,
      picks: [
        {
          id: 1,
          user_id: 'user123',
          game_id: 1,
          pick_type: 'home_spread',
          spread_value: -3.5,
          submitted: false,
          is_triple_play: false,
          result: null,
          evaluated_at: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          game: {
            id: 1,
            week_id: 1,
            sport: 'americanfootball_nfl',
            external_id: 'game1',
            home_team: 'Chiefs',
            away_team: 'Bills',
            commence_time: futureTime, // Game has not started
            spread_home: -3.5,
            spread_away: 3.5,
            total_over_under: 47.5,
            moneyline_home: -150,
            moneyline_away: 130,
            bookmaker: 'FanDuel',
            odds_last_updated: '2024-01-01T12:00:00Z',
            must_pick: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      ],
    };

    render(
      <PicksReview
        picksSummary={picksSummary}
        onSubmitPicks={mockOnSubmitPicks}
      />
    );

    // Find the pick container - need to go up to the outer container div
    const pickText = screen.getByText('Chiefs -3.5');
    const pickContainer = pickText.closest('[class*="bg-gray-50"]') || 
                         pickText.closest('[class*="rounded-lg"]');
    
    // Should have gray background classes for unstarted game
    expect(pickContainer).toHaveClass('bg-gray-50');
  });
});