import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/LoginButton";
import { AptBalanceDisplay } from "@/components/AptBalanceDisplay";
import { Plus, Palette, Home } from "lucide-react";

interface HeaderProps {
  onCreateGame?: () => void;
  showBackButton?: boolean;
}

export function Header({ onCreateGame, showBackButton }: HeaderProps) {
  return (
    <div className="studio-header relative z-10">
      <div className="flex items-center justify-between px-6 py-4 max-w-screen-xl mx-auto w-full flex-wrap relative z-10">
        <div 
          className="flex items-center gap-3 cursor-pointer group paint-splatter" 
          onClick={() => window.location.href = '/'}
        >
          <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full paint-blob shadow-lg">
            <Palette className="text-studio-blue w-6 h-6" />
          </div>
          <h1 className="font-bubbly text-white text-3xl drop-shadow-lg group-hover:text-studio-yellow transition-colors duration-300 paint-splatters">
            🎨 Aptos Pictionary
          </h1>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          {showBackButton && (
            <Button 
              onClick={() => window.location.href = '/'} 
              className="palette-button bg-studio-blue hover:bg-studio-purple text-white font-semibold px-4 py-2 flex items-center gap-2 border-0 hover:scale-105 transition-all duration-300"
            >
              <Home size={18} className="paint-drip" />
              <span className="font-bold">Home</span>
            </Button>
          )}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1 shadow-lg">
            <AptBalanceDisplay />
          </div>
          {onCreateGame && (
            <Button 
              onClick={onCreateGame} 
              className="palette-button bg-studio-orange hover:bg-studio-yellow text-white font-semibold px-4 py-2 flex items-center gap-2 border-0 hover:scale-105 transition-all duration-300"
            >
              <Plus size={18} className="paint-drip" />
              <span className="font-bold">New Game</span>
            </Button>
          )}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg">
            <LoginButton />
          </div>
        </div>
      </div>
      
      {/* Paint splotches decoration */}
      <div className="absolute top-2 left-1/4 w-4 h-4 bg-studio-pink rounded-full opacity-20 paint-blob"></div>
      <div className="absolute bottom-2 right-1/3 w-6 h-6 bg-studio-green rounded-full opacity-15 paint-blob"></div>
      <div className="absolute top-1/2 left-1/6 w-3 h-3 bg-studio-yellow rounded-full opacity-25 paint-blob"></div>
    </div>
  );
}
