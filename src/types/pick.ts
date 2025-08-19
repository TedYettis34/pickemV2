import { Game } from './game';

export interface Pick {
  id: number;
  user_id: string; // Cognito user ID
  game_id: number;
  pick_type: 'home_spread' | 'away_spread';
  spread_value: number | null; // The spread value at time of pick
  submitted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePickInput {
  game_id: number;
  pick_type: 'home_spread' | 'away_spread';
  spread_value: number | null;
}

export interface UpdatePickInput {
  pick_type: 'home_spread' | 'away_spread';
  spread_value: number | null;
}

// Pick with associated game data for display
export interface PickWithGame extends Pick {
  game: Game;
}

// Summary for picks review
export interface PicksSummary {
  weekId: number;
  weekName: string;
  picks: PickWithGame[];
  totalPicks: number;
  totalGames: number;
  submittedAt?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pick validation result
export interface PickValidation {
  isValid: boolean;
  error?: string;
  conflictingPick?: Pick;
}

// Pick display helpers
export interface PickOption {
  type: 'home_spread' | 'away_spread';
  team: string;
  spread: number | null;
  displayText: string;
}

export interface GamePickState {
  gameId: number;
  currentPick?: Pick;
  options: PickOption[];
  canPick: boolean; // Based on game start time and submission status
  conflictsWithExisting: boolean;
}