import { useState, useEffect } from "react";
import { AccountAddress } from "@aptos-labs/ts-sdk";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { buildMakeGuessPayload } from "@/entry-functions/gameActions";
import { getCurrentWordForArtist, getRoundHistory, getCurrentRound, RoundResult } from "@/view-functions/gameView";
import { aptos } from "@/utils/aptos";
import { RoundState } from "@/utils/surf";
import { useToast } from "@/components/ui/use-toast";
import { calculateCurrentScores } from "@/utils/gameLogic";

interface GameSidebarProps {
  gameState: {
    team0Players: AccountAddress[];
    team1Players: AccountAddress[];
    team0Name: string;
    team1Name: string;
    team0Score: number;
    team1Score: number;
    targetScore: number;
    currentRound: number;
    finished: boolean;
    winner: number | null;
    currentTeam0Artist: number;
    currentTeam1Artist: number;
    started: boolean;
  };
  roundState: RoundState | null;
  userTeam: number | null;
  getDisplayName?: (address: AccountAddress) => string;
  gameAddress: AccountAddress;
  onRefreshGameState?: () => Promise<void>;
}

export function GameSidebar({ gameState, roundState, userTeam, getDisplayName, gameAddress, onRefreshGameState }: GameSidebarProps) {
  const account = useAuthStore(state => state.activeAccount);
  const [guess, setGuess] = useState("");
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [currentWordForArtist, setCurrentWordForArtist] = useState<string>("");
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);
  const { toast } = useToast();

  const currentScores = calculateCurrentScores(gameState, roundState);

  // Load round history from blockchain
  useEffect(() => {
    const loadRoundHistory = async () => {
      try {
        const history = await getRoundHistory(
          aptos, 
          gameAddress,
          gameState.currentRound
        );
        setRoundResults(history);
      } catch (error) {
        console.error("Failed to load round history:", error);
      }
    };

    if (gameState.started) {
      loadRoundHistory();
    }
  }, [gameAddress, gameState.started, gameState.currentRound, roundState?.startTime, roundState?.durationSeconds, roundState?.finished]);

  // Load current word for artist
  useEffect(() => {
    const loadCurrentWord = async () => {
      if (!account || !gameState.started || gameState.finished) {
        setCurrentWordForArtist("");
        return;
      }

      try {
        const word = await getCurrentWordForArtist(aptos, gameAddress, account.accountAddress);
        setCurrentWordForArtist(word);
      } catch (error) {
        console.error("Failed to load current word for artist:", error);
        setCurrentWordForArtist("");
      }
    };

    loadCurrentWord();
  }, [account, gameAddress, gameState.started, gameState.finished, gameState.currentRound]);

  const handleSubmitGuess = async () => {
    if (!guess.trim() || !account || isSubmittingGuess) return;

    setIsSubmittingGuess(true);
    const submittedGuess = guess.trim();
    
    try {
      // Get the current round state before submitting the guess
      const preGuessRoundState = await getCurrentRound(aptos, gameAddress);
      
      const payload = buildMakeGuessPayload(gameAddress, submittedGuess);
      
      const transaction = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: payload,
      });
      
      const result = await aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
      });
      
      // Wait for transaction confirmation
      await aptos.waitForTransaction({
        transactionHash: result.hash,
      });

      // Clear the guess input immediately
      setGuess("");
      
      // Wait a moment for blockchain state to update, then check result
      setTimeout(async () => {
        try {
          // Get the updated round state
          const postGuessRoundState = await getCurrentRound(aptos, gameAddress);
          
          // Determine if the guess was correct by checking if team's guessed status changed
          let wasCorrect = false;
          if (userTeam !== null) {
            if (userTeam === 0) {
              wasCorrect = !preGuessRoundState.team0Guessed && postGuessRoundState.team0Guessed;
            } else if (userTeam === 1) {
              wasCorrect = !preGuessRoundState.team1Guessed && postGuessRoundState.team1Guessed;
            }
          }
          
          // Show appropriate toast feedback
          if (wasCorrect) {
            toast({
              title: "Correct! 🎉",
              description: `Great job! "${submittedGuess}" was the right answer!`,
              variant: "default",
            });
          } else {
            toast({
              title: "Incorrect guess",
              description: `"${submittedGuess}" wasn't the word. Keep trying!`,
              variant: "destructive",
            });
          }
          
          // Refresh the game state instead of reloading the page
          if (onRefreshGameState) {
            await onRefreshGameState();
          }
        } catch (error) {
          console.error("Failed to check guess result:", error);
          // Fallback to just refreshing game state
          if (onRefreshGameState) {
            await onRefreshGameState();
          }
        } finally {
          setIsSubmittingGuess(false);
        }
      }, 2000); // Wait 2 seconds for blockchain state to update
    } catch (error) {
      console.error("Failed to submit guess:", error);
      toast({
        title: "Error",
        description: "Failed to submit guess. Please try again.",
        variant: "destructive",
      });
      setIsSubmittingGuess(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmitGuess();
    }
  };

  const formatAddress = (addressTyped: AccountAddress) => {
    const address = addressTyped.toString();   
    // If the address is short enough, just return it as is.
    if (addressTyped.isSpecial()) {
      return address;
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getPlayerDisplayName = (player: AccountAddress) => {
    return getDisplayName ? getDisplayName(player) : formatAddress(player);
  };

  const isCurrentArtist = (): boolean => {
    if (!account || !gameState) return false;
    
    const userAddress = account.accountAddress.toString();
    const team0Artist = gameState.team0Players[gameState.currentTeam0Artist];
    const team1Artist = gameState.team1Players[gameState.currentTeam1Artist];
    
    return team0Artist?.toString() === userAddress || team1Artist?.toString() === userAddress;
  };

  const hasUserTeamGuessed = (): boolean => {
    if (!roundState || userTeam === null) return false;
    
    return userTeam === 0 ? roundState.team0Guessed : roundState.team1Guessed;
  };

  return (
    <div className="w-80 border-r bg-gray-50 flex flex-col h-screen max-h-screen">
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
            <span className="font-medium">{gameState.team0Name}</span>
            <span className="text-xl font-bold">{currentScores.team0Score}</span>
          </div>
          <div className="space-y-1">
            {gameState.team0Players.map((player, index) => (
              <div key={player.toString()} className="text-xs text-gray-600">
                {getPlayerDisplayName(player)}
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
            <span className="font-medium">{gameState.team1Name}</span>
            <span className="text-xl font-bold">{currentScores.team1Score}</span>
          </div>
          <div className="space-y-1">
            {gameState.team1Players.map((player, index) => (
              <div key={player.toString()} className="text-xs text-gray-600">
                {getPlayerDisplayName(player)}
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

      {/* Current Word for Artists */}
      {isCurrentArtist() && currentWordForArtist && gameState.started && !gameState.finished && roundState && !roundState.finished && (
        <div className="p-4 border-b bg-blue-50">
          <h4 className="font-semibold mb-2 text-blue-800">Your Word to Draw:</h4>
          <div className="text-2xl font-bold text-center py-2 bg-white rounded border text-blue-900">
            {currentWordForArtist}
          </div>
        </div>
      )}

      {/* Guess Input - Only for non-artists who haven't guessed correctly yet */}
      {userTeam !== null && !gameState.finished && !isCurrentArtist() && gameState.started && !hasUserTeamGuessed() && (
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
              disabled={!guess.trim() || isSubmittingGuess}
            >
              {isSubmittingGuess ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send size={16} />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Message when team has already guessed correctly */}
      {userTeam !== null && !gameState.finished && !isCurrentArtist() && gameState.started && hasUserTeamGuessed() && (
        <div className="p-4 border-b bg-green-50">
          <h4 className="font-semibold mb-2 text-green-800">Already Guessed!</h4>
          <p className="text-sm text-green-700">Your team has already guessed correctly this round. Wait for the round to finish!</p>
        </div>
      )}

      {/* Artist cannot guess message */}
      {isCurrentArtist() && gameState.started && !gameState.finished && !roundState?.finished && (
        <div className="p-4 border-b bg-yellow-50">
          <h4 className="font-semibold mb-2 text-yellow-800">Artist</h4>
          <p className="text-sm text-yellow-700">You're the artist this round - draw the word above!</p>
        </div>
      )}

      {/* Remove duplicate next round button - it's already in GameStatus */}

      {/* Round History */}
      <div className="flex-1 p-4 min-h-0">
        <h4 className="font-semibold mb-3">Round History</h4>
        <div className="h-full max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {roundResults.length === 0 ? (
              <p className="text-sm text-gray-500">No rounds completed yet</p>
            ) : (
              roundResults.slice().reverse().map((result) => (
                <div key={result.roundNumber} className="bg-white p-3 rounded border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Round {result.roundNumber}</span>
                    <span className="text-sm text-gray-500">"{result.word}"</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{gameState.team0Name}: +{result.team0Points} ({result.team0TotalScore})</span>
                    <span>{gameState.team1Name}: +{result.team1Points} ({result.team1TotalScore})</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Game Over */}
      {gameState.finished && gameState.winner !== null && (
        <div className="p-4 bg-green-50 border-t">
          <div className="text-center">
            <h3 className="text-lg font-bold text-green-800 mb-2">
              🎉 {gameState.winner === 0 ? gameState.team0Name : gameState.team1Name} Wins!
            </h3>
            <p className="text-sm text-green-600">
              Final Score: {currentScores.team0Score} - {currentScores.team1Score}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}