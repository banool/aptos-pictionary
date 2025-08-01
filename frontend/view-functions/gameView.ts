import { AccountAddress, Aptos } from "@aptos-labs/ts-sdk";
import { createPictionarySurfClient, GameState, RoundState, Canvas, orderedMapToCanvas } from "@/utils/surf";

/**
 * Get game state from the blockchain using Surf receiver-style API
 */
export const getGame = async (aptos: Aptos, gameAddress: AccountAddress): Promise<GameState> => {
  try {
    const client = createPictionarySurfClient(aptos);

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
    ] = await client.view.get_game({
      functionArguments: [gameAddress.toString()],
      typeArguments: [],
    });

    return {
      creator: AccountAddress.from(creator as string),
      team0Players: (team0Players as string[]).map((addr) => AccountAddress.from(addr)),
      team1Players: (team1Players as string[]).map((addr) => AccountAddress.from(addr)),
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
 * Get current round state from the blockchain using Surf receiver-style API
 */
export const getCurrentRound = async (aptos: Aptos, gameAddress: AccountAddress): Promise<RoundState> => {
  try {
    const client = createPictionarySurfClient(aptos);

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
    ] = await client.view.get_current_round({
      functionArguments: [gameAddress.toString()],
      typeArguments: [],
    });

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
 * Get canvas data for a specific round and team using Surf receiver-style API
 */
export const getCanvas = async (
  aptos: Aptos,
  gameAddress: AccountAddress,
  roundNumber: number,
  team: number,
): Promise<Canvas> => {
  try {
    const client = createPictionarySurfClient(aptos);

    // https://github.com/ThalaLabs/surf/issues/260
    const orderedMapResult = await client.view.get_canvas({
      functionArguments: [gameAddress.toString(), roundNumber, team],
      typeArguments: [],
    });

    // The result is an OrderedMap<u16, Color> serialized as { entries: Array<{ key: u16, value: Color }> }
    // Surf returns the result as an array, so we need the first element
    const canvasData = (orderedMapResult as unknown[])[0] as { entries: Array<{ key: number; value: number }> };
    return orderedMapToCanvas(canvasData);
  } catch (error) {
    console.error("Failed to get canvas data:", error);
    throw new Error("Failed to fetch canvas data");
  }
};
