import { Game } from './game';

export interface Pick {
  id: number;
  user_id: string; // Cognito user ID
  game_id: number;
  pick_type: 'home_spread' | 'away_spread';
  spread_value: number | null; // The spread value at time of pick
  submitted: boolean;
  is_triple_play: boolean; // Indicates if this pick is marked as a triple play
  created_at: string;
  updated_at: string;
}

export interface CreatePickInput {
  game_id: number;
  pick_type: 'home_spread' | 'away_spread';
  spread_value: number | null;
  is_triple_play?: boolean; // Optional, defaults to false
}

export interface UpdatePickInput {
  pick_type: 'home_spread' | 'away_spread';
  spread_value: number | null;
  is_triple_play?: boolean; // Optional, can be updated
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

// Spread change information
export interface SpreadChange {
  hasChanged: boolean;
  originalSpread: number;
  currentSpread: number;
  isFavorable: boolean; // True if the change is better for the user's pick
  improvementAmount?: number; // How much better the spread is (positive number)
}

// Enhanced pick with spread change info
export interface PickWithSpreadChange extends PickWithGame {
  spreadChange?: SpreadChange;
  canUpdateToCurrentLine: boolean;
}