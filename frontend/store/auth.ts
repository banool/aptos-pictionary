import {
  Account,
  EphemeralKeyPair,
  KeylessAccount,
  ProofFetchStatus,
} from "@aptos-labs/ts-sdk";
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
};

const storage = createJSONStorage<KeylessAccountsState>(() => localStorage, {
  replacer: (_, value) => {
    if (typeof value === 'bigint') return { __type: 'bigint', value: value.toString() };
    if (value instanceof Uint8Array) return { __type: 'Uint8Array', value: Array.from(value) };
    if (value instanceof EphemeralKeyPair) return EphemeralKeyPairEncoding.encode(value);
    if (value instanceof KeylessAccount) return KeylessAccountEncoding.encode(value);
    return value;
  },
  reviver: (_, value: any) => {
    if (value && value.__type === 'bigint') return BigInt(value.value);
    if (value && value.__type === 'Uint8Array') return new Uint8Array(value.value);
    if (value && value.__type === 'EphemeralKeyPair') {
      try {
        return EphemeralKeyPairEncoding.decode(value);
      } catch (error) {
        console.error('Failed to decode EphemeralKeyPair:', error);
        return undefined;
      }
    }
    if (value && value.__type === 'KeylessAccount') {
      // For KeylessAccount, we'll just return undefined and let the system re-derive it
      return undefined;
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

      // Actions
      commitEphemeralKeyPair: (keyPair: EphemeralKeyPair) => {
        const valid = isValidEphemeralKeyPair(keyPair);
        if (!valid) {
          throw new Error('commitEphemeralKeyPair: Invalid ephemeral key pair provided');
        }
        set({ ephemeralKeyPair: keyPair });
      },

      disconnectKeylessAccount: () => {
        set({ activeAccount: undefined });
      },

      getEphemeralKeyPair: () => {
        const account = get().activeAccount;
        return account ? validateEphemeralKeyPair(account) : get().ephemeralKeyPair;
      },

      switchKeylessAccount: async (idToken: string) => {
        set({ ...get(), activeAccount: undefined }, true);

        const {
          derivedAccount: activeAccount,
          storedAccount,
          decodedToken,
        } = await get().deriveKeylessAccount(idToken);

        const { pepper } = activeAccount;

        if (storedAccount) {
          set({
            accounts: get().accounts.map(a =>
              a.idToken.decoded.sub === decodedToken.sub
                ? { idToken: { decoded: decodedToken, raw: idToken }, pepper }
                : a,
            ),
            activeAccount,
          });
        } else {
          set({
            accounts: [
              ...get().accounts,
              { idToken: { decoded: decodedToken, raw: idToken }, pepper },
            ],
            activeAccount,
          });
        }

        await activeAccount.checkKeylessAccountValidity(aptos.config);
        return activeAccount;
      },

      deriveKeylessAccount: async (idToken: string) => {
        const decodedToken = validateIdToken(idToken);
        if (!decodedToken) {
          throw new Error('switchKeylessAccount: Invalid idToken provided, could not decode');
        }

        const ephemeralKeyPair = get().getEphemeralKeyPair();
        if (!ephemeralKeyPair || ephemeralKeyPair?.nonce !== decodedToken.nonce) {
          throw new Error('switchKeylessAccount: Ephemeral key pair not found');
        }

        const proofFetchCallback = async (res: ProofFetchStatus) => {
          if (String(res.status).toLowerCase() === 'failed') {
            get().disconnectKeylessAccount();
          }
        };

        const storedAccount = get().accounts.find(
          a => a.idToken.decoded.sub === decodedToken.sub,
        );

        let derivedAccount: KeylessAccount | undefined;
        try {
          derivedAccount = await aptos.deriveKeylessAccount({
            ephemeralKeyPair,
            jwt: idToken,
            proofFetchCallback,
          });
        } catch (error) {
          // If we cannot derive an account using the pepper service, attempt to derive it using the stored pepper
          if (!storedAccount?.pepper) throw error;
          derivedAccount = await aptos.deriveKeylessAccount({
            ephemeralKeyPair,
            jwt: idToken,
            pepper: storedAccount.pepper,
            proofFetchCallback,
          });
        }

        if (!derivedAccount || !decodedToken) {
          throw new TypeError('Could not derive account from idToken or stored account');
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
    }),
    {
      name: 'auth-storage',
      storage,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Hook to get/create ephemeral key pair
export const useEphemeralKeyPair = (): EphemeralKeyPair => {
  const ephemeralKeyPair = useAuthStore(state => state.ephemeralKeyPair);
  const commitEphemeralKeyPair = useAuthStore(state => state.commitEphemeralKeyPair);

  return useMemo(() => {
    if (ephemeralKeyPair && isValidEphemeralKeyPair(ephemeralKeyPair)) {
      return ephemeralKeyPair;
    }

    // Create new ephemeral key pair
    const newKeyPair = createEphemeralKeyPair();
    commitEphemeralKeyPair(newKeyPair);
    return newKeyPair;
  }, [ephemeralKeyPair, commitEphemeralKeyPair]);
};

// Hook for login functionality
export const useLogin = (opts?: {
  onRequest?: () => void;
  onSuccess?: () => void;
  onError?: () => void;
}) => {
  const ephemeralKeyPair = useEphemeralKeyPair();
  const switchKeylessAccount = useAuthStore(state => state.switchKeylessAccount);

  const getGoogleRequestLoginUrl = useMemo(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('GOOGLE_CLIENT_ID not configured');
      return '';
    }

    const redirectUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');

    const searchParams = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${window.location.origin}`,
      response_type: 'id_token',
      scope: 'openid email profile',
      nonce: ephemeralKeyPair.nonce,
    });
    redirectUrl.search = searchParams.toString();

    return redirectUrl.toString();
  }, [ephemeralKeyPair.nonce]);

  const loginWithGoogle = async (idToken: string) => {
    try {
      opts?.onRequest?.();
      const keylessAccount = await switchKeylessAccount(idToken);

      if (!keylessAccount) throw new Error('Keyless account not derived');
      if (!keylessAccount?.pepper) throw new Error('No pepper found');

      opts?.onSuccess?.();
      return keylessAccount;
    } catch (error) {
      console.error('Login failed:', error);
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
  const rawKeylessAccounts = useAuthStore(state => state.accounts);
  
  return useMemo(() => {
    return rawKeylessAccounts.map((account): KeylessAccountPublic => {
      const decodedIdToken = jwtDecode<JwtPayload & {
        name?: string;
        picture?: string;
      }>(account.idToken.raw);

      return {
        idToken: account.idToken.raw,
        name: decodedIdToken.name,
        avatarUrl: decodedIdToken.picture,
      };
    });
  }, [rawKeylessAccounts]);
};

export { useAuthStore };