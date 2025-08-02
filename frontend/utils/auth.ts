/* eslint-disable @typescript-eslint/no-explicit-any */

import { EphemeralKeyPair, KeylessAccount } from "@aptos-labs/ts-sdk";
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
      const expiredDate = new Date(decoded.exp * 1000);
      console.warn(`ID token expired at ${expiredDate.toISOString()}`);
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
export function validateEphemeralKeyPair(keyPair: EphemeralKeyPair): EphemeralKeyPair | undefined {
  return isValidEphemeralKeyPair(keyPair) ? keyPair : undefined;
}

/**
 * Validates a keyless account to ensure it's properly configured.
 * Returns the account if valid, undefined if not (following confidential payments example).
 */
export function validateKeylessAccount(account: KeylessAccount): KeylessAccount | undefined {
  try {
    // Check if account has required properties
    if (!account.accountAddress || !account.ephemeralKeyPair) {
      return undefined;
    }

    // Validate the ephemeral key pair and JWT if available
    const isEphemeralValid = isValidEphemeralKeyPair(account.ephemeralKeyPair);
    if (!isEphemeralValid) {
      return undefined;
    }

    // If we have a JWT, validate it and check nonce match
    if (account.jwt) {
      const decodedToken = validateIdToken(account.jwt);
      if (!decodedToken || decodedToken.nonce !== account.ephemeralKeyPair.nonce) {
        return undefined;
      }
    }

    return account;
  } catch (error) {
    console.error("Error validating keyless account:", error);
    return undefined;
  }
}

/**
 * Encoding/decoding utilities for persisting SDK objects
 * Using the proper BCS serialization methods from the SDK
 */
export const EphemeralKeyPairEncoding = {
  decode: (e: any) => {
    try {
      return EphemeralKeyPair.fromBytes(e.data);
    } catch (error) {
      console.error("Failed to decode EphemeralKeyPair from bytes:", error);
      throw error;
    }
  },
  encode: (e: EphemeralKeyPair) => {
    try {
      return {
        __type: "EphemeralKeyPair",
        data: e.bcsToBytes(),
      };
    } catch (error) {
      console.error("Failed to encode EphemeralKeyPair to bytes:", error);
      return undefined;
    }
  },
};

export const KeylessAccountEncoding = {
  decode: (e: any) => {
    try {
      return KeylessAccount.fromBytes(e.data);
    } catch (error) {
      console.error("Failed to decode KeylessAccount from bytes:", error);
      throw error;
    }
  },
  // If the account has a proof, it can be persisted, otherwise it should not be stored
  encode: (e: KeylessAccount) => {
    try {
      return e.proof
        ? {
            __type: "KeylessAccount",
            data: e.bcsToBytes(),
          }
        : undefined;
    } catch (error) {
      console.error("Failed to encode KeylessAccount to bytes:", error);
      return undefined;
    }
  },
};
