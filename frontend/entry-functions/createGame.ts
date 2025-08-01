import { AccountAddress } from "@aptos-labs/ts-sdk";
import { createEntryPayload } from "@thalalabs/surf";
import { PICTIONARY_ABI } from "@/utils/abis";

export type CreateGameArguments = {
  team0Players: AccountAddress[];
  team1Players: AccountAddress[];
  targetScore: number;
  canvasWidth: number;
  canvasHeight: number;
  roundDuration: number;
};

/**
 * Build payload for creating a new Pictionary game - Using Surf createEntryPayload
 * Returns the transaction payload to be used with wallet adapter
 */
export const buildCreateGamePayload = (args: CreateGameArguments) => {
  return createEntryPayload(PICTIONARY_ABI, {
    function: "create_game",
    functionArguments: [
      args.team0Players.map((addr) => addr.toString()),
      args.team1Players.map((addr) => addr.toString()),
      args.targetScore,
      args.canvasWidth,
      args.canvasHeight,
      args.roundDuration,
    ],
    typeArguments: [],
  });
};
