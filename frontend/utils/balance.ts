import { AccountAddress } from "@aptos-labs/ts-sdk";
import { aptos } from "@/utils/aptos";

/**
 * Check if an account has APT balance
 * @param accountAddress - The account address to check
 * @returns Promise<{ hasBalance: boolean; balance: string; balanceNumber: number }>
 */
export async function checkAptBalance(accountAddress: AccountAddress): Promise<{
  hasBalance: boolean;
  balance: string;
  balanceNumber: number;
}> {
  try {
    // Get APT balance (APT has 8 decimals)
    const balance = await aptos.getAccountAPTAmount({
      accountAddress,
    });

    const balanceNumber = Number(balance);
    const hasBalance = balanceNumber > 0;

    // Format balance for display (convert from octas to APT)
    const formattedBalance = (balanceNumber / Math.pow(10, 8)).toFixed(2);

    return {
      hasBalance,
      balance: formattedBalance,
      balanceNumber,
    };
  } catch (error) {
    console.error("Failed to check APT balance:", error);
    // If we can't check the balance, assume they need funds
    return {
      hasBalance: false,
      balance: "0",
      balanceNumber: 0,
    };
  }
}

/**
 * Generate the faucet URL for a given address
 * @param accountAddress - The account address
 * @returns The faucet URL string
 */
export function getFaucetUrl(accountAddress: AccountAddress): string {
  return `https://aptos.dev/network/faucet?address=${accountAddress.toString()}`;
}
