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

    console.log("Raw game data from contract:", {
      team0Score,
      team1Score,
      currentRound,
      started,
      finished,
      gameAddress: gameAddress.toString(),
    });

    const gameState = {
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

    console.log("Processed game state:", {
      team0Score: gameState.team0Score,
      team1Score: gameState.team1Score,
      currentRound: gameState.currentRound,
    });

    return gameState;
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
    console.log("getCanvas called with:", {
      gameAddress: gameAddress.toString(),
      roundNumber,
      team,
    });

    const client = createPictionarySurfClient(aptos);

    // https://github.com/ThalaLabs/surf/issues/260
    const orderedMapResult = await client.view.get_canvas({
      functionArguments: [gameAddress.toString(), roundNumber, team],
      typeArguments: [],
    });

    console.log("Canvas query successful, result:", orderedMapResult);

    // The result is an OrderedMap<u16, Color> serialized as { entries: Array<{ key: u16, value: Color }> }
    // Surf returns the result as an array, so we need the first element
    const canvasData = (orderedMapResult as unknown[])[0] as { entries: Array<{ key: number; value: number }> };
    const canvas = orderedMapToCanvas(canvasData);

    console.log("Processed canvas data:", canvas);
    return canvas;
  } catch (error) {
    console.error("Failed to get canvas data:", {
      gameAddress: gameAddress.toString(),
      roundNumber,
      team,
      error,
    });
    throw new Error("Failed to fetch canvas data");
  }
};

/**
 * Get round history from the blockchain using the get_round_history view function
 */
export const getRoundHistory = async (
  aptos: Aptos,
  gameAddress: AccountAddress,
  currentRound?: number,
): Promise<RoundResult[]> => {
  try {
    const client = createPictionarySurfClient(aptos);

    const [rounds] = await client.view.get_round_history({
      functionArguments: [gameAddress.toString()],
      typeArguments: [],
    });

    console.log("Raw rounds data from contract:", rounds);

    // Handle the rounds array - it might be nested
    const roundsArray = Array.isArray(rounds) ? rounds : (rounds as unknown as [RawRoundSummary[]])[0];
    console.log("Processed rounds array:", roundsArray);
    console.log("Number of rounds returned:", roundsArray?.length || 0);

    const roundResults: RoundResult[] = [];
    let team0TotalScore = 0;
    let team1TotalScore = 0;

    if (!roundsArray || roundsArray.length === 0) {
      console.log("No rounds data available");
      return [];
    }

    for (const roundSummary of roundsArray) {
      console.log("Processing round summary:", roundSummary);

      // Cast to RawRoundSummary for proper typing
      const round = roundSummary as RawRoundSummary;

      // Parse round number
      const roundNum =
        typeof round.round_number === "string" ? parseInt(round.round_number, 10) : Number(round.round_number) || 0;

      // Derive finished status from multiple indicators
      let isFinished = false;

      if (round.team0_guessed && round.team1_guessed) {
        // Round is finished if both teams have guessed
        isFinished = true;
      } else if (currentRound !== undefined && roundNum < currentRound - 1) {
        // Round is finished if it's before the current round (accounting for 0-based vs 1-based)
        isFinished = true;
      } else if (round.start_time && round.duration_seconds) {
        // Check if enough time has passed for this round to be finished based on its own timing
        const currentTime = Date.now() / 1000; // Convert to seconds
        const roundEndTime = Number(round.start_time) + Number(round.duration_seconds);
        isFinished = currentTime > roundEndTime;
      }

      console.log("Round finished status:", {
        derivedFinished: isFinished,
        roundNumber: roundNum,
        currentRound,
        bothGuessed: round.team0_guessed && round.team1_guessed,
        timeExpired:
          round.start_time && round.duration_seconds
            ? Date.now() / 1000 > Number(round.start_time) + Number(round.duration_seconds)
            : false,
        comparison: currentRound ? `${roundNum} < ${currentRound - 1}` : "no current round",
      });

      // Only include finished/completed rounds in history
      if (!isFinished) {
        console.log("Skipping unfinished round:", roundNum);
        continue;
      }

      // Calculate points for this round based on guess times
      let team0Points = 0;
      let team1Points = 0;

      if (round.team0_guessed && round.team1_guessed) {
        // Both teams guessed - first gets 2 points, second gets 1
        const team0Time = round.team0_guess_time ? Number(round.team0_guess_time) : null;
        const team1Time = round.team1_guess_time ? Number(round.team1_guess_time) : null;

        if (team0Time && team1Time) {
          if (team0Time <= team1Time) {
            team0Points = 2;
            team1Points = 1;
          } else {
            team0Points = 1;
            team1Points = 2;
          }
        }
      } else if (round.team0_guessed) {
        team0Points = 2;
      } else if (round.team1_guessed) {
        team1Points = 2;
      }

      team0TotalScore += team0Points;
      team1TotalScore += team1Points;

      // Convert 0-based round number to 1-based for display
      const roundNumber = roundNum + 1;

      // Handle word display - show placeholder for empty words
      const rawWord = (round.word as string) || "";
      const word = rawWord.trim() !== "" ? rawWord : "***";
      console.log("Adding round to history:", {
        roundNumber,
        rawWord,
        displayWord: word,
        finished: isFinished,
        startTime: round.start_time,
        duration: round.duration_seconds,
        team0Points,
        team1Points,
        team0TotalScore,
        team1TotalScore,
        team0Guessed: round.team0_guessed,
        team1Guessed: round.team1_guessed,
        team0GuessTime: round.team0_guess_time,
        team1GuessTime: round.team1_guess_time,
      });

      roundResults.push({
        roundNumber,
        word,
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
