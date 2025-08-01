import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
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
import { aptos } from "@/utils/aptos";
import { PICTIONARY_MODULE_ADDRESS } from "@/constants";

interface CreateGameModalProps {
  open: boolean;
  onClose: () => void;
  onGameCreated: (gameAddress: string) => void;
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
  const { account, signAndSubmitTransaction } = useWallet();
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
  const [roundDuration, setRoundDuration] = useState("30");
  const [isLoading, setIsLoading] = useState(false);

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

  const handleCreateGame = async () => {
    if (!account) return;

    setIsLoading(true);
    try {
      // Validate that all players have addresses
      const team0Addresses = team0Players.map(p => p.address.trim()).filter(addr => addr);
      const team1Addresses = team1Players.map(p => p.address.trim()).filter(addr => addr);

      if (team0Addresses.length < 2 || team1Addresses.length < 2) {
        alert("Each team must have at least 2 players with valid addresses");
        return;
      }

      // Validate address format (basic check)
      const addressRegex = /^0x[a-fA-F0-9]{1,64}$/;
      const allAddresses = [...team0Addresses, ...team1Addresses];
      for (const addr of allAddresses) {
        if (!addressRegex.test(addr)) {
          alert(`Invalid address format: ${addr}`);
          return;
        }
      }

      // Call the smart contract to create the game
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: `${PICTIONARY_MODULE_ADDRESS}::pictionary::create_game`,
          functionArguments: [
            team0Addresses,
            team1Addresses,
            parseInt(targetScore),
            parseInt(canvasSize),
            parseInt(canvasSize),
            parseInt(roundDuration),
          ],
        },
      });

      const gameResult = await aptos.waitForTransaction({
        transactionHash: response.hash,
      });

      console.log("Game created successfully:", gameResult);

      // TODO: Extract actual game address from events
      // For now, use a mock address based on transaction hash
      const gameAddress = PICTIONARY_MODULE_ADDRESS.slice(0, 10) + response.hash.slice(2, 12);
      
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
      {players.map((player, index) => (
        <div key={player.id} className="flex gap-2 items-center">
          <Input
            placeholder={`Player ${index + 1} address or ANS name`}
            value={player.address}
            onChange={(e) =>
              updatePlayerAddress(team, player.id, e.target.value)
            }
            className="flex-1"
          />
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
      ))}
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