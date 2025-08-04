import { useState } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import { AccountAddress } from "@aptos-labs/ts-sdk";
// Internal Components
import { Header } from "@/components/Header";
import { GameInterface } from "@/components/GameInterface";
import { CreateGameModal } from "@/components/CreateGameModal";
import { GoogleCallback } from "@/components/GoogleCallback";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
      <Header />
      <div className="flex-1 flex">
        {activeAccount ? (
          <div className="flex items-center justify-center flex-col flex-1 p-8">
            <div className="artist-card text-center p-8 max-w-2xl bounce-in paint-splatter polka-dots zigzag-border">
              <div className="flex items-center justify-center mb-6">
                <div className="w-20 h-20 bg-studio-blue rounded-full paint-blob flex items-center justify-center mr-4 fun-shadow paint-splatters">
                  <span className="text-4xl">🎨</span>
                </div>
                <div className="w-16 h-16 bg-studio-yellow rounded-full paint-blob flex items-center justify-center mr-3 fun-shadow">
                  <span className="text-3xl">✨</span>
                </div>
                <div className="w-12 h-12 bg-studio-pink rounded-full paint-blob flex items-center justify-center fun-shadow">
                  <span className="text-2xl">🖌️</span>
                </div>
              </div>
              <h1 className="font-bubbly text-5xl text-studio-blue mb-4 drop-shadow-sm crayon-scribble">
                Welcome to the Art Studio! 🎭
              </h1>
              <p className="font-bouncy text-xl text-gray-700 mb-8 leading-relaxed">
                Ready to unleash your creativity? Create a new canvas or join your friends 
                in an artistic adventure! Let's paint some masterpieces together! 🌈
              </p>
              
              <div className="mb-8">
                <Button 
                  onClick={handleCreateGame} 
                  className="palette-button bg-studio-orange hover:bg-studio-yellow text-white font-bold px-10 py-5 text-xl flex items-center gap-4 border-0 hover:scale-105 transition-all duration-300 fun-shadow mx-auto paint-splatters"
                >
                  <Plus size={28} className="paint-drip" />
                  <span className="font-bubbly">New Art Adventure!</span>
                  <span className="text-3xl">🎨</span>
                </Button>
              </div>
              
              <div className="flex justify-center gap-4">
                <div className="w-10 h-10 bg-studio-green rounded-full paint-blob animate-bounce paint-splatters"></div>
                <div className="w-8 h-8 bg-studio-purple rounded-full paint-blob animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-12 h-12 bg-studio-orange rounded-full paint-blob animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-6 h-6 bg-studio-pink rounded-full paint-blob animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center flex-col flex-1 p-8">
            <div className="artist-card text-center p-8 max-w-xl bounce-in">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-studio-purple rounded-full paint-blob flex items-center justify-center fun-shadow">
                  <span className="text-3xl">🔐</span>
                </div>
              </div>
              <h1 className="font-playful text-3xl text-studio-purple mb-4">
                Join the Art Party! 🎉
              </h1>
              <p className="text-lg text-gray-700 leading-relaxed">
                Sign in with your Google account to start creating amazing artwork 
                with friends in our magical art studio!
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
          <div className="flex items-center justify-center flex-col flex-1 p-8">
            <div className="artist-card text-center p-8 max-w-xl bounce-in">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-studio-red rounded-full paint-blob flex items-center justify-center fun-shadow">
                  <span className="text-3xl">🚫</span>
                </div>
              </div>
              <h1 className="font-playful text-3xl text-studio-red mb-4">
                Oops! Sign In Needed 🎨
              </h1>
              <p className="text-lg text-gray-700 leading-relaxed">
                To join this amazing art session, please sign in with your Google account first!
              </p>
            </div>
          </div>
        ) : !validGameAddress ? (
          <div className="flex items-center justify-center flex-col flex-1 p-8">
            <div className="artist-card text-center p-8 max-w-xl bounce-in paint-splatter">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-studio-orange rounded-full paint-blob flex items-center justify-center fun-shadow wobble">
                  <span className="text-3xl">🎯</span>
                </div>
              </div>
              <h1 className="font-playful text-3xl text-studio-orange mb-4">
                Canvas Not Found! 🖼️
              </h1>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Hmm, this game address "{gameAddress}" doesn't lead to any artwork. 
                Let's go back to the studio and find another canvas!
              </p>
              <button 
                onClick={() => navigate("/")} 
                className="palette-button bg-studio-blue hover:bg-studio-purple text-white font-bold px-6 py-3 rounded-full transition-all duration-300 fun-shadow"
              >
                🏠 Back to Studio
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
