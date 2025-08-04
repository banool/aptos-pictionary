import { useState, useEffect, useRef } from "react";
import { AccountAddress } from "@aptos-labs/ts-sdk";
import { useAuthStore } from "@/store/auth";
import { GameCanvas } from "@/components/GameCanvas";
import { GameSidebar } from "@/components/GameSidebar";
import { GameStatus } from "@/components/GameStatus";
import { buildStartGamePayload, buildNextRoundPayload, buildSubmitCanvasDeltaPayload } from "@/entry-functions/gameActions";
import { aptos } from "@/utils/aptos";
import { getGame, getCurrentRound } from "@/view-functions/gameView";
import { GameState, RoundState, CanvasDelta } from "@/utils/surf";
import { useAnsMultiplePrimaryNames, getDisplayName as getDisplayNameHelper } from "@/hooks/useAns";

interface GameInterfaceProps {
  gameAddress: AccountAddress;
}



export function GameInterface({ gameAddress }: GameInterfaceProps) {
  const account = useAuthStore(state => state.activeAccount);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roundState, setRoundState] = useState<RoundState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get all unique addresses from game state for ANS resolution
  const allAddresses = gameState 
    ? [...gameState.team0Players, ...gameState.team1Players, gameState.creator]
    : [];

  // Use React Query to resolve ANS names for all addresses
  const ansQueries = useAnsMultiplePrimaryNames(allAddresses);

  // Load game state from blockchain
  const loadGameState = async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true);
    }
    
    try {
      // Try to load actual game state from the contract
      const gameStateData = await getGame(aptos, gameAddress);
      const roundStateData = await getCurrentRound(aptos, gameAddress);
      
      setGameState(gameStateData);
      setRoundState(roundStateData);
      setError(null);
    } catch (err) {
      console.error("Failed to load game state:", err);
      if (isInitialLoad) {
        setError(err instanceof Error ? err.message : "Failed to load game state");
        setGameState(null);
        setRoundState(null);
      }
      // For polling updates, don't update error state - keep the game running
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  // Initial load and setup polling
  useEffect(() => {
    if (!account || !gameAddress) return;

    // Initial load
    loadGameState(true);

    // Set up polling for real-time updates (every 3 seconds)
    pollingIntervalRef.current = setInterval(() => {
      loadGameState(false);
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [account, gameAddress]);

  // Helper function to get display name using React Query results
  const getDisplayNameFromQueries = (address: AccountAddress): string => {
    const addressStr = address.toString();
    
    // Find the corresponding query result for this address
    const queryResult = ansQueries.find(query => {
      return query.data?.address === addressStr;
    });
    
    if (queryResult?.data?.ansName) {
      return queryResult.data.ansName;
    }
    
    // Fallback to getDisplayName helper from useAns hook
    return getDisplayNameHelper(address, null);
  };

  const getUserTeam = (): number | null => {
    if (!account || !gameState) return null;
    
    const userAddress = account.accountAddress.toString();
    if (gameState.team0Players.some(addr => addr.toString() === userAddress)) return 0;
    if (gameState.team1Players.some(addr => addr.toString() === userAddress)) return 1;
    return null;
  };

  // Updated getDisplayName to use React Query results
  const getDisplayName = (address: AccountAddress): string => {
    return getDisplayNameFromQueries(address);
  };

  const isCurrentArtist = (): boolean => {
    if (!account || !gameState) return false;
    
    const userTeam = getUserTeam();
    if (userTeam === null) return false;
    
    const userAddress = account.accountAddress.toString();
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
      
      const transaction = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: payload,
      });
      await aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
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
      
      const transaction = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: payload,
      });
      await aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      // Reload game state after starting next round
      window.location.reload();
    } catch (error) {
      console.error("Failed to start next round:", error);
      alert("Failed to start next round. Please try again.");
    }
  };

  const handleCanvasUpdate = async (deltas: CanvasDelta[]) => {
    if (!account || !gameState) {
      throw new Error("Not connected or no game state");
    }

    const userTeam = getUserTeam();
    if (userTeam === null) {
      throw new Error("User is not in a team");
    }

    const positions = deltas.map(d => d.position);
    const colors = deltas.map(d => d.color);

    console.log("Submitting canvas update:", { positions, colors, userTeam, gameAddress: gameAddress.toString() });

    try {
      const payload = buildSubmitCanvasDeltaPayload(gameAddress, userTeam, positions, colors);
      
      const transaction = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: payload,
      });
      
      const response = await aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
      });
      
      console.log("Canvas update transaction submitted:", response.hash);
      
      // Wait for transaction confirmation
      const result = await aptos.waitForTransaction({
        transactionHash: response.hash,
      });
      
      console.log("Canvas update transaction confirmed:", result);
    } catch (error) {
      console.error("Failed to submit canvas update transaction:", error);
      throw error; // Re-throw to let the canvas component handle retry
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
      {/* Left Sidebar - Game Info (moved from right) */}
      <GameSidebar
        gameState={gameState}
        roundState={roundState}
        userTeam={getUserTeam()}
        getDisplayName={getDisplayName}
        gameAddress={gameAddress}
      />

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
            canDraw={isCurrentArtist() && gameState.started && !gameState.finished && roundState !== null && !roundState.finished}
            userTeam={getUserTeam()}
            currentRound={gameState.currentRound}
            gameStarted={gameState.started}
            roundFinished={roundState?.finished ?? false}
            onCanvasUpdate={handleCanvasUpdate}
          />
        </div>
      </div>

      {/* Left Sidebar - Games List (commented out for now, keeping code) */}
      {/* 
      <div className="w-64 border-r bg-gray-50 p-4">
        <h3 className="font-semibold mb-4">My Games</h3>
        <p className="text-sm text-gray-500">Coming soon...</p>
      </div>
      */}
    </div>
  );
}