import { useState } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import { AccountAddress } from "@aptos-labs/ts-sdk";
// Internal Components
import { Header } from "@/components/Header";
import { GameInterface } from "@/components/GameInterface";
import { CreateGameModal } from "@/components/CreateGameModal";
import { GoogleCallback } from "@/components/GoogleCallback";
import { useAuthStore } from "@/store/auth";

// Home page component
function HomePage() {
  const activeAccount = useAuthStore(state => state.activeAccount);
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
    <div className="flex flex-col min-h-screen">
      <Header onCreateGame={activeAccount ? handleCreateGame : undefined} />
      <div className="flex-1 flex">
        {activeAccount ? (
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
              <h1 className="text-xl font-bold mb-4">Sign in to Play</h1>
              <p className="text-muted-foreground">
                To get started, please sign in with your Google account.
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
    </div>
  );
}

// Game page component
function GamePage() {
  const activeAccount = useAuthStore(state => state.activeAccount);
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
    <div className="flex flex-col min-h-screen">
      <Header onCreateGame={activeAccount ? handleCreateGame : undefined} />
      <div className="flex-1 flex">
        {!activeAccount ? (
          <div className="flex items-center justify-center flex-col flex-1">
            <div className="card text-center">
              <h1 className="text-xl font-bold mb-4">Sign in Required</h1>
              <p className="text-muted-foreground">
                To view and play games, please sign in with your Google account.
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
    </div>
  );
}

// Main App component with routing
function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />
      <Route path="/:gameAddress" element={<GamePage />} />
    </Routes>
  );
}

export default App;
