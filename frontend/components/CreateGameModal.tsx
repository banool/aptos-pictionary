import { useState, useEffect } from "react";
import { AccountAddress, TransactionResponseType } from "@aptos-labs/ts-sdk";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Minus } from "lucide-react";
import { buildCreateGamePayload } from "@/entry-functions/createGame";
import { aptos } from "@/utils/aptos";
import { MODULE_ADDRESS } from "@/constants";
import { useAnsPrimaryName } from "@/hooks/useAns";

interface CreateGameModalProps {
  open: boolean;
  onClose: () => void;
  onGameCreated: (gameAddress: AccountAddress) => void;
}

interface PlayerInput {
  id: string;
  address: string;
}

export function CreateGameModal({
  open,
  onClose,
  onGameCreated,
}: CreateGameModalProps) {
  const account = useAuthStore(state => state.activeAccount);
  const [userDisplayName, setUserDisplayName] = useState<string>("");
  const [team0Players, setTeam0Players] = useState<PlayerInput[]>([
    { id: "1", address: "" },
    { id: "2", address: "" },
  ]);
  const [team1Players, setTeam1Players] = useState<PlayerInput[]>([
    { id: "3", address: "" },
    { id: "4", address: "" },
  ]);
  const [targetScore, setTargetScore] = useState("11");
  const [canvasSize, setCanvasSize] = useState("500");
  const [roundDuration, setRoundDuration] = useState("45");
  const [isLoading, setIsLoading] = useState(false);

  // Use React Query to get user's ANS name with caching
  const { data: userAnsName } = useAnsPrimaryName(account?.accountAddress ?? null);
  
  // Update userDisplayName when ANS data or account changes
  useEffect(() => {
    if (!account) {
      setUserDisplayName("");
      return;
    }

    try {
      if (!account.accountAddress || typeof account.accountAddress.toString !== 'function') {
        console.warn('Invalid account object');
        setUserDisplayName("");
        return;
      }

      const addressString = account.accountAddress.toString();
      setUserDisplayName(userAnsName || addressString);
    } catch (error) {
      console.error('Error setting user display name:', error);
      setUserDisplayName("");
    }
  }, [account, userAnsName, open]);

  // Prefill user's address when modal opens and reset when closed
  useEffect(() => {
    if (open && account && userDisplayName) {
      // Always prefill the first position of team 0 with the user's address/ANS name
      setTeam0Players(prev => [
        { ...prev[0], address: userDisplayName },
        ...prev.slice(1)
      ]);
    } else if (!open) {
      // Reset form when modal closes
      setTeam0Players([
        { id: "1", address: "" },
        { id: "2", address: "" },
      ]);
      setTeam1Players([
        { id: "3", address: "" },
        { id: "4", address: "" },
      ]);
      setTargetScore("11");
      setCanvasSize("500");
      setRoundDuration("45");
      setUserDisplayName("");
    }
  }, [open, account, userDisplayName]);

  const addPlayer = (team: 0 | 1) => {
    const setPlayers = team === 0 ? setTeam0Players : setTeam1Players;
    const currentPlayers = team === 0 ? team0Players : team1Players;
    
    setPlayers([
      ...currentPlayers,
      { id: `${Date.now()}`, address: "" },
    ]);
  };

  const removePlayer = (team: 0 | 1, playerId: string) => {
    const setPlayers = team === 0 ? setTeam0Players : setTeam1Players;
    const currentPlayers = team === 0 ? team0Players : team1Players;
    
    if (currentPlayers.length <= 2) return; // Minimum 2 players per team
    
    setPlayers(currentPlayers.filter(p => p.id !== playerId));
  };

  const updatePlayerAddress = (team: 0 | 1, playerId: string, address: string) => {
    const setPlayers = team === 0 ? setTeam0Players : setTeam1Players;
    const currentPlayers = team === 0 ? team0Players : team1Players;
    
    setPlayers(
      currentPlayers.map(p =>
        p.id === playerId ? { ...p, address } : p
      )
    );
  };

  // Helper function to resolve addresses (ANS names or regular addresses)
  const resolveAddress = async (addressOrName: string): Promise<string> => {
    const trimmed = addressOrName.trim();
    
    // Check if it's an ANS name (ends with .apt)
    if (trimmed.endsWith('.apt')) {
      try {
        const targetAddress = await aptos.ans.getTargetAddress({ name: trimmed });
        if (!targetAddress) {
          throw new Error(`ANS name not found: ${trimmed}`);
        }
        return targetAddress.toString();
      } catch (error) {
        throw new Error(`Failed to resolve ANS name "${trimmed}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Regular address validation using AccountAddress.isValid
    let result = AccountAddress.isValid({ input: trimmed });
    if (!result.valid) {
      throw new Error(`Invalid address format: ${trimmed} ${result.invalidReasonMessage}`);
    }
    
    return trimmed;
  };

  const handleCreateGame = async () => {
    // Validate account object thoroughly
    if (!account) {
      alert("Please sign in to create a game");
      return;
    }

    // Check if account has the required properties
    try {
      if (!account.accountAddress || typeof account.accountAddress.toString !== 'function') {
        throw new Error("Invalid account object: missing or corrupted accountAddress");
      }
      
      // Test that we can access the address without errors
      const addressTest = account.accountAddress.toString();
      if (!addressTest || addressTest.length < 10) {
        throw new Error("Invalid account address format");
      }
    } catch (accountError) {
      console.error("Account validation failed:", accountError);
      alert("Your session data appears to be corrupted. Please refresh the page and sign in again.");
      return;
    }

    setIsLoading(true);
    try {
      // Validate that all players have addresses or ANS names
      const team0AddressInputs = team0Players.map(p => p.address.trim()).filter(addr => addr);
      const team1AddressInputs = team1Players.map(p => p.address.trim()).filter(addr => addr);

      if (team0AddressInputs.length < 2 || team1AddressInputs.length < 2) {
        alert("Each team must have at least 2 players with valid addresses or ANS names");
        return;
      }

      // Resolve all addresses (including ANS names)
      const team0Addresses: string[] = [];
      const team1Addresses: string[] = [];

      try {
        // Resolve team 0 addresses
        for (const addressInput of team0AddressInputs) {
          const resolvedAddress = await resolveAddress(addressInput);
          team0Addresses.push(resolvedAddress);
        }

        // Resolve team 1 addresses
        for (const addressInput of team1AddressInputs) {
          const resolvedAddress = await resolveAddress(addressInput);
          team1Addresses.push(resolvedAddress);
        }
      } catch (error) {
        alert(`Address resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }

      // Convert string addresses to AccountAddress objects
      const team0AccountAddresses = team0Addresses.map(addr => AccountAddress.from(addr));
      const team1AccountAddresses = team1Addresses.map(addr => AccountAddress.from(addr));

      // Build the transaction payload
      const payload = buildCreateGamePayload({
        team0Players: team0AccountAddresses,
        team1Players: team1AccountAddresses,
        team0Name: "Team 1", // Default team names for now
        team1Name: "Team 2",
        targetScore: parseInt(targetScore),
        canvasWidth: parseInt(canvasSize),
        canvasHeight: parseInt(canvasSize),
        roundDuration: parseInt(roundDuration),
      });

      // Submit transaction using keyless account
      const transaction = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: payload,
      });
      const response = await aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      // Wait for transaction to be processed
      const gameResult = await aptos.waitForTransaction({
        transactionHash: response.hash,
      });

      if (gameResult.type !== TransactionResponseType.User) {
        throw new Error("Transaction failed");
      }

      console.log(gameResult.events);

      const gameCreatedEvent = gameResult.events.find(event => event.type === `${MODULE_ADDRESS}::pictionary::GameCreated`);
      if (!gameCreatedEvent) {
        throw new Error("Game created event not found");
      }

      const gameAddress = gameCreatedEvent.data.game_address;
      if (!gameAddress) {
        throw new Error("Game address not found in events");
      }

      onGameCreated(gameAddress);
    } catch (error) {
      console.error("Failed to create game:", error);
      alert(`Failed to create game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTeamInputs = (
    team: 0 | 1,
    players: PlayerInput[],
    teamName: string
  ) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">{teamName}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addPlayer(team)}
          className="h-8 w-8 p-0"
        >
          <Plus size={16} />
        </Button>
      </div>
      {players.map((player, index) => {
        const isPrefilledUser = team === 0 && index === 0 && player.address === userDisplayName && userDisplayName !== "";
        return (
          <div key={player.id} className="flex gap-2 items-center">
            <Input
              placeholder={
                team === 0 && index === 0 
                  ? `Your address${userDisplayName ? " (auto-filled)" : ""}` 
                  : `Player ${index + 1} address or ANS name`
              }
              value={player.address}
              onChange={(e) =>
                updatePlayerAddress(team, player.id, e.target.value)
              }
              className={`flex-1 ${isPrefilledUser ? "bg-blue-50 border-blue-200" : ""}`}
            />
            {isPrefilledUser && (
              <span className="text-xs text-blue-600 font-medium px-2">You</span>
            )}
            {players.length > 2 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removePlayer(team, player.id)}
                className="h-8 w-8 p-0"
              >
                <Minus size={16} />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={() => !isLoading && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Game</DialogTitle>
          <DialogDescription>
            Set up a new Pictionary game with your friends
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderTeamInputs(0, team0Players, "Team 1")}
            {renderTeamInputs(1, team1Players, "Team 2")}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetScore">Target Score</Label>
              <Input
                id="targetScore"
                type="number"
                min="1"
                max="50"
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="canvasSize">Canvas Size</Label>
              <Input
                id="canvasSize"
                type="number"
                min="200"
                max="1000"
                value={canvasSize}
                onChange={(e) => setCanvasSize(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roundDuration">Round Duration (seconds)</Label>
              <Input
                id="roundDuration"
                type="number"
                min="10"
                max="300"
                value={roundDuration}
                onChange={(e) => setRoundDuration(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGame}
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Game"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
