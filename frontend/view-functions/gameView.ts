import { AccountAddress, Aptos } from "@aptos-labs/ts-sdk";
import {
  createPictionarySurfClient,
  GameState,
  RoundState,
  Canvas,
  orderedMapToCanvas,
  RawRoundSummary,
} from "@/utils/surf";

export interface RoundResult {
  roundNumber: number;
  word: string;
  team0Points: number;
  team1Points: number;
  team0TotalScore: number;
  team1TotalScore: number;
}

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
      team0Name,
      team1Name,
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
      team0Name: team0Name as string,
      team1Name: team1Name as string,
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

/**
 * Get round history from the blockchain using the get_round_history view function
 */
export const getRoundHistory = async (aptos: Aptos, gameAddress: AccountAddress): Promise<RoundResult[]> => {
  try {
    const client = createPictionarySurfClient(aptos);

    const rounds = await client.view.get_round_history({
      functionArguments: [gameAddress.toString()],
      typeArguments: [],
    });

    const roundResults: RoundResult[] = [];
    let team0TotalScore = 0;
    let team1TotalScore = 0;

    for (const roundSummary of rounds as unknown as RawRoundSummary[]) {
      // Calculate points for this round based on guess times
      let team0Points = 0;
      let team1Points = 0;

      if (roundSummary.team0_guessed && roundSummary.team1_guessed) {
        // Both teams guessed - first gets 2 points, second gets 1
        const team0Time = roundSummary.team0_guess_time ? Number(roundSummary.team0_guess_time) : null;
        const team1Time = roundSummary.team1_guess_time ? Number(roundSummary.team1_guess_time) : null;

        if (team0Time && team1Time) {
          if (team0Time <= team1Time) {
            team0Points = 2;
            team1Points = 1;
          } else {
            team0Points = 1;
            team1Points = 2;
          }
        }
      } else if (roundSummary.team0_guessed) {
        team0Points = 2;
      } else if (roundSummary.team1_guessed) {
        team1Points = 2;
      }

      team0TotalScore += team0Points;
      team1TotalScore += team1Points;

      // Fix the round number parsing - add 1 since rounds are 0-indexed on chain
      let roundNumber: number;
      if (typeof roundSummary.round_number === "string") {
        const parsed = parseInt(roundSummary.round_number, 10);
        roundNumber = isNaN(parsed) ? 0 : parsed + 1;
      } else if (typeof roundSummary.round_number === "number") {
        roundNumber = roundSummary.round_number + 1;
      } else {
        console.warn("Unexpected round_number type:", typeof roundSummary.round_number, roundSummary.round_number);
        roundNumber = 1; // Default to round 1
      }

      roundResults.push({
        roundNumber,
        word: roundSummary.word as string,
        team0Points,
        team1Points,
        team0TotalScore,
        team1TotalScore,
      });
    }

    return roundResults;
  } catch (error) {
    console.error("Failed to get round history:", error);
    return [];
  }
};

/**
 * Get the current word for an artist (returns empty string if not artist or round not active)
 */
export const getCurrentWordForArtist = async (
  aptos: Aptos,
  gameAddress: AccountAddress,
  playerAddress: AccountAddress,
): Promise<string> => {
  try {
    const client = createPictionarySurfClient(aptos);

    const word = await client.view.get_current_word_for_artist({
      functionArguments: [gameAddress.toString(), playerAddress.toString()],
      typeArguments: [],
    });

    return word[0];
  } catch (error) {
    console.error("Failed to get current word for artist:", error);
    return "";
  }
};
