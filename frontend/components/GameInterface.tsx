import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { AccountAddress } from "@aptos-labs/ts-sdk";
import { GameCanvas } from "@/components/GameCanvas";
import { GameSidebar } from "@/components/GameSidebar";
import { GameStatus } from "@/components/GameStatus";
import { buildStartGamePayload, buildNextRoundPayload } from "@/entry-functions/gameActions";
import { aptos } from "@/utils/aptos";
import { getGame, getCurrentRound } from "@/view-functions/gameView";
import { GameState } from "@/utils/surf";

interface GameInterfaceProps {
  gameAddress: AccountAddress;
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
  const [ansNames, setAnsNames] = useState<Record<string, string | null>>({});
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
        setError(err instanceof Error ? err.message : "Failed to load game state");
        setGameState(null);
        setRoundState(null);
      } finally {
        setLoading(false);
      }
    };

    if (connected && gameAddress) {
      loadGameState();
    }
  }, [connected, gameAddress, account]);

  // Function to resolve account addresses to ANS names
  const resolveAnsNames = async (addresses: AccountAddress[]) => {
    const newAnsNames: Record<string, string | null> = {};
    
    for (const address of addresses) {
      const addressStr = address.toString();
      if (!ansNames[addressStr]) {
        try {
          const ansName = await aptos.ans.getPrimaryName({ address: addressStr });
          newAnsNames[addressStr] = ansName || null;
        } catch (err) {
          console.log(`No ANS name found for address: ${addressStr}`);
          newAnsNames[addressStr] = null;
        }
      }
    }
    
    if (Object.keys(newAnsNames).length > 0) {
      setAnsNames(prev => ({ ...prev, ...newAnsNames }));
    }
  };

  // Resolve ANS names when game state changes
  useEffect(() => {
    if (gameState) {
      const allAddresses = [
        gameState.creator,
        ...gameState.team0Players,
        ...gameState.team1Players
      ];
      resolveAnsNames(allAddresses);
    }
  }, [gameState]);

  const getUserTeam = (): number | null => {
    if (!account || !gameState) return null;
    
    const userAddress = account.address.toString();
    if (gameState.team0Players.some(addr => addr.toString() === userAddress)) return 0;
    if (gameState.team1Players.some(addr => addr.toString() === userAddress)) return 1;
    return null;
  };

  // Helper function to get display name (ANS name or truncated address)
  const getDisplayName = (address: AccountAddress): string => {
    const addressStr = address.toString();
    const ansName = ansNames[addressStr];
    if (ansName) {
      return ansName;
    }
    // Return truncated address as fallback
    return `${addressStr.slice(0, 6)}...${addressStr.slice(-4)}`;
  };

  const isCurrentArtist = (): boolean => {
    if (!account || !gameState) return false;
    
    const userTeam = getUserTeam();
    if (userTeam === null) return false;
    
    const userAddress = account.address.toString();
    if (userTeam === 0) {
      return gameState.team0Players[gameState.currentTeam0Artist].toString() === userAddress;
    } else {
      return gameState.team1Players[gameState.currentTeam1Artist].toString() === userAddress;
    }
  };

  const handleStartGame = async () => {
    if (!account) {
      alert("Please connect your wallet");
      return;
    }

    try {
      const payload = buildStartGamePayload(gameAddress);
      
      await signAndSubmitTransaction({
        sender: account.address,
        data: payload,
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
      const payload = buildNextRoundPayload(gameAddress);
      
      await signAndSubmitTransaction({
        sender: account.address,
        data: payload,
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
            gameAddress={gameAddress.toString()}
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
        getDisplayName={getDisplayName}
      />
    </div>
  );
}