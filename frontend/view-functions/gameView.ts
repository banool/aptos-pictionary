import { Aptos, MoveValue } from "@aptos-labs/ts-sdk";
import { PICTIONARY_MODULE_ADDRESS } from "@/constants";

export interface GameState {
  creator: string;
  team0Players: string[];
  team1Players: string[];
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

/**
 * Get game state from the blockchain
 */
export const getGame = async (
  aptos: Aptos,
  gameAddress: string
): Promise<GameState> => {
  try {
    const result = await aptos.view({
      payload: {
        function: `${PICTIONARY_MODULE_ADDRESS}::pictionary::get_game`,
        functionArguments: [gameAddress],
      },
    });

    const [
      creator,
      team0Players,
      team1Players,
      currentTeam0Artist,
      currentTeam1Artist,
      team0Score,
      team1Score,
      targetScore,
      currentRound,
      started,
      finished,
      winner,
      canvasWidth,
      canvasHeight,
      roundDuration,
    ] = result as MoveValue[];

    return {
      creator: creator as string,
      team0Players: team0Players as string[],
      team1Players: team1Players as string[],
      currentTeam0Artist: Number(currentTeam0Artist),
      currentTeam1Artist: Number(currentTeam1Artist),
      team0Score: Number(team0Score),
      team1Score: Number(team1Score),
      targetScore: Number(targetScore),
      currentRound: Number(currentRound),
      started: started as boolean,
      finished: finished as boolean,
      winner: winner ? Number(winner) : null,
      canvasWidth: Number(canvasWidth),
      canvasHeight: Number(canvasHeight),
      roundDuration: Number(roundDuration),
    };
  } catch (error) {
    console.error("Failed to get game state:", error);
    throw new Error("Failed to fetch game state");
  }
};

/**
 * Get current round state from the blockchain
 */
export const getCurrentRound = async (
  aptos: Aptos,
  gameAddress: string
): Promise<RoundState> => {
  try {
    const result = await aptos.view({
      payload: {
        function: `${PICTIONARY_MODULE_ADDRESS}::pictionary::get_current_round`,
        functionArguments: [gameAddress],
      },
    });

    const [
      roundNumber,
      word,
      startTime,
      durationSeconds,
      team0Guessed,
      team1Guessed,
      finished,
      team0GuessTime,
      team1GuessTime,
    ] = result as MoveValue[];

    return {
      roundNumber: Number(roundNumber),
      word: word as string,
      startTime: Number(startTime),
      durationSeconds: Number(durationSeconds),
      team0Guessed: team0Guessed as boolean,
      team1Guessed: team1Guessed as boolean,
      finished: finished as boolean,
      team0GuessTime: team0GuessTime ? Number(team0GuessTime) : null,
      team1GuessTime: team1GuessTime ? Number(team1GuessTime) : null,
    };
  } catch (error) {
    console.error("Failed to get round state:", error);
    throw new Error("Failed to fetch round state");
  }
};

/**
 * Get canvas data for a specific round and team
 */
export const getCanvas = async (
  aptos: Aptos,
  gameAddress: string,
  roundNumber: number,
  team: number
): Promise<Canvas> => {
  try {
    const result = await aptos.view({
      payload: {
        function: `${PICTIONARY_MODULE_ADDRESS}::pictionary::get_canvas`,
        functionArguments: [gameAddress, roundNumber, team],
      },
    });

    // The result is a SimpleMap<u16, Color> which should be converted to a plain object
    const canvasData = result[0] as { data: Array<{ key: string; value: number }> };
    
    const canvas: Canvas = {};
    if (canvasData && canvasData.data) {
      canvasData.data.forEach(({ key, value }) => {
        canvas[Number(key)] = value;
      });
    }

    return canvas;
  } catch (error) {
    console.error("Failed to get canvas data:", error);
    throw new Error("Failed to fetch canvas data");
  }
};