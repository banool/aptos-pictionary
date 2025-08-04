import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { Copy, LogOut, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface UserMenuProps {
  className?: string;
}

export function UserMenu({ className }: UserMenuProps) {
  const activeAccount = useAuthStore(state => state.activeAccount);
  const clear = useAuthStore(state => state.clear);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!activeAccount) {
    return null;
  }

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(activeAccount.accountAddress.toString());
      setCopied(true);
      toast({
        title: "Address Copied",
        description: `Copied: ${activeAccount.accountAddress.toString()}`,
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Failed to copy address to clipboard",
      });
    }
  };

  const handleDisconnect = () => {
    // Clear everything to ensure clean logout
    clear();
    toast({
      title: "Disconnected",
      description: "Successfully signed out",
    });
  };

  const truncatedAddress = `${activeAccount.accountAddress.toString().slice(0, 6)}...${activeAccount.accountAddress.toString().slice(-4)}`;

  return (
    <div className={`flex items-center gap-2 px-4 ${className}`}>
      {/* Account address display */}
      <span className="text-sm text-gray-600 font-mono">
        {truncatedAddress}
      </span>
      
      {/* Copy address button */}
      <Button
        onClick={handleCopyAddress}
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        title={`Copy full address: ${activeAccount.accountAddress.toString()}`}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
      
      {/* Disconnect button */}
      <Button
        onClick={handleDisconnect}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <LogOut className="h-4 w-4" />
        Disconnect
      </Button>
    </div>
  );
}