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
    <div className="w-80 bg-gradient-to-b from-purple-50 to-blue-50 h-screen max-h-screen relative overflow-y-auto scrollbar-hide">
      {/* Studio Background Splotches */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute top-10 left-4 w-16 h-16 bg-studio-yellow rounded-full paint-blob"></div>
        <div className="absolute top-32 right-6 w-12 h-12 bg-studio-pink rounded-full paint-blob"></div>
        <div className="absolute bottom-40 left-8 w-20 h-20 bg-studio-green rounded-full paint-blob"></div>
        <div className="absolute bottom-20 right-4 w-14 h-14 bg-studio-orange rounded-full paint-blob"></div>
      </div>

      {/* Artist Studio Header */}
      <div className="artist-card m-3 p-4 relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-studio-purple rounded-full paint-blob flex items-center justify-center">
            <span className="text-white text-lg">🎮</span>
          </div>
          <h3 className="font-playful text-xl text-studio-purple">Studio Dashboard</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="w-8 h-8 bg-studio-blue rounded-full paint-blob mx-auto mb-1 flex items-center justify-center">
              <span className="text-white text-sm font-bold">{gameState.currentRound}</span>
            </div>
            <span className="text-xs font-bold text-gray-700">Round</span>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 bg-studio-orange rounded-full paint-blob mx-auto mb-1 flex items-center justify-center">
              <span className="text-white text-sm font-bold">{gameState.targetScore}</span>
            </div>
            <span className="text-xs font-bold text-gray-700">Target Score</span>
          </div>
        </div>
      </div>

      {/* Artist Teams */}
      <div className="artist-card m-3 p-4 relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-studio-green rounded-full paint-blob flex items-center justify-center">
            <span className="text-white text-sm">👥</span>
          </div>
          <h4 className="font-playful text-lg text-studio-green">Art Teams 🎨</h4>
        </div>
        
        {/* Team 1 */}
        <div className={`mb-4 artist-card p-4 paint-splatter transition-all duration-300 ${userTeam === 0 ? "ring-4 ring-studio-blue ring-opacity-50 scale-105" : ""}`}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-studio-blue rounded-full paint-blob flex items-center justify-center">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <span className="font-playful text-studio-blue">{gameState.team0Name}</span>
            </div>
            <div className="w-10 h-10 bg-studio-blue rounded-full paint-blob flex items-center justify-center fun-shadow">
              <span className="text-white font-bold">{currentScores.team0Score}</span>
            </div>
          </div>
          <div className="space-y-2">
            {gameState.team0Players.map((player, index) => {
              const isCurrentUser = account && account.accountAddress.toString() === player.toString();
              return (
                <div key={player.toString()} className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-studio-yellow rounded-full paint-blob flex items-center justify-center">
                    <span className="text-xs">👤</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 flex-1">
                    {getPlayerDisplayName(player)}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs font-bold text-studio-blue bg-blue-50 px-2 py-1 rounded-full">
                        (you)
                      </span>
                    )}
                  </span>
                  {index === gameState.currentTeam0Artist && (
                    <div className="w-6 h-6 bg-studio-orange rounded-full paint-blob flex items-center justify-center animate-bounce">
                      <span className="text-white text-xs">🎨</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {roundState?.team0Guessed && (
            <div className="mt-3 flex items-center gap-2 p-2 bg-green-100 rounded-lg">
              <div className="w-5 h-5 bg-green-500 rounded-full paint-blob flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-green-700 font-bold text-sm">Solved the mystery! 🕵️</span>
            </div>
          )}
        </div>

        {/* Team 2 */}
        <div className={`artist-card p-4 paint-splatter transition-all duration-300 ${userTeam === 1 ? "ring-4 ring-studio-pink ring-opacity-50 scale-105" : ""}`}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-studio-pink rounded-full paint-blob flex items-center justify-center">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <span className="font-playful text-studio-pink">{gameState.team1Name}</span>
            </div>
            <div className="w-10 h-10 bg-studio-pink rounded-full paint-blob flex items-center justify-center fun-shadow">
              <span className="text-white font-bold">{currentScores.team1Score}</span>
            </div>
          </div>
          <div className="space-y-2">
            {gameState.team1Players.map((player, index) => {
              const isCurrentUser = account && account.accountAddress.toString() === player.toString();
              return (
                <div key={player.toString()} className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-studio-yellow rounded-full paint-blob flex items-center justify-center">
                    <span className="text-xs">👤</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 flex-1">
                    {getPlayerDisplayName(player)}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs font-bold text-studio-pink bg-pink-50 px-2 py-1 rounded-full">
                        (you)
                      </span>
                    )}
                  </span>
                  {index === gameState.currentTeam1Artist && (
                    <div className="w-6 h-6 bg-studio-orange rounded-full paint-blob flex items-center justify-center animate-bounce">
                      <span className="text-white text-xs">🎨</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {roundState?.team1Guessed && (
            <div className="mt-3 flex items-center gap-2 p-2 bg-green-100 rounded-lg">
              <div className="w-5 h-5 bg-green-500 rounded-full paint-blob flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-green-700 font-bold text-sm">Solved the mystery! 🕵️</span>
            </div>
          )}
        </div>
      </div>

      {/* Magic Word Reveal */}
      {roundState?.finished && roundState.word && (
        <div className="artist-card m-3 p-4 relative z-10 bounce-in paint-splatter">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-studio-yellow rounded-full paint-blob flex items-center justify-center animate-bounce">
              <span className="text-white text-sm">✨</span>
            </div>
            <h4 className="font-playful text-lg text-gray-800">The secret word was...</h4>
          </div>
          <div className="text-3xl font-playful text-center py-4 bg-gradient-to-r from-studio-purple to-studio-blue rounded-2xl fun-shadow">
            {roundState.word} 🎉
          </div>
        </div>
      )}

      {/* Artist's Secret Word */}
      {isCurrentArtist() && currentWordForArtist && gameState.started && !gameState.finished && roundState && !roundState.finished && (
        <div className="artist-card m-3 p-4 relative z-10 paint-splatter">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-studio-blue rounded-full paint-blob flex items-center justify-center">
              <span className="text-white text-sm">🎯</span>
            </div>
            <h4 className="font-playful text-lg text-studio-blue">Your secret word:</h4>
          </div>
          <div className="text-2xl font-playful text-center py-4 bg-gradient-to-r from-studio-blue to-studio-purple text-black rounded-2xl fun-shadow animate-pulse">
            {currentWordForArtist} 🖌️
          </div>
          <p className="text-xs text-center text-gray-600 mt-2 font-medium">
            Shh! 🤫 Only you can see this!
          </p>
        </div>
      )}

      {/* Magic Guessing Interface */}
      {userTeam !== null && !gameState.finished && !isCurrentArtist() && gameState.started && !hasUserTeamGuessed() && (
        <div className="artist-card m-3 p-4 relative z-10 paint-splatter">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-studio-green rounded-full paint-blob flex items-center justify-center">
              <span className="text-white text-sm">🔮</span>
            </div>
            <h4 className="font-playful text-lg text-studio-green">Guess the secret word!</h4>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="What do you think it is? ✨"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 border-2 border-gray-300 rounded-full px-4 py-2 font-medium focus:border-studio-green focus:ring-2 focus:ring-studio-green focus:ring-opacity-20"
            />
            <Button
              onClick={handleSubmitGuess}
              disabled={!guess.trim() || isSubmittingGuess}
              className="palette-button bg-studio-green hover:bg-studio-blue text-white font-bold px-4 py-2 rounded-full transition-all duration-300"
            >
              {isSubmittingGuess ? (
                <div className="w-5 h-5 bg-white rounded-full paint-blob animate-spin flex items-center justify-center">
                  <span className="text-studio-green text-xs">✨</span>
                </div>
              ) : (
                <Send size={16} className="paint-drip" />
              )}
            </Button>
          </div>
          <p className="text-xs text-center text-gray-600 mt-2 font-medium">
            🕵️ Study the artwork and make your guess!
          </p>
        </div>
      )}

      {/* Already Solved Message */}
      {userTeam !== null && !gameState.finished && !isCurrentArtist() && gameState.started && hasUserTeamGuessed() && (
        <div className="artist-card m-3 p-4 relative z-10 bounce-in">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-green-500 rounded-full paint-blob flex items-center justify-center animate-bounce">
              <span className="text-white text-sm">🎉</span>
            </div>
            <h4 className="font-playful text-lg text-green-600">Mystery Solved!</h4>
          </div>
          <div className="text-center p-3 bg-green-100 rounded-2xl">
            <p className="text-green-700 font-bold mb-1">🏆 Your team cracked the code!</p>
            <p className="text-sm text-green-600">
              Sit back and watch other teams figure it out! 🍿
            </p>
          </div>
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
      <div className="artist-card m-3 p-4 relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-studio-purple rounded-full paint-blob flex items-center justify-center">
            <span className="text-white text-sm">📜</span>
          </div>
          <h4 className="font-playful text-lg text-studio-purple">Art History</h4>
        </div>
        <div className="space-y-3">
          {roundResults.length === 0 ? (
            <p className="text-sm text-gray-600 text-center italic">No masterpieces completed yet... 🎨</p>
          ) : (
            roundResults.slice().reverse().map((result) => (
              <div key={result.roundNumber} className="bg-white p-3 rounded-xl border-2 border-gray-200 paint-splatter">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-800">🎭 Round {result.roundNumber}</span>
                  <span className="text-sm font-medium text-studio-blue bg-blue-50 px-2 py-1 rounded-full">"{result.word}"</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-studio-blue font-medium">{gameState.team0Name}: +{result.team0Points} ({result.team0TotalScore})</span>
                  <span className="text-studio-pink font-medium">{gameState.team1Name}: +{result.team1Points} ({result.team1TotalScore})</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Game Over Celebration */}
      {gameState.finished && gameState.winner !== null && (
        <div className="artist-card m-3 p-4 relative z-10 bounce-in paint-splatter">
          <div className="text-center">
            <div className="w-16 h-16 bg-studio-yellow rounded-full paint-blob flex items-center justify-center mx-auto mb-4 animate-bounce">
              <span className="text-3xl">🏆</span>
            </div>
            <h3 className="font-playful text-2xl text-studio-green mb-2">
              🎉 Art Champions! 🎉
            </h3>
            <p className="font-bold text-lg text-gray-800 mb-2">
              {gameState.winner === 0 ? gameState.team0Name : gameState.team1Name} are the winners!
            </p>
            <p className="text-sm text-gray-600">
              Final Masterpiece Score: {currentScores.team0Score} - {currentScores.team1Score} 🎨
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
