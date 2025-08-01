import { AccountAddress } from "@aptos-labs/ts-sdk";
import { createEntryPayload } from "@thalalabs/surf";
import { PICTIONARY_ABI } from "@/utils/abis";

/**
 * Build payload for starting a game (creator only)
 */
export const buildStartGamePayload = (gameAddress: AccountAddress) => {
  return createEntryPayload(PICTIONARY_ABI, {
    function: "start_game",
    functionArguments: [gameAddress.toString()],
    typeArguments: [],
  });
};

/**
 * Build payload for submitting canvas drawing deltas
 */
export const buildSubmitCanvasDeltaPayload = (
  gameAddress: AccountAddress,
  team: number,
  positions: number[],
  colors: number[],
) => {
  return createEntryPayload(PICTIONARY_ABI, {
    function: "submit_canvas_delta",
    functionArguments: [gameAddress.toString(), team, positions, colors],
    typeArguments: [],
  });
};

/**
 * Build payload for making a guess
 */
export const buildMakeGuessPayload = (gameAddress: AccountAddress, guess: string) => {
  return createEntryPayload(PICTIONARY_ABI, {
    function: "make_guess",
    functionArguments: [gameAddress.toString(), guess],
    typeArguments: [],
  });
};

/**
 * Build payload for starting the next round (artist only)
 */
export const buildNextRoundPayload = (gameAddress: AccountAddress) => {
  return createEntryPayload(PICTIONARY_ABI, {
    function: "next_round",
    functionArguments: [gameAddress.toString()],
    typeArguments: [],
  });
};
