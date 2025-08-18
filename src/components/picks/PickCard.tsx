'use client';

// No useState needed for local picks
import { Game } from '../../types/game';
import { Pick, PickOption, CreatePickInput } from '../../types/pick';

interface PickCardProps {
  game: Game;
  currentPick?: Pick | CreatePickInput;
  onPickChange: (gameId: number, pickType: 'home_spread' | 'away_spread', spreadValue: number | null) => void;
  onPickDelete?: (gameId: number) => void;
  disabled?: boolean;
  submitted?: boolean;
}

export function PickCard({ 
  game, 
  currentPick, 
  onPickChange, 
  onPickDelete,
  disabled = false,
  submitted = false 
}: PickCardProps) {
  // No loading or error state needed for local picks

  // Check if game has started
  const gameStartTime = new Date(game.commence_time);
  const now = new Date();
  const gameStarted = gameStartTime <= now;

  // Determine if picks can be made
  const canPick = !disabled && !submitted && !gameStarted;

  // Generate pick options
  const getPickOptions = (): PickOption[] => {
    const options: PickOption[] = [];

    // Home spread option
    if (game.spread_home !== undefined && game.spread_home !== null) {
      const spreadText = game.spread_home > 0 ? `+${game.spread_home}` : `${game.spread_home}`;
      options.push({
        type: 'home_spread',
        team: game.home_team,
        spread: game.spread_home,
        displayText: `${game.home_team} ${spreadText}`,
      });
    }

    // Away spread option (opposite of home spread)
    if (game.spread_home !== undefined && game.spread_home !== null) {
      const awaySpread = -game.spread_home;
      const spreadText = awaySpread > 0 ? `+${awaySpread}` : `${awaySpread}`;
      options.push({
        type: 'away_spread',
        team: game.away_team,
        spread: awaySpread,
        displayText: `${game.away_team} ${spreadText}`,
      });
    }

    return options;
  };

  const pickOptions = getPickOptions();

  const handlePickChange = (pickType: 'home_spread' | 'away_spread', spreadValue: number | null) => {
    if (!canPick) return;
    onPickChange(game.id, pickType, spreadValue);
  };

  const handleDeletePick = () => {
    if (!onPickDelete || !currentPick || !canPick) return;
    onPickDelete(game.id);
  };

  const formatGameTime = (commenceTime: string) => {
    const date = new Date(commenceTime);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getSportDisplayName = (sport: string) => {
    switch (sport) {
      case 'americanfootball_nfl':
        return 'NFL';
      case 'americanfootball_ncaaf':
        return 'College';
      default:
        return sport;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
      {/* Game Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
            {getSportDisplayName(game.sport)}
          </span>
          {gameStarted && (
            <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900 px-2 py-1 rounded">
              Started
            </span>
          )}
          {submitted && (
            <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
              Submitted
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {formatGameTime(game.commence_time)}
        </div>
      </div>

      {/* Game Matchup */}
      <div className="text-center mb-4">
        <div className="text-lg font-semibold text-gray-900 dark:text-white">
          {game.away_team} @ {game.home_team}
        </div>
        {game.total_over_under && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            O/U: {game.total_over_under}
          </div>
        )}
      </div>

      {/* No error display needed for local picks */}

      {/* Pick Options */}
      {pickOptions.length > 0 ? (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Make your pick:
          </div>
          
          {pickOptions.map((option) => (
            <label
              key={option.type}
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                canPick
                  ? 'hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600'
                  : 'cursor-not-allowed opacity-50 border-gray-200 dark:border-gray-600'
              } ${
                currentPick?.pick_type === option.type
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
                  : ''
              }`}
            >
              <input
                type="radio"
                name={`pick-${game.id}`}
                value={option.type}
                checked={currentPick?.pick_type === option.type}
                onChange={() => handlePickChange(option.type, option.spread)}
                disabled={!canPick}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                {option.displayText}
              </span>
            </label>
          ))}

          {/* Current Pick Status */}
          {currentPick && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="flex justify-between items-center">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <span className="font-medium">Current pick:</span>{' '}
                  {pickOptions.find(opt => opt.type === currentPick.pick_type)?.displayText}
                </div>
                {canPick && onPickDelete && (
                  <button
                    onClick={handleDeletePick}
                    disabled={!canPick}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          <div className="text-sm">No spread available for this game</div>
        </div>
      )}

      {/* No loading state needed for local picks */}

      {/* Game Status Messages */}
      {!canPick && (
        <div className="mt-3 text-center">
          {gameStarted && (
            <div className="text-sm text-red-600 dark:text-red-400">
              This game has already started
            </div>
          )}
          {submitted && !gameStarted && (
            <div className="text-sm text-green-600 dark:text-green-400">
              Picks have been submitted
            </div>
          )}
          {disabled && !gameStarted && !submitted && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Picking is currently disabled
            </div>
          )}
        </div>
      )}
    </div>
  );
}