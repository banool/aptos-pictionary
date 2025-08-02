import { AccountAddress } from "@aptos-labs/ts-sdk";
import { MODULE_ADDRESS } from "@/constants";

/**
 * Build payload for starting a game (creator only)
 * Move function: start_game(creator: &signer, game_address: address)
 */
export const buildStartGamePayload = (gameAddress: AccountAddress) => {
  return {
    function: `${MODULE_ADDRESS}::pictionary::start_game` as const,
    functionArguments: [
      // Note: Do NOT include the signer parameter - it's handled automatically by the SDK
      gameAddress.toString(),
    ],
    typeArguments: [],
  };
};

/**
 * Build payload for submitting canvas drawing deltas
 * Move function: submit_canvas_delta(artist: &signer, game_address: address, team: u64, positions: vector<u16>, colors: vector<u8>)
 */
export const buildSubmitCanvasDeltaPayload = (
  gameAddress: AccountAddress,
  team: number,
  positions: number[],
  colors: number[],
) => {
  return {
    function: `${MODULE_ADDRESS}::pictionary::submit_canvas_delta` as const,
    functionArguments: [
      // Note: Do NOT include the signer parameter - it's handled automatically by the SDK
      gameAddress.toString(),
      team.toString(),
      positions.map((p) => p.toString()),
      colors.map((c) => c.toString()),
    ],
    typeArguments: [],
  };
};

/**
 * Build payload for making a guess
 * Move function: make_guess(guesser: &signer, game_address: address, guess: String)
 */
export const buildMakeGuessPayload = (gameAddress: AccountAddress, guess: string) => {
  return {
    function: `${MODULE_ADDRESS}::pictionary::make_guess` as const,
    functionArguments: [
      // Note: Do NOT include the signer parameter - it's handled automatically by the SDK
      gameAddress.toString(),
      guess,
    ],
    typeArguments: [],
  };
};

/**
 * Build payload for starting the next round (artist only)
 * Move function: next_round(caller: &signer, game_address: address)
 */
export const buildNextRoundPayload = (gameAddress: AccountAddress) => {
  return {
    function: `${MODULE_ADDRESS}::pictionary::next_round` as const,
    functionArguments: [
      // Note: Do NOT include the signer parameter - it's handled automatically by the SDK
      gameAddress.toString(),
    ],
    typeArguments: [],
  };
};
