import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { GameCanvas } from "@/components/GameCanvas";
import { GameSidebar } from "@/components/GameSidebar";
import { GameStatus } from "@/components/GameStatus";
import { PICTIONARY_MODULE_ADDRESS } from "@/constants";
import { aptos } from "@/utils/aptos";
import { getGame, getCurrentRound } from "@/view-functions/gameView";

interface GameInterfaceProps {
  gameAddress: string;
}

interface GameState {
  creator: string;
  team0Players: string[];
  team1Players: string[];
  currentTeam0Artist: number;
  currentTeam1Artist: number;
  team0Score: number;
  team1Score: number;
  targetScore: number;
  currentRound: number;
  started: boolean;
  finished: boolean;
  winner: number | null;
  canvasWidth: number;
  canvasHeight: number;
  roundDuration: number;
}

interface RoundState {
  roundNumber: number;
  word: string;
  startTime: number;
  durationSeconds: number;
  team0Guessed: boolean;
  team1Guessed: boolean;
  finished: boolean;
}

export function GameInterface({ gameAddress }: GameInterfaceProps) {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roundState, setRoundState] = useState<RoundState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load game state from blockchain
  useEffect(() => {
    const loadGameState = async () => {
      setLoading(true);
      try {
        // Try to load actual game state from the contract
        const gameStateData = await getGame(aptos, gameAddress);
        const roundStateData = await getCurrentRound(aptos, gameAddress);
        
        setGameState(gameStateData);
        setRoundState(roundStateData);
        setError(null);
      } catch (err) {
        console.error("Failed to load game state:", err);
        // Fall back to mock data for development/testing
        console.log("Falling back to mock data for development");
        
        const mockGameState: GameState = {
          creator: account?.address?.toString() || PICTIONARY_MODULE_ADDRESS,
          team0Players: [account?.address?.toString() || PICTIONARY_MODULE_ADDRESS, PICTIONARY_MODULE_ADDRESS.slice(0, 6) + "789"],
          team1Players: [PICTIONARY_MODULE_ADDRESS.slice(0, 6) + "abc", PICTIONARY_MODULE_ADDRESS.slice(0, 6) + "def"],
          currentTeam0Artist: 0,
          currentTeam1Artist: 0,
          team0Score: 2,
          team1Score: 4,
          targetScore: 11,
          currentRound: 3,
          started: true,
          finished: false,
          winner: null,
          canvasWidth: 500,
          canvasHeight: 500,
          roundDuration: 30,
        };

        const mockRoundState: RoundState = {
          roundNumber: 2,
          word: "", // Hidden until round ends
          startTime: Date.now() / 1000,
          durationSeconds: 30,
          team0Guessed: false,
          team1Guessed: false,
          finished: false,
        };

        setGameState(mockGameState);
        setRoundState(mockRoundState);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    if (connected && gameAddress) {
      loadGameState();
    }
  }, [connected, gameAddress, account]);

  const getUserTeam = (): number | null => {
    if (!account || !gameState) return null;
    
    if (gameState.team0Players.includes(account.address.toString())) return 0;
    if (gameState.team1Players.includes(account.address.toString())) return 1;
    return null;
  };

  const isCurrentArtist = (): boolean => {
    if (!account || !gameState) return false;
    
    const userTeam = getUserTeam();
    if (userTeam === null) return false;
    
    if (userTeam === 0) {
      return gameState.team0Players[gameState.currentTeam0Artist] === account.address.toString();
    } else {
      return gameState.team1Players[gameState.currentTeam1Artist] === account.address.toString();
    }
  };

  const handleStartGame = async () => {
    if (!account) {
      alert("Please connect your wallet");
      return;
    }

    try {
      await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: `${PICTIONARY_MODULE_ADDRESS}::pictionary::start_game`,
          functionArguments: [gameAddress],
        },
      });

      // Reload game state after starting
      window.location.reload();
    } catch (error) {
      console.error("Failed to start game:", error);
      alert("Failed to start game. Please try again.");
    }
  };

  const handleNextRound = async () => {
    if (!account) {
      alert("Please connect your wallet");
      return;
    }

    try {
      await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: `${PICTIONARY_MODULE_ADDRESS}::pictionary::next_round`,
          functionArguments: [gameAddress],
        },
      });

      // Reload game state after starting next round
      window.location.reload();
    } catch (error) {
      console.error("Failed to start next round:", error);
      alert("Failed to start next round. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p>Game not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full">
      {/* Left Sidebar - Games List (empty for now) */}
      <div className="w-64 border-r bg-gray-50 p-4">
        <h3 className="font-semibold mb-4">My Games</h3>
        <p className="text-sm text-gray-500">Coming soon...</p>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        <GameStatus
          gameState={gameState}
          roundState={roundState}
          userTeam={getUserTeam()}
          isCurrentArtist={isCurrentArtist()}
          onStartGame={handleStartGame}
          onNextRound={handleNextRound}
        />
        
        <div className="flex-1 flex items-center justify-center p-4">
          <GameCanvas
            gameAddress={gameAddress}
            width={gameState.canvasWidth}
            height={gameState.canvasHeight}
            canDraw={isCurrentArtist() && gameState.started && !gameState.finished}
            userTeam={getUserTeam()}
          />
        </div>
      </div>

      {/* Right Sidebar - Game Info */}
      <GameSidebar
        gameState={gameState}
        roundState={roundState}
        userTeam={getUserTeam()}
      />
    </div>
  );
}