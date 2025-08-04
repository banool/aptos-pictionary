/**
 * Game logic utilities for calculating scores and game state
 */

interface GameState {
  team0Score: number;
  team1Score: number;
  targetScore: number;
  started: boolean;
  finished: boolean;
}

interface RoundState {
  startTime: number;
  durationSeconds: number;
  finished: boolean;
  team0Guessed: boolean;
  team1Guessed: boolean;
  team0GuessTime: number | null;
  team1GuessTime: number | null;
}

export interface CalculatedScores {
  team0Score: number;
  team1Score: number;
  gameOver: boolean;
  winner: number | null;
}

/**
 * Calculate current scores including points from unprocessed rounds
 * This handles the case where teams have guessed correctly but the round hasn't been processed on-chain yet
 */
export function calculateCurrentScores(gameState: GameState, roundState: RoundState | null): CalculatedScores {
  let team0Score = gameState.team0Score; // Start with processed scores from contract
  let team1Score = gameState.team1Score;

  // Add points from current unprocessed round if applicable
  if (roundState && gameState.started && !gameState.finished) {
    // Check if current round has ended but might not be processed yet
    const currentTime = Date.now() / 1000;
    const roundEndTime = roundState.startTime + roundState.durationSeconds;
    const roundTimeExpired = currentTime > roundEndTime;
    const bothTeamsGuessed = roundState.team0Guessed && roundState.team1Guessed;

    // If round should be finished (time expired or both guessed), calculate potential points
    if (roundTimeExpired || bothTeamsGuessed || roundState.finished) {
      if (roundState.team0Guessed && roundState.team1Guessed) {
        // Both teams guessed - first gets 2 points, second gets 1
        if (roundState.team0GuessTime !== null && roundState.team1GuessTime !== null) {
          if (roundState.team0GuessTime <= roundState.team1GuessTime) {
            team0Score += 2;
            team1Score += 1;
          } else {
            team0Score += 1;
            team1Score += 2;
          }
        }
      } else if (roundState.team0Guessed) {
        team0Score += 2;
      } else if (roundState.team1Guessed) {
        team1Score += 2;
      }
    }
  }

  // Determine if game is over and who won
  const gameOver = gameState.finished || team0Score >= gameState.targetScore || team1Score >= gameState.targetScore;
  let winner: number | null = null;
  if (gameOver) {
    winner = team0Score >= team1Score ? 0 : 1;
  }

  return { team0Score, team1Score, gameOver, winner };
}
