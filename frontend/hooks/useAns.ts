import { useQuery, useQueries } from "@tanstack/react-query";
import { AccountAddress } from "@aptos-labs/ts-sdk";
import { aptos } from "@/utils/aptos";

// Query key factory for ANS queries
const ansKeys = {
  all: ['ans'] as const,
  primaryName: (address: string) => [...ansKeys.all, 'primaryName', address] as const,
  targetAddress: (name: string) => [...ansKeys.all, 'targetAddress', name] as const,
};

// Hook to get primary ANS name for an address
export function useAnsPrimaryName(address: string | AccountAddress | null) {
  const addressStr = address?.toString() ?? null;
  
  return useQuery({
    queryKey: ansKeys.primaryName(addressStr ?? ''),
    queryFn: async () => {
      if (!addressStr) return null;
      
      try {
        const ansName = await aptos.ans.getPrimaryName({ address: addressStr });
        return ansName || null;
      } catch (error) {
        console.log(`No ANS name found for address: ${addressStr}`, error);
        return null;
      }
    },
    enabled: !!addressStr,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 48 * 60 * 60 * 1000, // 48 hours (garbage collection time)
  });
}

// Hook to get multiple ANS names for multiple addresses
export function useAnsMultiplePrimaryNames(addresses: (string | AccountAddress)[]) {
  const addressStrings = addresses.map(addr => addr.toString());
  
  return useQueries({
    queries: addressStrings.map(address => ({
      queryKey: ansKeys.primaryName(address),
      queryFn: async () => {
        try {
          const ansName = await aptos.ans.getPrimaryName({ address });
          return { address, ansName: ansName || null };
        } catch (error) {
          console.log(`No ANS name found for address: ${address}`, error);
          return { address, ansName: null };
        }
      },
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
      gcTime: 48 * 60 * 60 * 1000, // 48 hours
    }))
  });
}

// Hook to resolve ANS name to address
export function useAnsTargetAddress(name: string | null) {
  return useQuery({
    queryKey: ansKeys.targetAddress(name ?? ''),
    queryFn: async () => {
      if (!name) return null;
      
      try {
        const targetAddress = await aptos.ans.getTargetAddress({ name });
        return targetAddress || null;
      } catch (error) {
        console.error(`Failed to resolve ANS name "${name}":`, error);
        return null;
      }
    },
    enabled: !!name && name.endsWith('.apt'),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 48 * 60 * 60 * 1000, // 48 hours
  });
}

// Helper function to get display name (ANS name or truncated address)
export function getDisplayName(address: string | AccountAddress, ansName: string | null): string {
  if (ansName) {
    return ansName;
  }
  
  const addressStr = address.toString();
  return `${addressStr.slice(0, 6)}...${addressStr.slice(-4)}`;
}