import {
  Account,
  EphemeralKeyPair,
  KeylessAccount,
  ProofFetchStatus,
} from "@aptos-labs/ts-sdk";
import { jwtDecode, JwtPayload } from "jwt-decode";

export interface EncryptedScopedIdToken extends JwtPayload {
  sub: string;
  aud: string;
  iss: string;
  exp: number;
  iat: number;
  nonce: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface StoredAccount {
  idToken: { decoded: EncryptedScopedIdToken; raw: string };
  pepper: Uint8Array;
}

export interface KeylessAccountPublic {
  idToken: string;
  name?: string;
  avatarUrl?: string;
}

/**
 * Validates an ID token by decoding it and checking basic structure.
 */
export function validateIdToken(idToken: string): EncryptedScopedIdToken | null {
  try {
    const decoded = jwtDecode<EncryptedScopedIdToken>(idToken);
    
    // Basic validation - check required fields
    if (!decoded.sub || !decoded.aud || !decoded.iss || !decoded.nonce) {
      console.error("Invalid ID token: missing required fields");
      return null;
    }

    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      console.error("ID token has expired");
      return null;
    }

    return decoded;
  } catch (error) {
    console.error("Failed to decode ID token:", error);
    return null;
  }
}

/**
 * Creates a new ephemeral key pair for keyless account generation.
 */
export function createEphemeralKeyPair(): EphemeralKeyPair {
  return EphemeralKeyPair.generate();
}

/**
 * Validates an ephemeral key pair to ensure it's still valid.
 */
export function isValidEphemeralKeyPair(keyPair: EphemeralKeyPair): boolean {
  try {
    // Check if the key pair has expired
    const currentTime = Math.floor(Date.now() / 1000);
    return keyPair.expiryDateSecs > currentTime;
  } catch (error) {
    console.error("Invalid ephemeral key pair:", error);
    return false;
  }
}

/**
 * Validates an ephemeral key pair and returns it if valid, undefined if not.
 */
export function validateEphemeralKeyPair(account: KeylessAccount): EphemeralKeyPair | undefined {
  try {
    if (!account.ephemeralKeyPair) return undefined;
    
    const isValid = isValidEphemeralKeyPair(account.ephemeralKeyPair);
    return isValid ? account.ephemeralKeyPair : undefined;
  } catch (error) {
    console.error("Error validating ephemeral key pair:", error);
    return undefined;
  }
}

/**
 * Validates a keyless account to ensure it's properly configured.
 */
export function validateKeylessAccount(account: KeylessAccount): boolean {
  try {
    // Check if account has required properties
    if (!account.accountAddress || !account.ephemeralKeyPair) {
      return false;
    }

    // Validate the ephemeral key pair
    return isValidEphemeralKeyPair(account.ephemeralKeyPair);
  } catch (error) {
    console.error("Error validating keyless account:", error);
    return false;
  }
}

/**
 * Encoding/decoding utilities for persisting data
 */
export const EphemeralKeyPairEncoding = {
  encode: (keyPair: EphemeralKeyPair): Record<string, any> => {
    return {
      __type: 'EphemeralKeyPair',
      privateKey: keyPair.privateKey.toString(),
      expiryDateSecs: keyPair.expiryDateSecs,
      nonce: keyPair.nonce,
    };
  },
  
  decode: (encoded: Record<string, any>): EphemeralKeyPair => {
    if (encoded.__type !== 'EphemeralKeyPair') {
      throw new Error('Invalid encoded EphemeralKeyPair');
    }
    
    return new EphemeralKeyPair({
      privateKey: encoded.privateKey,
      expiryDateSecs: encoded.expiryDateSecs,
      nonce: encoded.nonce,
    });
  }
};

export const KeylessAccountEncoding = {
  encode: (account: KeylessAccount): Record<string, any> => {
    return {
      __type: 'KeylessAccount',
      accountAddress: account.accountAddress.toString(),
      ephemeralKeyPair: account.ephemeralKeyPair ? EphemeralKeyPairEncoding.encode(account.ephemeralKeyPair) : undefined,
      pepper: account.pepper ? Array.from(account.pepper) : undefined,
      // Add other fields as needed
    };
  },
  
  decode: (encoded: Record<string, any>): KeylessAccount => {
    if (encoded.__type !== 'KeylessAccount') {
      throw new Error('Invalid encoded KeylessAccount');
    }
    
    // This is a simplified version - you might need to reconstruct the full KeylessAccount
    // depending on the actual implementation requirements
    throw new Error('KeylessAccount decoding not fully implemented - use aptos.deriveKeylessAccount instead');
  }
};