/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Authentication Store with Enhanced Error Handling
 *
 * This store manages keyless accounts with BCS serialization and localStorage persistence.
 *
 * TROUBLESHOOTING STORAGE CORRUPTION:
 * If you see errors like "SyntaxError: Unexpected token 'P', "Per keyles"... is not valid JSON"
 * or "Could not restore your session", the localStorage data may be corrupted.
 *
 * To fix:
 * 1. Open browser console and run: clearAuthStorage()
 * 2. Refresh the page
 * 3. Sign in again
 *
 * The store now automatically detects and clears corrupted data in most cases.
 */

import { EphemeralKeyPair, KeylessAccount, ProofFetchStatus } from "@aptos-labs/ts-sdk";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { aptos } from "@/utils/aptos";
import { GOOGLE_CLIENT_ID } from "@/constants";
import {
  createEphemeralKeyPair,
  isValidEphemeralKeyPair,
  validateEphemeralKeyPair,
  validateIdToken,
  validateKeylessAccount,
  EphemeralKeyPairEncoding,
  KeylessAccountEncoding,
  StoredAccount,
  KeylessAccountPublic,
  EncryptedScopedIdToken,
} from "@/utils/auth";
import { useMemo } from "react";
import { jwtDecode, JwtPayload } from "jwt-decode";

type KeylessAccountsState = {
  accounts: StoredAccount[];
  activeAccount?: KeylessAccount;
  ephemeralKeyPair?: EphemeralKeyPair;
  _hasHydrated: boolean;
  _balanceRefreshTrigger: number;
};

type KeylessAccountsActions = {
  /**
   * Add an Ephemeral key pair to the store. If the account is invalid, an error is thrown.
   */
  commitEphemeralKeyPair: (keyPair: EphemeralKeyPair) => void;

  /**
   * Disconnects the active account from the store.
   */
  disconnectKeylessAccount: () => void;

  /**
   * Retrieve the Ephemeral key pair from the store.
   */
  getEphemeralKeyPair: () => EphemeralKeyPair | undefined;

  /**
   * Switches the active account to the one associated with the provided idToken.
   */
  switchKeylessAccount: (idToken: string) => Promise<KeylessAccount | undefined>;

  /**
   * Derives a keyless account from the provided idToken.
   */
  deriveKeylessAccount: (idToken: string) => Promise<{
    derivedAccount: KeylessAccount;
    decodedToken: EncryptedScopedIdToken;
    storedAccount?: StoredAccount;
  }>;

  setHasHydrated: (value: boolean) => void;
  clear: () => void;

  triggerBalanceRefresh: () => void;

  clearCorruptedStorage: () => void;
};

// Create custom storage with better error handling
const createSafeStorage = () => {
  return {
    getItem: (name: string): string | null => {
      try {
        const item = localStorage.getItem(name);
        if (!item) return null;

        // Try to parse JSON to validate it's not corrupted
        JSON.parse(item);
        return item;
      } catch (error) {
        console.error("Corrupted localStorage data detected:", error);
        console.warn("Clearing corrupted auth storage data");

        // Clear corrupted data
        try {
          localStorage.removeItem(name);
        } catch (clearError) {
          console.error("Failed to clear corrupted storage:", clearError);
        }

        return null;
      }
    },

    setItem: (name: string, value: string): void => {
      try {
        // Validate JSON before storing
        JSON.parse(value);
        localStorage.setItem(name, value);
      } catch (error) {
        console.error("Failed to store auth data:", error);
        // Don't throw - just log the error
      }
    },

    removeItem: (name: string): void => {
      try {
        localStorage.removeItem(name);
      } catch (error) {
        console.error("Failed to remove auth data:", error);
      }
    },
  };
};

const storage = createJSONStorage<KeylessAccountsState>(() => createSafeStorage(), {
  replacer: (_, value) => {
    if (typeof value === "bigint") return { __type: "bigint", value: value.toString() };
    if (value instanceof Uint8Array) return { __type: "Uint8Array", value: Array.from(value) };
    if (value instanceof EphemeralKeyPair) return EphemeralKeyPairEncoding.encode(value);
    if (value instanceof KeylessAccount) return KeylessAccountEncoding.encode(value);
    return value;
  },
  reviver: (_, value: any) => {
    if (value && value.__type === "bigint") return BigInt(value.value);
    if (value && value.__type === "Uint8Array") return new Uint8Array(value.value);
    if (value && value.__type === "EphemeralKeyPair") {
      try {
        return EphemeralKeyPairEncoding.decode(value);
      } catch (error) {
        console.warn("Failed to decode EphemeralKeyPair, skipping:", error);
        return undefined;
      }
    }
    if (value && value.__type === "KeylessAccount") {
      try {
        return KeylessAccountEncoding.decode(value);
      } catch (error) {
        console.warn("Failed to decode KeylessAccount, skipping:", error);
        return undefined;
      }
    }
    return value;
  },
});

const useAuthStore = create<KeylessAccountsState & KeylessAccountsActions>()(
  persist(
    (set, get) => ({
      // Initial state
      accounts: [],
      activeAccount: undefined,
      ephemeralKeyPair: undefined,
      _hasHydrated: false,
      _balanceRefreshTrigger: 0,

      // Actions
      commitEphemeralKeyPair: (keyPair: EphemeralKeyPair) => {
        const valid = isValidEphemeralKeyPair(keyPair);
        if (!valid) {
          throw new Error("commitEphemeralKeyPair: Invalid ephemeral key pair provided");
        }
        set({ ephemeralKeyPair: keyPair });
      },

      disconnectKeylessAccount: () => {
        set({ activeAccount: undefined });
      },

      getEphemeralKeyPair: () => {
        const account = get().activeAccount;
        return account?.ephemeralKeyPair ? validateEphemeralKeyPair(account.ephemeralKeyPair) : get().ephemeralKeyPair;
      },

      switchKeylessAccount: async (idToken: string) => {
        const decodedToken = validateIdToken(idToken);
        if (!decodedToken) {
          throw new Error("switchKeylessAccount: Invalid idToken provided, could not decode");
        }

        // First, check if we have a stored account for this user
        const storedAccount = get().accounts.find((a) => a.idToken.decoded.sub === decodedToken.sub);
        
        // Check if we have an activeAccount that matches this user and is still valid
        const currentActiveAccount = get().activeAccount;
        if (currentActiveAccount && storedAccount) {
          try {
            // Validate that the current active account matches this user
            const currentAccountIdToken = validateIdToken(currentActiveAccount.jwt || '');
            if (currentAccountIdToken && currentAccountIdToken.sub === decodedToken.sub) {
              console.log("✅ Reusing existing valid KeylessAccount - NO API CALL needed");
              
              // Update the stored account with the new token but keep existing account
              set({
                accounts: get().accounts.map((a) =>
                  a.idToken.decoded.sub === decodedToken.sub
                    ? { idToken: { decoded: decodedToken, raw: idToken }, pepper: storedAccount.pepper }
                    : a,
                ),
                activeAccount: currentActiveAccount,
              });

              return currentActiveAccount;
            }
          } catch (error) {
            console.warn("Failed to validate existing active account:", error);
          }
        }

        // Clear active account since we need to derive a new one
        set({ ...get(), activeAccount: undefined }, true);

        if (storedAccount) {
          console.log("📝 Found stored account, attempting derivation with stored pepper");
          
          const ephemeralKeyPair = get().getEphemeralKeyPair();
          if (ephemeralKeyPair && ephemeralKeyPair.nonce === decodedToken.nonce) {
            try {
              // Use stored pepper to avoid hitting keyless prover service
              const activeAccount = await aptos.deriveKeylessAccount({
                ephemeralKeyPair,
                jwt: idToken,
                pepper: storedAccount.pepper,
              });

              // Update the stored account with the new token
              set({
                accounts: get().accounts.map((a) =>
                  a.idToken.decoded.sub === decodedToken.sub
                    ? { idToken: { decoded: decodedToken, raw: idToken }, pepper: storedAccount.pepper }
                    : a,
                ),
                activeAccount,
              });

              console.log("✅ Successfully derived account using stored pepper - limited API usage");
              return activeAccount;
            } catch (error) {
              console.warn("Failed to derive with stored pepper, falling back to full derivation:", error);
            }
          }
        }

        // Fall back to full derivation (only for new users or when stored account fails)
        console.log("🚨 Performing full keyless account derivation - HITTING KEYLESS SERVICE");
        const {
          derivedAccount: activeAccount,
          storedAccount: derivedStoredAccount,
          decodedToken: derivedDecodedToken,
        } = await get().deriveKeylessAccount(idToken);

        const { pepper } = activeAccount;

        if (derivedStoredAccount) {
          set({
            accounts: get().accounts.map((a) =>
              a.idToken.decoded.sub === derivedDecodedToken.sub
                ? { idToken: { decoded: derivedDecodedToken, raw: idToken }, pepper }
                : a,
            ),
            activeAccount,
          });
        } else {
          set({
            accounts: [...get().accounts, { idToken: { decoded: derivedDecodedToken, raw: idToken }, pepper }],
            activeAccount,
          });
        }

        await activeAccount.checkKeylessAccountValidity(aptos.config);
        return activeAccount;
      },

      deriveKeylessAccount: async (idToken: string) => {
        const decodedToken = validateIdToken(idToken);
        if (!decodedToken) {
          // Check if the token is just expired vs completely invalid
          try {
            const decoded = jwtDecode(idToken);
            const currentTime = Math.floor(Date.now() / 1000);
            if (decoded.exp && decoded.exp < currentTime) {
              throw new Error("switchKeylessAccount: ID token has expired");
            }
          } catch (decodeError) {
            // Token is completely invalid
          }
          throw new Error("switchKeylessAccount: Invalid idToken provided, could not decode");
        }

        const ephemeralKeyPair = get().getEphemeralKeyPair();
        if (!ephemeralKeyPair || ephemeralKeyPair?.nonce !== decodedToken.nonce) {
          throw new Error("switchKeylessAccount: Ephemeral key pair not found");
        }

        const proofFetchCallback = async (res: ProofFetchStatus) => {
          if (String(res.status).toLowerCase() === "failed") {
            get().disconnectKeylessAccount();
          }
        };

        const storedAccount = get().accounts.find((a) => a.idToken.decoded.sub === decodedToken.sub);

        let derivedAccount: KeylessAccount | undefined;
        try {
          derivedAccount = await aptos.deriveKeylessAccount({
            ephemeralKeyPair,
            jwt: idToken,
            proofFetchCallback,
          });
        } catch (error: any) {
          console.error("Failed to derive keyless account with pepper service:", error);
          
          // Check if it's a JSON parsing error from service overload
          const errorMessage = error?.message || error?.toString() || "";
          const isJSONParsingError = errorMessage.includes("Unexpected token") || 
                                   errorMessage.includes("SyntaxError") ||
                                   errorMessage.includes("Per keyles") ||
                                   error instanceof SyntaxError;
          
          const isRateLimit = errorMessage.includes("429") || errorMessage.includes("Too Many Requests");
          const isServiceError = errorMessage.includes("404") || errorMessage.includes("Not Found");
          
          // Handle JSON parsing errors (indicates service returning HTML instead of JSON)
          if (isJSONParsingError || isRateLimit || isServiceError) {
            console.warn("Keyless service is overloaded or unavailable, attempting fallback with stored pepper");
            
            if (!storedAccount?.pepper) {
              throw new Error("Keyless authentication service is temporarily overloaded. Please try again in 5-10 minutes, or contact support if this persists.");
            }
            
            // Try with stored pepper as fallback
            try {
              derivedAccount = await aptos.deriveKeylessAccount({
                ephemeralKeyPair,
                jwt: idToken,
                pepper: storedAccount.pepper,
                proofFetchCallback,
              });
            } catch (fallbackError: any) {
              console.error("Fallback pepper derivation also failed:", fallbackError);
              const fallbackErrorMessage = fallbackError?.message || fallbackError?.toString() || "";
              
              if (fallbackErrorMessage.includes("Unexpected token") || fallbackErrorMessage.includes("SyntaxError")) {
                throw new Error("Keyless authentication service is temporarily overloaded. Please try again in 5-10 minutes.");
              }
              
              throw new Error("Authentication failed. Please clear your browser storage and try signing in again.");
            }
          } else {
            // Other types of errors
            throw error;
          }
        }

        if (!derivedAccount || !decodedToken) {
          throw new TypeError("Could not derive account from idToken or stored account");
        }

        return { derivedAccount, decodedToken, storedAccount };
      },

      setHasHydrated: (value: boolean) => {
        set({ _hasHydrated: value });
      },

      clear: () => {
        set({
          accounts: [],
          activeAccount: undefined,
          ephemeralKeyPair: undefined,
        });
      },

      triggerBalanceRefresh: () => {
        set({ _balanceRefreshTrigger: get()._balanceRefreshTrigger + 1 });
      },

      clearCorruptedStorage: () => {
        console.warn("Manually clearing potentially corrupted storage");
        try {
          // Clear localStorage entries
          localStorage.removeItem("auth-storage");

          // Reset store to clean state
          set({
            accounts: [],
            activeAccount: undefined,
            ephemeralKeyPair: undefined,
            _balanceRefreshTrigger: 0,
          });

          console.log("Storage cleared successfully");
        } catch (error) {
          console.error("Failed to clear storage:", error);
        }
      },
    }),
    {
      name: "auth-storage",
      storage,
      version: 2, // Increment version to clear corrupted storage

      merge: (persistedState, currentState) => {
        try {
          if (!persistedState || typeof persistedState !== "object") {
            console.warn("Invalid persisted state, using current state");
            return currentState;
          }

          const merged = { ...currentState, ...(persistedState as object) };

          // Safely validate accounts with error handling
          let validatedAccounts = [];
          try {
            if (Array.isArray((merged as any).accounts)) {
              validatedAccounts = (merged as any).accounts.filter((account: any) => {
                try {
                  return account && typeof account === "object" && account.idToken;
                } catch (err) {
                  console.warn("Skipping invalid account during merge:", err);
                  return false;
                }
              });
            }
          } catch (accountsError) {
            console.warn("Error processing accounts during merge:", accountsError);
          }

          // Safely validate active account
          let validatedActiveAccount = undefined;
          try {
            validatedActiveAccount =
              (merged as any).activeAccount && validateKeylessAccount((merged as any).activeAccount);
          } catch (activeAccountError) {
            console.warn("Error validating active account during merge:", activeAccountError);
          }

          // Safely validate ephemeral key pair
          let validatedEphemeralKeyPair = undefined;
          try {
            validatedEphemeralKeyPair =
              (merged as any).ephemeralKeyPair && validateEphemeralKeyPair((merged as any).ephemeralKeyPair);
          } catch (ephemeralError) {
            console.warn("Error validating ephemeral key pair during merge:", ephemeralError);
          }

          return {
            ...merged,
            accounts: validatedAccounts,
            activeAccount: validatedActiveAccount,
            ephemeralKeyPair: validatedEphemeralKeyPair,
            _balanceRefreshTrigger: 0, // Always reset
          };
        } catch (error) {
          console.error("Critical error during state merge, clearing storage:", error);

          // Clear corrupted storage and return clean state
          try {
            localStorage.removeItem("auth-storage");
          } catch (clearError) {
            console.error("Failed to clear corrupted storage:", clearError);
          }

          return currentState;
        }
      },

      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },

      partialize: ({ activeAccount, ephemeralKeyPair, _balanceRefreshTrigger, ...state }) => ({
        ...state,
        accounts: state.accounts,
        activeAccount: activeAccount && validateKeylessAccount(activeAccount),
        ephemeralKeyPair: ephemeralKeyPair && validateEphemeralKeyPair(ephemeralKeyPair),
        _balanceRefreshTrigger: 0, // Always start at 0, don't persist the trigger counter
      }),
    },
  ),
);

// Hook to get/create ephemeral key pair (following confidential payments example)
export const useEphemeralKeyPair = (): EphemeralKeyPair => {
  const { commitEphemeralKeyPair, getEphemeralKeyPair } = useAuthStore();

  return useMemo(() => {
    let keyPair = getEphemeralKeyPair();

    // If no key pair is found, create a new one and commit it to the store
    if (!keyPair) {
      keyPair = createEphemeralKeyPair();
      commitEphemeralKeyPair(keyPair);
    }

    return keyPair;
  }, [commitEphemeralKeyPair, getEphemeralKeyPair]);
};

// Hook for login functionality
// Utility function for manual storage clearing (available in console)
export const clearAuthStorage = () => {
  console.warn("Manually clearing auth storage...");
  try {
    localStorage.removeItem("auth-storage");
    console.log("Auth storage cleared. Please refresh the page.");
  } catch (error) {
    console.error("Failed to clear auth storage:", error);
  }
};

// Helper function for service overload issues
export const handleServiceOverload = () => {
  console.warn('🚨 Aptos Keyless Service Overload Detected');
  console.log('The Aptos testnet keyless authentication service is experiencing high load.');
  console.log('');
  console.log('Options:');
  console.log('1. Wait 5-10 minutes and try again');
  console.log('2. Clear storage and start fresh: clearAuthStorage()');
  console.log('3. Contact support if issue persists for hours');
  console.log('');
  console.log('Current status: Service returning HTML instead of JSON responses');
};

// Helper function to debug authentication state
export const debugAuthState = () => {
  const state = useAuthStore.getState();
  console.log('🔍 Current Authentication State:');
  console.log('');
  console.log('Stored Accounts:', state.accounts.length);
  state.accounts.forEach((account, i) => {
    console.log(`  ${i + 1}. User: ${account.idToken.decoded.sub}`);
    console.log(`     Email: ${account.idToken.decoded.email || 'N/A'}`);
    console.log(`     Has Pepper: ${account.pepper ? 'Yes' : 'No'}`);
  });
  console.log('');
  console.log('Active Account:', state.activeAccount ? 'Yes' : 'No');
  if (state.activeAccount) {
    console.log('  Has Proof:', state.activeAccount.proof ? 'Yes' : 'No');
    console.log('  Address:', state.activeAccount.accountAddress.toString());
    if (state.activeAccount.jwt) {
      try {
        const decoded = jwtDecode(state.activeAccount.jwt);
        console.log('  User:', (decoded as any).sub);  
        console.log('  Email:', (decoded as any).email || 'N/A');
      } catch (e) {
        console.log('  JWT: Invalid');
      }
    }
  }
  console.log('');
  console.log('Ephemeral Key Pair:', state.ephemeralKeyPair ? 'Yes' : 'No');
  console.log('Has Hydrated:', state._hasHydrated);
  console.log('');
  console.log('Next login should use:', state.activeAccount ? '✅ Stored account (NO API call)' : '🚨 Full derivation (API call)');
};

// Make it available globally for console access
if (typeof window !== "undefined") {
  (window as any).clearAuthStorage = clearAuthStorage;
  (window as any).handleServiceOverload = handleServiceOverload;
  (window as any).debugAuthState = debugAuthState;
}

export const useLogin = (opts?: { onRequest?: () => void; onSuccess?: () => void; onError?: () => void }) => {
  const ephemeralKeyPair = useEphemeralKeyPair();
  const switchKeylessAccount = useAuthStore((state) => state.switchKeylessAccount);

  const getGoogleRequestLoginUrl = useMemo(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn("GOOGLE_CLIENT_ID not configured");
      return "";
    }

    const redirectUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

    const searchParams = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${window.location.origin}/auth/google/callback`,
      response_type: "id_token",
      scope: "openid email profile",
      nonce: ephemeralKeyPair.nonce,
    });
    redirectUrl.search = searchParams.toString();

    return redirectUrl.toString();
  }, [ephemeralKeyPair.nonce]);

  const loginWithGoogle = async (idToken: string) => {
    try {
      opts?.onRequest?.();
      const keylessAccount = await switchKeylessAccount(idToken);

      if (!keylessAccount) throw new Error("Keyless account not derived");
      if (!keylessAccount?.pepper) throw new Error("No pepper found");

      opts?.onSuccess?.();
      return keylessAccount;
    } catch (error) {
      console.error("Login failed:", error);
      opts?.onError?.();
      throw error;
    }
  };

  return {
    getGoogleRequestLoginUrl,
    loginWithGoogle,
  };
};

// Hook to get account list with public data
export const useAccounts = () => {
  const rawKeylessAccounts = useAuthStore((state) => state.accounts);

  return useMemo(() => {
    return rawKeylessAccounts.map((account): KeylessAccountPublic => {
      const decodedIdToken = jwtDecode<
        JwtPayload & {
          name?: string;
          picture?: string;
        }
      >(account.idToken.raw);

      return {
        idToken: account.idToken.raw,
        name: decodedIdToken.name,
        avatarUrl: decodedIdToken.picture,
      };
    });
  }, [rawKeylessAccounts]);
};

// Hook to check if auth is ready (hydrated and potentially restored)
export const useAuthReady = () => {
  const accounts = useAuthStore((state) => state.accounts);
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  // Auth is ready when:
  // 1. Store has hydrated from localStorage
  // 2. Either we have an active account OR no stored accounts to restore
  const isReady = hasHydrated && (activeAccount || accounts.length === 0);

  return {
    isReady,
    hasHydrated,
    activeAccount,
    accounts,
  };
};

export { useAuthStore };
