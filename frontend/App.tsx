import { useState } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { AccountAddress } from "@aptos-labs/ts-sdk";
// Internal Components
import { Header } from "@/components/Header";
import { GameInterface } from "@/components/GameInterface";
import { CreateGameModal } from "@/components/CreateGameModal";

// Home page component
function HomePage() {
  const { connected } = useWallet();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateGame = () => {
    setShowCreateModal(true);
  };

  const handleGameCreated = (gameAddress: AccountAddress) => {
    setShowCreateModal(false);
    // Navigate to the game URL with the object address
    navigate(`/${gameAddress.toString()}`);
  };

  return (
    <>
      <Header onCreateGame={connected ? handleCreateGame : undefined} />
      <div className="flex-1 flex">
        {connected ? (
          <div className="flex items-center justify-center flex-col flex-1">
            <div className="card text-center">
              <h1 className="text-2xl font-bold mb-4">Welcome to Aptos Pictionary!</h1>
              <p className="text-muted-foreground mb-6">
                Create a new game or join an existing one to start playing.
              </p>
            </div>
          </div>
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

// Game page component
function GamePage() {
  const { connected } = useWallet();
  const navigate = useNavigate();
  const { gameAddress } = useParams<{ gameAddress: string }>();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateGame = () => {
    setShowCreateModal(true);
  };

  const handleGameCreated = (gameAddress: AccountAddress) => {
    setShowCreateModal(false);
    // Navigate to the new game URL
    navigate(`/${gameAddress.toString()}`);
  };

  // Validate the game address
  let validGameAddress: AccountAddress | null = null;
  try {
    if (gameAddress) {
      validGameAddress = AccountAddress.from(gameAddress);
    }
  } catch (error) {
    console.error("Invalid game address:", error);
  }

  return (
    <>
      <Header onCreateGame={connected ? handleCreateGame : undefined} />
      <div className="flex-1 flex">
        {!connected ? (
          <div className="flex items-center justify-center flex-col flex-1">
            <div className="card text-center">
              <h1 className="text-xl font-bold mb-4">Connect Your Wallet</h1>
              <p className="text-muted-foreground">
                To view and play games, please connect your Aptos wallet.
              </p>
            </div>
          </div>
        ) : !validGameAddress ? (
          <div className="flex items-center justify-center flex-col flex-1">
            <div className="card text-center">
              <h1 className="text-xl font-bold mb-4">Invalid Game Address</h1>
              <p className="text-muted-foreground mb-4">
                The game address "{gameAddress}" is not valid.
              </p>
              <button 
                onClick={() => navigate("/")} 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Go Home
              </button>
            </div>
          </div>
        ) : (
          <GameInterface gameAddress={validGameAddress} />
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

// Main App component with routing
function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/:gameAddress" element={<GamePage />} />
    </Routes>
  );
}

export default App;
