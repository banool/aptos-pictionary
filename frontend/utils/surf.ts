import { createSurfClient } from "@thalalabs/surf";
import { Aptos, AccountAddress } from "@aptos-labs/ts-sdk";
import { PICTIONARY_ABI } from "./abis";

// Create the Surf client instance with proper receiver-style API
export const createPictionarySurfClient = (aptos: Aptos) => {
  return createSurfClient(aptos).useABI(PICTIONARY_ABI);
};

// Type definitions for our contract data
export interface GameState {
  creator: AccountAddress;
  team0Players: AccountAddress[];
  team1Players: AccountAddress[];
  currentTeam0Artist: number;
  currentTeam1Artist: number;
  team0Score: number;
  team1Score: number;
  targetScore: number;
  currentRound: number;
  started: boolean;
  finished: boolean;
  winner: number | null;
  canvasWidth: number;
  canvasHeight: number;
  roundDuration: number;
}

export interface RoundState {
  roundNumber: number;
  word: string;
  startTime: number;
  durationSeconds: number;
  team0Guessed: boolean;
  team1Guessed: boolean;
  finished: boolean;
  team0GuessTime: number | null;
  team1GuessTime: number | null;
}

export interface Canvas {
  [position: number]: number; // position -> color mapping
}

// OrderedMap structure as it appears in serialized form
interface OrderedMapEntry<K, V> {
  key: K;
  value: V;
}

interface SerializedOrderedMap<K, V> {
  entries: OrderedMapEntry<K, V>[];
}

// Helper function to parse OrderedMap from the contract
export const parseOrderedMap = <K, V>(serializedMap: SerializedOrderedMap<K, V>): Map<K, V> => {
  const map = new Map<K, V>();
  if (serializedMap?.entries) {
    serializedMap.entries.forEach(({ key, value }) => {
      map.set(key, value);
    });
  }
  return map;
};

// Helper function to convert OrderedMap to Canvas format
export const orderedMapToCanvas = (serializedMap: SerializedOrderedMap<number, number>): Canvas => {
  const canvas: Canvas = {};
  if (serializedMap?.entries) {
    serializedMap.entries.forEach(({ key, value }) => {
      canvas[key] = value;
    });
  }
  return canvas;
};
