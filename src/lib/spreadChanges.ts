import { PickWithGame, SpreadChange, PickWithSpreadChange } from '../types/pick';

/**
 * Calculate spread change information for a pick
 */
export function calculateSpreadChange(pick: PickWithGame): SpreadChange | undefined {
  const { pick_type, spread_value, game } = pick;
  
  if (spread_value === null || spread_value === undefined) {
    return undefined;
  }

  // Get current spread for the pick type
  let currentSpread: number | null = null;
  if (pick_type === 'home_spread') {
    currentSpread = game.spread_home ?? null;
  } else if (pick_type === 'away_spread') {
    currentSpread = game.spread_away ?? null;
  }

  if (currentSpread === null || currentSpread === undefined) {
    return undefined;
  }

  const hasChanged = Math.abs(spread_value - currentSpread) > 0.001; // Account for floating point precision
  
  if (!hasChanged) {
    return {
      hasChanged: false,
      originalSpread: spread_value,
      currentSpread: currentSpread,
      isFavorable: false
    };
  }

  // Determine if the change is favorable
  // For spread betting, a more favorable spread is one that's easier to cover
  // For home team: spread moving toward 0 (less negative) or becoming positive is favorable
  // For away team: spread moving away from 0 (more positive) is favorable
  let isFavorable = false;
  let improvementAmount = 0;

  if (pick_type === 'home_spread') {
    // Home team spread: improvement means spread gets less negative (closer to 0) or becomes positive
    // Example: -7 -> -3.5 is good (3.5 point improvement)
    // Example: -3 -> +1 is good (4 point improvement)
    const improvement = currentSpread - spread_value;
    isFavorable = improvement > 0;
    improvementAmount = improvement;
  } else {
    // Away team spread: improvement means spread gets more positive
    // Example: +7 -> +10.5 is good (3.5 point improvement)
    // Example: +3 -> +7 is good (4 point improvement)
    const improvement = currentSpread - spread_value;
    isFavorable = improvement > 0;
    improvementAmount = improvement;
  }

  return {
    hasChanged: true,
    originalSpread: spread_value,
    currentSpread: currentSpread,
    isFavorable,
    improvementAmount: isFavorable ? improvementAmount : undefined
  };
}

/**
 * Enhance picks with spread change information
 */
export function enhancePicksWithSpreadChanges(picks: PickWithGame[]): PickWithSpreadChange[] {
  return picks.map(pick => {
    const spreadChange = calculateSpreadChange(pick);
    
    // Can update to current line if:
    // 1. Pick is not submitted
    // 2. Game hasn't started
    // 3. Spread has changed favorably
    const gameStartTime = new Date(pick.game.commence_time);
    const now = new Date();
    const gameStarted = gameStartTime <= now;
    
    const canUpdateToCurrentLine = 
      !pick.submitted && 
      !gameStarted && 
      spreadChange?.hasChanged === true && 
      spreadChange?.isFavorable === true;

    return {
      ...pick,
      spreadChange,
      canUpdateToCurrentLine
    };
  });
}

/**
 * Get display text for spread change
 */
export function getSpreadChangeDisplayText(spreadChange: SpreadChange): string {
  const { originalSpread, currentSpread, isFavorable, improvementAmount } = spreadChange;
  
  const originalText = originalSpread > 0 ? `+${originalSpread}` : `${originalSpread}`;
  const currentText = currentSpread > 0 ? `+${currentSpread}` : `${currentSpread}`;
  
  if (isFavorable && improvementAmount) {
    return `${originalText} → ${currentText} (+${improvementAmount.toFixed(1)} better!)`;
  } else {
    return `${originalText} → ${currentText}`;
  }
}

/**
 * Get CSS classes for spread change indication
 */
export function getSpreadChangeClasses(spreadChange: SpreadChange | undefined): string {
  if (!spreadChange?.hasChanged) {
    return '';
  }
  
  if (spreadChange.isFavorable) {
    return 'text-green-600 dark:text-green-400 font-medium';
  } else {
    return 'text-orange-600 dark:text-orange-400';
  }
}