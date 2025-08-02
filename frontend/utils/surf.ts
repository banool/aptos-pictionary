import { createSurfClient, DefaultABITable, ExtractStructType } from "@thalalabs/surf";
import { Aptos, AccountAddress } from "@aptos-labs/ts-sdk";
import { PICTIONARY_ABI } from "./abis";

type ABITable = DefaultABITable & {
    "0xcc4de567219c07e127d50a6abc450e22deb84a687c6e39876e0618cd104a4a69::pictionary": typeof PICTIONARY_ABI;
  };

// Create the Surf client instance with proper receiver-style API
export const createPictionarySurfClient = (aptos: Aptos) => {
  return createSurfClient(aptos).useABI(PICTIONARY_ABI);
};

// Extract raw struct types from the ABI
export type RawGameState = ExtractStructType<ABITable, typeof PICTIONARY_ABI, "Game">;
export type RawRoundState = ExtractStructType<ABITable, typeof PICTIONARY_ABI, "Round">;
export type RawCanvasState = ExtractStructType<ABITable, typeof PICTIONARY_ABI, "Canvas">;
export type RawCanvasDelta = ExtractStructType<ABITable, typeof PICTIONARY_ABI, "CanvasDelta">;
export type RawColor = ExtractStructType<ABITable, typeof PICTIONARY_ABI, "Color">;
export type RawRoundSummary = ExtractStructType<ABITable, typeof PICTIONARY_ABI, "RoundSummary">;

// Extract event types from the ABI
export type GameCreatedEvent = ExtractStructType<ABITable, typeof PICTIONARY_ABI, "GameCreated">;
export type GameFinishedEvent = ExtractStructType<ABITable, typeof PICTIONARY_ABI, "GameFinished">;
export type RoundStartedEvent = ExtractStructType<ABITable, typeof PICTIONARY_ABI, "RoundStarted">;
export type RoundFinishedEvent = ExtractStructType<ABITable, typeof PICTIONARY_ABI, "RoundFinished">;
export type CanvasUpdatedEvent = ExtractStructType<ABITable, typeof PICTIONARY_ABI, "CanvasUpdated">;
export type GuessSubmittedEvent = ExtractStructType<ABITable, typeof PICTIONARY_ABI, "GuessSubmitted">;

// UI-friendly types (using AccountAddress and proper field names)
export interface GameState {
  creator: AccountAddress;
  team0Players: AccountAddress[];
  team1Players: AccountAddress[];
  team0Name: string;
  team1Name: string;
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

export interface CanvasDelta {
  position: number;
  color: number;
}

// Simple canvas interface for UI rendering (position -> color mapping)
export interface Canvas {
  [position: number]: number;
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

// Helper function to convert OrderedMap to Canvas format for UI rendering
export const orderedMapToCanvas = (serializedMap: SerializedOrderedMap<number, number>): Canvas => {
  const canvas: Canvas = {};
  if (serializedMap?.entries) {
    serializedMap.entries.forEach(({ key, value }) => {
      canvas[key] = value;
    });
  }
  return canvas;
};
