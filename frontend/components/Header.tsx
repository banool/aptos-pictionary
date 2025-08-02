import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/LoginButton";
import { AptBalanceDisplay } from "@/components/AptBalanceDisplay";
import { Plus } from "lucide-react";

interface HeaderProps {
  onCreateGame?: () => void;
}

export function Header({ onCreateGame }: HeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 max-w-screen-xl mx-auto w-full flex-wrap">
      <h1 className="display cursor-pointer hover:text-blue-600" onClick={() => window.location.href = '/'}>Aptos Pictionary</h1>

      <div className="flex gap-2 items-center flex-wrap">
        <AptBalanceDisplay />
        {onCreateGame && (
          <Button onClick={onCreateGame} size="sm" className="flex items-center gap-2">
            <Plus size={16} />
            Create Game
          </Button>
        )}
        <LoginButton />
      </div>
    </div>
  );
}
