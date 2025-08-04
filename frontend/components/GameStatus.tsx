import { useState, useEffect } from "react";
import { AccountAddress } from "@aptos-labs/ts-sdk";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Play, SkipForward, Clock } from "lucide-react";
import { calculateCurrentScores } from "@/utils/gameLogic";

interface GameStatusProps {
  gameState: {
    creator: AccountAddress;
    started: boolean;
    finished: boolean;
    currentRound: number;
    team0Score: number;
    team1Score: number;
    targetScore: number;
    team0Name: string;
    team1Name: string;
  };
  roundState: {
    startTime: number;
    durationSeconds: number;
    finished: boolean;
    team0Guessed: boolean;
    team1Guessed: boolean;
    team0GuessTime: number | null;
    team1GuessTime: number | null;
  } | null;
  userTeam: number | null;
  isCurrentArtist: boolean;
  onStartGame: () => void;
  onNextRound: () => void;
}

export function GameStatus({
  gameState,
  roundState,
  userTeam,
  isCurrentArtist,
  onStartGame,
  onNextRound,
}: GameStatusProps) {
  const account = useAuthStore(state => state.activeAccount);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const currentScores = calculateCurrentScores(gameState, roundState);

  // Update timer
  useEffect(() => {
    if (!gameState.started || !roundState || roundState.finished) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now() / 1000;
      const elapsed = now - roundState.startTime;
      const remaining = Math.max(0, roundState.durationSeconds - elapsed);
      setTimeLeft(Math.ceil(remaining));

      if (remaining <= 0) {
        setTimeLeft(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [roundState]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusMessage = (): string => {
    if (!gameState.started) {
      return "Waiting for game to start...";
    }

    // Check if game is actually over based on calculated scores
    if (gameState.finished || currentScores.gameOver) {
      const winnerName = currentScores.winner === 0 ? gameState.team0Name : gameState.team1Name;
      return `🎉 Game Over! ${winnerName} wins!`;
    }

    if (!roundState) {
      return "Loading round...";
    }

    if (roundState.finished) {
      return "Round finished - waiting for next round";
    }

    if (userTeam === null) {
      return "You're spectating this game";
    }

    if (isCurrentArtist) {
      return "It's your turn to draw!";
    }

    return "Guess what's being drawn!";
  };

  const canStartGame = account && gameState.creator.toString() === account.accountAddress.toString() && !gameState.started;
  const canStartNextRound = userTeam !== null && roundState?.finished && !gameState.finished && !currentScores.gameOver;

  return (
    <div className="bg-white border-b p-4">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between">
        {/* Status Info */}
        <div className="flex items-center space-x-6">
          <div>
            <h2 className="text-lg font-semibold">{getStatusMessage()}</h2>
            {roundState && !roundState.finished && (
              <p className="text-sm text-gray-600">
                Round {gameState.currentRound} in progress
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {canStartGame && (
            <Button onClick={onStartGame} className="flex items-center gap-2">
              <Play size={16} />
              Start Game
            </Button>
          )}

          {canStartNextRound && (
            <Button onClick={onNextRound} className="flex items-center gap-2">
              <SkipForward size={16} />
              Next Round
            </Button>
          )}

          {/* Timer */}
          {gameState.started && timeLeft !== null && !gameState.finished && !currentScores.gameOver && (
            <div className="flex items-center space-x-2">
              <Clock size={20} className={timeLeft <= 10 ? "text-red-500" : "text-gray-500"} />
              <span
                className={`text-xl font-mono font-bold ${
                  timeLeft <= 10 ? "text-red-500" : "text-gray-700"
                }`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}