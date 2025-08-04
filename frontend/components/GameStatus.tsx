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

  const getStatusMessage = (): { text: string; emoji: string; color: string } => {
    if (!gameState.started) {
      return { 
        text: "Preparing art studio!", 
        emoji: "⚡", 
        color: "studio-purple" 
      };
    }

    // Check if game is actually over based on calculated scores
    if (gameState.finished || currentScores.gameOver) {
      const winnerName = currentScores.winner === 0 ? gameState.team0Name : gameState.team1Name;
      return { 
        text: `${winnerName} are the art champions!`, 
        emoji: "🏆", 
        color: "studio-yellow" 
      };
    }

    if (!roundState) {
      return { 
        text: "Preparing the canvas...", 
        emoji: "✨", 
        color: "studio-blue" 
      };
    }

    if (roundState.finished) {
      return { 
        text: "Round complete! Time for the next masterpiece!", 
        emoji: "🎨", 
        color: "studio-green" 
      };
    }

    if (userTeam === null) {
      return { 
        text: "You're enjoying the art show!", 
        emoji: "👁️", 
        color: "studio-purple" 
      };
    }

    if (isCurrentArtist) {
      return { 
        text: "You're the artist! Draw away!", 
        emoji: "🖌️", 
        color: "studio-orange" 
      };
    }

    return { 
      text: "Study the artwork and make your guess!", 
      emoji: "🔍", 
      color: "studio-pink" 
    };
  };

  const canStartGame = account && gameState.creator.toString() === account.accountAddress.toString() && !gameState.started;
  const canStartNextRound = userTeam !== null && roundState?.finished && !gameState.finished && !currentScores.gameOver;

  const statusInfo = getStatusMessage();

  return (
    <div className="artist-card m-4 p-4 paint-splatter relative overflow-hidden">
      {/* Floating paint drops */}
      <div className="absolute top-2 right-8 w-3 h-3 bg-studio-pink rounded-full paint-blob opacity-30 animate-bounce"></div>
      <div className="absolute bottom-2 left-12 w-2 h-2 bg-studio-yellow rounded-full paint-blob opacity-40"></div>
      
      <div className="max-w-screen-xl mx-auto flex items-center justify-between relative z-10">
        {/* Status Info */}
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 bg-${statusInfo.color} rounded-full paint-blob flex items-center justify-center fun-shadow animate-pulse`}>
            <span className="text-white text-xl">{statusInfo.emoji}</span>
          </div>
          <div>
            <h2 className={`text-xl font-playful text-${statusInfo.color} mb-1`}>
              {statusInfo.text}
            </h2>
            {roundState && !roundState.finished && (
              <p className="text-sm font-bold text-gray-600 flex items-center gap-1">
                <span className="w-4 h-4 bg-studio-blue rounded-full paint-blob inline-block"></span>
                Round {gameState.currentRound} - Art in Progress!
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons & Timer */}
        <div className="flex items-center space-x-4">
          {canStartGame && (
            <Button 
              onClick={onStartGame} 
              className="palette-button bg-studio-green hover:bg-studio-blue text-white font-bold px-6 py-3 flex items-center gap-3 transition-all duration-300 fun-shadow"
            >
              <Play size={18} className="paint-drip" />
              <span>Start painting!</span>
              <span className="text-lg">🎨</span>
            </Button>
          )}

          {canStartNextRound && (
            <Button 
              onClick={onNextRound} 
              className="palette-button bg-studio-orange hover:bg-studio-purple text-white font-bold px-6 py-3 flex items-center gap-3 transition-all duration-300 fun-shadow"
            >
              <SkipForward size={18} className="paint-drip" />
              <span>Next Masterpiece!</span>
              <span className="text-lg">🎨</span>
            </Button>
          )}

          {/* Magic Timer */}
          {gameState.started && timeLeft !== null && !gameState.finished && !currentScores.gameOver && (
            <div className="artist-card px-4 py-2 flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full paint-blob flex items-center justify-center ${
                timeLeft <= 10 ? "bg-studio-red animate-pulse" : "bg-studio-blue"
              }`}>
                <Clock size={16} className="text-black" />
              </div>
              <div className="text-center">
                <div className={`text-2xl font-playful font-bold ${
                  timeLeft <= 10 ? "text-studio-red animate-bounce" : "text-studio-blue"
                }`}>
                  {formatTime(timeLeft)}
                </div>
                <div className="text-xs font-bold text-gray-600">
                  {timeLeft <= 10 ? "Hurry! ⚡" : "Time Left ⏰"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
