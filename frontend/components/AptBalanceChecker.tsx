import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { checkAptBalance, getFaucetUrl } from "@/utils/balance";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Coins } from "lucide-react";

/**
 * Component that checks APT balance after login and prompts user to get testnet APT if needed
 */
export function AptBalanceChecker() {
  const activeAccount = useAuthStore(state => state.activeAccount);
  const triggerBalanceRefresh = useAuthStore(state => state.triggerBalanceRefresh);
  const [showFaucetPrompt, setShowFaucetPrompt] = useState(false);
  const [balance, setBalance] = useState<{
    hasBalance: boolean;
    balance: string;
    balanceNumber: number;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [hasCheckedThisSession, setHasCheckedThisSession] = useState(false);

  useEffect(() => {
    // Only check balance once per session when user first logs in
    if (!activeAccount || hasCheckedThisSession || isChecking) return;

    const checkBalance = async () => {
      setIsChecking(true);
      try {
        const balanceResult = await checkAptBalance(activeAccount.accountAddress);
        setBalance(balanceResult);
        
        // Show faucet prompt if user has no or very little APT (less than 0.01 APT)
        // 0.01 APT = 1,000,000 octas (enough for several transactions)
        const minimumBalance = 1000000; // 0.01 APT in octas
        if (balanceResult.balanceNumber < minimumBalance) {
          setShowFaucetPrompt(true);
        }
        
        setHasCheckedThisSession(true);
      } catch (error) {
        console.error("Failed to check APT balance:", error);
        // Show faucet prompt on error (better safe than sorry)
        setShowFaucetPrompt(true);
        setHasCheckedThisSession(true);
      } finally {
        setIsChecking(false);
      }
    };

    // Small delay to ensure account is fully loaded
    const timeoutId = setTimeout(checkBalance, 1000);
    return () => clearTimeout(timeoutId);
  }, [activeAccount, hasCheckedThisSession, isChecking]);

  // Reset check when user logs out
  useEffect(() => {
    if (!activeAccount) {
      setHasCheckedThisSession(false);
      setShowFaucetPrompt(false);
      setBalance(null);
    }
  }, [activeAccount]);

  if (!activeAccount || !showFaucetPrompt) return null;

  const faucetUrl = getFaucetUrl(activeAccount.accountAddress);
  const truncatedAddress = `${activeAccount.accountAddress.toString().slice(0, 6)}...${activeAccount.accountAddress.toString().slice(-4)}`;

  return (
    <Dialog open={showFaucetPrompt} onOpenChange={setShowFaucetPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-6 w-6 text-yellow-500" />
            Get Testnet APT
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-4">
              <div>
                Your account ({truncatedAddress}) needs testnet APT to pay for transaction fees when creating games and making guesses.
              </div>
              
              {balance && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Current APT Balance: <span className="font-mono font-medium">{balance.balance} APT</span>
                  </p>
                  {balance.balanceNumber > 0 && balance.balanceNumber < 1000000 && (
                    <p className="text-xs text-amber-600 mt-1">
                      You have some APT, but might need more for multiple transactions
                    </p>
                  )}
                </div>
              )}
              
              <div>
                Visit the Aptos faucet to get free testnet APT (about 1 APT) for your account:
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => window.open(faucetUrl, '_blank')}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Get Testnet APT
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              setShowFaucetPrompt(false);
              // Trigger balance refresh in the header after user potentially got APT
              triggerBalanceRefresh();
            }}
          >
            Done
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          💡 Tip: You'll need APT to create games and make guesses in Pictionary
        </div>
      </DialogContent>
    </Dialog>
  );
}
