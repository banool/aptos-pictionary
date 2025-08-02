import { useState, useEffect } from "react";
import { checkAptBalance } from "@/utils/balance";
import { useAuthStore } from "@/store/auth";

/**
 * Hook to check and monitor APT balance for the active account
 */
export function useAptBalance() {
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const refreshTrigger = useAuthStore((state) => state._balanceRefreshTrigger);
  const [balance, setBalance] = useState<{
    hasBalance: boolean;
    balance: string;
    balanceNumber: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetchBalance = async () => {
    if (!activeAccount) {
      setBalance(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const balanceResult = await checkAptBalance(activeAccount.accountAddress);
      setBalance(balanceResult);
    } catch (err) {
      console.error("Failed to fetch APT balance:", err);
      setError("Failed to fetch balance");
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch balance when account changes or refresh is triggered
  useEffect(() => {
    refetchBalance();
  }, [activeAccount, refreshTrigger]);

  return {
    balance,
    isLoading,
    error,
    refetch: refetchBalance,
    hasAccount: !!activeAccount,
  };
}
