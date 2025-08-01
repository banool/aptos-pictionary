import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface GameSidebarProps {
  gameState: {
    team0Players: string[];
    team1Players: string[];
    team0Score: number;
    team1Score: number;
    targetScore: number;
    currentRound: number;
    finished: boolean;
    winner: number | null;
  };
  roundState: {
    word: string;
    finished: boolean;
    team0Guessed: boolean;
    team1Guessed: boolean;
  } | null;
  userTeam: number | null;
}

interface RoundResult {
  roundNumber: number;
  word: string;
  team0Points: number;
  team1Points: number;
  team0TotalScore: number;
  team1TotalScore: number;
}

export function GameSidebar({ gameState, roundState, userTeam }: GameSidebarProps) {
  const [guess, setGuess] = useState("");
  const [roundResults] = useState<RoundResult[]>([
    {
      roundNumber: 1,
      word: "cat",
      team0Points: 2,
      team1Points: 0,
      team0TotalScore: 2,
      team1TotalScore: 0,
    },
    {
      roundNumber: 2,
      word: "house",
      team0Points: 0,
      team1Points: 2,
      team0TotalScore: 2,
      team1TotalScore: 2,
    },
  ]);

  const handleSubmitGuess = async () => {
    if (!guess.trim()) return;

    try {
      // TODO: Call make_guess contract function
      console.log("Submitting guess:", guess);
      setGuess("");
    } catch (error) {
      console.error("Failed to submit guess:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmitGuess();
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="w-80 border-l bg-gray-50 flex flex-col">
      {/* Game Info Header */}
      <div className="p-4 border-b bg-white">
        <h3 className="font-semibold text-lg mb-2">Game Status</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Round:</span>
            <span className="font-medium">{gameState.currentRound}</span>
          </div>
          <div className="flex justify-between">
            <span>Target Score:</span>
            <span className="font-medium">{gameState.targetScore}</span>
          </div>
        </div>
      </div>

      {/* Teams and Scores */}
      <div className="p-4 border-b bg-white">
        <h4 className="font-semibold mb-3">Teams & Scores</h4>
        
        {/* Team 1 */}
        <div className={`mb-4 p-3 rounded-lg ${userTeam === 0 ? "bg-blue-100 border-2 border-blue-300" : "bg-gray-100"}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Team 1</span>
            <span className="text-xl font-bold">{gameState.team0Score}</span>
          </div>
          <div className="space-y-1">
            {gameState.team0Players.map((player, index) => (
              <div key={player} className="text-xs text-gray-600">
                {formatAddress(player)}
                {index === 0 && <span className="ml-2 text-blue-600">👨‍🎨</span>}
              </div>
            ))}
          </div>
          {roundState?.team0Guessed && (
            <div className="mt-2 text-xs text-green-600 font-medium">✓ Guessed!</div>
          )}
        </div>

        {/* Team 2 */}
        <div className={`p-3 rounded-lg ${userTeam === 1 ? "bg-red-100 border-2 border-red-300" : "bg-gray-100"}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Team 2</span>
            <span className="text-xl font-bold">{gameState.team1Score}</span>
          </div>
          <div className="space-y-1">
            {gameState.team1Players.map((player, index) => (
              <div key={player} className="text-xs text-gray-600">
                {formatAddress(player)}
                {index === 0 && <span className="ml-2 text-red-600">👨‍🎨</span>}
              </div>
            ))}
          </div>
          {roundState?.team1Guessed && (
            <div className="mt-2 text-xs text-green-600 font-medium">✓ Guessed!</div>
          )}
        </div>
      </div>

      {/* Current Word (if round finished) */}
      {roundState?.finished && roundState.word && (
        <div className="p-4 border-b bg-yellow-50">
          <h4 className="font-semibold mb-2">The word was:</h4>
          <div className="text-2xl font-bold text-center py-2 bg-white rounded border">
            {roundState.word}
          </div>
        </div>
      )}

      {/* Guess Input */}
      {userTeam !== null && !gameState.finished && (
        <div className="p-4 border-b">
          <h4 className="font-semibold mb-3">Make a Guess</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Enter your guess..."
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button
              onClick={handleSubmitGuess}
              size="sm"
              disabled={!guess.trim()}
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Round History */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h4 className="font-semibold mb-3">Round History</h4>
        <div className="space-y-3">
          {roundResults.map((result) => (
            <div key={result.roundNumber} className="bg-white p-3 rounded border">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Round {result.roundNumber}</span>
                <span className="text-sm text-gray-500">"{result.word}"</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Team 1: +{result.team1Points} ({result.team0TotalScore})</span>
                <span>Team 2: +{result.team1Points} ({result.team1TotalScore})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Over */}
      {gameState.finished && gameState.winner !== null && (
        <div className="p-4 bg-green-50 border-t">
          <div className="text-center">
            <h3 className="text-lg font-bold text-green-800 mb-2">
              🎉 Team {gameState.winner + 1} Wins!
            </h3>
            <p className="text-sm text-green-600">
              Final Score: {gameState.team0Score} - {gameState.team1Score}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}