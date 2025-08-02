import { useAptBalance } from "@/hooks/useAptBalance";
import { useAuthStore } from "@/store/auth";
import { getFaucetUrl } from "@/utils/balance";
import { Button } from "@/components/ui/button";
import { Coins, RefreshCw, ExternalLink } from "lucide-react";

/**
 * Component that displays the user's APT balance in the header
 */
export function AptBalanceDisplay() {
  const activeAccount = useAuthStore(state => state.activeAccount);
  const { balance, isLoading, error, refetch } = useAptBalance();

  if (!activeAccount) return null;

  const faucetUrl = getFaucetUrl(activeAccount.accountAddress);

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg border">
      <Coins className="h-4 w-4 text-yellow-600" />
      
      {isLoading ? (
        <div className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-1">
          <span className="text-sm text-red-600">Error</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={refetch}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      ) : balance ? (
        <div className="flex items-center gap-2">
          <span className={`text-sm font-mono ${
            balance.balanceNumber < 1000000 ? 'text-amber-600' : 'text-gray-700'
          }`}>
            {balance.balance} APT
          </span>
          
          {balance.balanceNumber < 1000000 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(faucetUrl, '_blank')}
              className="h-6 px-2 text-xs flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Get APT
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={refetch}
            className="h-6 w-6 p-0"
            title="Refresh balance"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}