export interface Game {
  id: number;
  week_id: number;
  sport: 'americanfootball_nfl' | 'americanfootball_ncaaf';
  external_id: string;
  home_team: string;
  away_team: string;
  commence_time: string; // ISO string
  
  // Betting lines (optional)
  spread_home?: number;
  spread_away?: number;
  total_over_under?: number;
  moneyline_home?: number;
  moneyline_away?: number;
  
  // Metadata
  bookmaker?: string;
  odds_last_updated?: string;
  must_pick: boolean; // Whether this game is designated as a "must pick"
  
  // Game results
  home_score?: number | null;
  away_score?: number | null;
  game_status: 'scheduled' | 'in_progress' | 'final' | 'cancelled' | 'postponed';
  
  // System fields
  created_at: string;
  updated_at: string;
}

// Type for creating a new game
export interface CreateGameInput {
  week_id: number;
  sport: 'americanfootball_nfl' | 'americanfootball_ncaaf';
  external_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  spread_home?: number;
  spread_away?: number;
  total_over_under?: number;
  moneyline_home?: number;
  moneyline_away?: number;
  bookmaker?: string;
  odds_last_updated?: string;
  must_pick?: boolean;
  home_score?: number | null;
  away_score?: number | null;
  game_status?: 'scheduled' | 'in_progress' | 'final' | 'cancelled' | 'postponed';
}

// Response from The Odds API
export interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: Array<{
    key: string;
    title: string;
    last_update: string;
    markets: Array<{
      key: string; // 'h2h', 'spreads', 'totals'
      last_update: string;
      outcomes: Array<{
        name: string;
        price: number;
        point?: number;
      }>;
    }>;
  }>;
}

// Response from The Odds API scores endpoint
export interface OddsApiScore {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  completed: boolean;
  scores?: Array<{
    name: string;
    score: string;
  }> | null;
  last_update?: string;
}

// Sports configuration
export const SUPPORTED_SPORTS = {
  NFL: 'americanfootball_nfl',
  COLLEGE: 'americanfootball_ncaaf'
} as const;

export type SupportedSport = typeof SUPPORTED_SPORTS[keyof typeof SUPPORTED_SPORTS];