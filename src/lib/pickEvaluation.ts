import { Pick } from '../types/pick';

export type PickResult = 'win' | 'loss' | 'push';

/**
 * Evaluate a pick based on the final game score and spread
 */
export function evaluatePick(
  pick: Pick,
  homeScore: number,
  awayScore: number,
  spreadAtTimeOfPick?: number
): PickResult {
  // Use the spread value that was recorded when the pick was made
  const spread = spreadAtTimeOfPick ?? pick.spread_value;
  
  if (spread === null || spread === undefined) {
    throw new Error('No spread value available for pick evaluation');
  }

  // Calculate the actual margin (home team perspective)
  const actualMargin = homeScore - awayScore;
  
  if (pick.pick_type === 'home_spread') {
    // User picked the home team with the spread
    // Home team needs to "cover" the spread (win by more than the spread if favorite)
    
    if (spread < 0) {
      // Home team is favored (negative spread)
      // They need to win by MORE than the absolute value of the spread
      const requiredMargin = Math.abs(spread);
      
      if (actualMargin > requiredMargin) {
        return 'win';
      } else if (actualMargin === requiredMargin) {
        return 'push';
      } else {
        return 'loss';
      }
    } else if (spread > 0) {
      // Home team is underdog (positive spread)
      // They can lose by LESS than the spread and still win the bet
      const allowedMargin = -spread; // Negative because they can lose
      
      if (actualMargin > allowedMargin) {
        return 'win';
      } else if (actualMargin === allowedMargin) {
        return 'push';
      } else {
        return 'loss';
      }
    } else {
      // spread === 0 (pick'em game)
      if (actualMargin > 0) {
        return 'win';
      } else if (actualMargin === 0) {
        return 'push';
      } else {
        return 'loss';
      }
    }
  } else {
    // User picked the away team with the spread
    // Away team needs to "cover" the spread
    
    // For away team picks, we evaluate from the away team's perspective
    // The spread value represents what the away team is laying or getting:
    // - If spread is negative, away team is laying points (favorite)
    // - If spread is positive, away team is getting points (underdog)
    
    const awayActualMargin = -actualMargin; // Away team's margin from their perspective
    
    if (spread < 0) {
      // Away team is laying points (favorite)
      // Away team must win by MORE than the absolute value of the spread
      const requiredMargin = Math.abs(spread);
      
      if (awayActualMargin > requiredMargin) {
        return 'win';
      } else if (awayActualMargin === requiredMargin) {
        return 'push';
      } else {
        return 'loss';
      }
    } else if (spread > 0) {
      // Away team is getting points (underdog)
      // Away team wins if they lose by less than the spread or win outright
      const allowedMargin = -spread; // Negative because they can lose
      
      if (awayActualMargin > allowedMargin) {
        return 'win';
      } else if (awayActualMargin === allowedMargin) {
        return 'push';
      } else {
        return 'loss';
      }
    } else {
      // spread === 0 (pick'em game)
      if (awayActualMargin > 0) {
        return 'win';
      } else if (awayActualMargin === 0) {
        return 'push';
      } else {
        return 'loss';
      }
    }
  }
}

/**
 * Evaluate all picks for a completed game
 */
export interface GamePickEvaluation {
  pickId: number;
  result: PickResult;
  actualMargin: number;
  requiredMargin?: number;
}

export function evaluateGamePicks(
  picks: Pick[],
  homeScore: number,
  awayScore: number
): GamePickEvaluation[] {
  return picks.map(pick => {
    const result = evaluatePick(pick, homeScore, awayScore);
    const actualMargin = homeScore - awayScore;
    
    // Calculate required margin for context
    let requiredMargin: number | undefined;
    const spread = pick.spread_value;
    
    if (spread !== null && spread !== undefined) {
      if (pick.pick_type === 'home_spread') {
        requiredMargin = spread < 0 ? Math.abs(spread) : -spread;
      } else {
        requiredMargin = spread > 0 ? -spread : Math.abs(spread);
      }
    }
    
    return {
      pickId: pick.id,
      result,
      actualMargin,
      requiredMargin
    };
  });
}

/**
 * Get a human-readable explanation of the pick result
 */
export function getPickResultExplanation(
  pick: Pick,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number
): string {
  const spread = pick.spread_value;
  if (spread === null || spread === undefined) {
    return 'No spread available for evaluation';
  }

  const result = evaluatePick(pick, homeScore, awayScore);
  
  const pickedTeam = pick.pick_type === 'home_spread' ? homeTeam : awayTeam;
  const spreadText = spread > 0 ? `+${spread}` : `${spread}`;
  
  let explanation = `You picked ${pickedTeam} ${spreadText}. `;
  explanation += `Final score: ${awayTeam} ${awayScore}, ${homeTeam} ${homeScore}. `;
  
  if (result === 'win') {
    explanation += `${pickedTeam} covered the spread - you won!`;
  } else if (result === 'loss') {
    explanation += `${pickedTeam} did not cover the spread - you lost.`;
  } else {
    explanation += `The margin exactly matched the spread - it's a push (tie).`;
  }
  
  return explanation;
}

/**
 * Calculate win/loss/push statistics
 */
export interface PickStatistics {
  totalPicks: number;
  wins: number;
  losses: number;
  pushes: number;
  winPercentage: number;
  triplePlayWins: number;
  triplePlayTotal: number;
}

export function calculatePickStatistics(picks: Pick[]): PickStatistics {
  const evaluatedPicks = picks.filter(pick => pick.result !== null && pick.result !== undefined);
  
  const wins = evaluatedPicks.filter(pick => pick.result === 'win').length;
  const losses = evaluatedPicks.filter(pick => pick.result === 'loss').length;
  const pushes = evaluatedPicks.filter(pick => pick.result === 'push').length;
  
  const triplePlayPicks = evaluatedPicks.filter(pick => pick.is_triple_play);
  const triplePlayWins = triplePlayPicks.filter(pick => pick.result === 'win').length;
  
  const winPercentage = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;
  
  return {
    totalPicks: evaluatedPicks.length,
    wins,
    losses,
    pushes,
    winPercentage: Math.round(winPercentage * 100) / 100,
    triplePlayWins,
    triplePlayTotal: triplePlayPicks.length
  };
}