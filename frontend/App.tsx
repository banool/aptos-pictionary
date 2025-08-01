import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
// Internal Components
import { Header } from "@/components/Header";
import { GameInterface } from "@/components/GameInterface";
import { CreateGameModal } from "@/components/CreateGameModal";

function App() {
  const { connected } = useWallet();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentGameAddress, setCurrentGameAddress] = useState<string | null>(null);

  const handleCreateGame = () => {
    setShowCreateModal(true);
  };

  const handleGameCreated = (gameAddress: string) => {
    setCurrentGameAddress(gameAddress);
    setShowCreateModal(false);
    // Navigate to the game URL with the object address
    window.history.pushState({}, "", `/${gameAddress}`);
  };

  return (
    <>
      <Header onCreateGame={connected ? handleCreateGame : undefined} />
      <div className="flex-1 flex">
        {connected ? (
          currentGameAddress ? (
            <GameInterface gameAddress={currentGameAddress} />
          ) : (
            <div className="flex items-center justify-center flex-col flex-1">
              <div className="card text-center">
                <h1 className="text-2xl font-bold mb-4">Welcome to Aptos Pictionary!</h1>
                <p className="text-muted-foreground mb-6">
                  Create a new game or join an existing one to start playing.
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center flex-col flex-1">
            <div className="card text-center">
              <h1 className="text-xl font-bold mb-4">Connect Your Wallet</h1>
              <p className="text-muted-foreground">
                To get started, please connect your Aptos wallet.
              </p>
            </div>
          </div>
        )}
      </div>

      <CreateGameModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGameCreated={handleGameCreated}
      />
    </>
  );
}

export default App;
