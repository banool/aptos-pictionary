import { AccountAddress } from "@aptos-labs/ts-sdk";
import { MODULE_ADDRESS } from "@/constants";

export type CreateGameArguments = {
  team0Players: AccountAddress[];
  team1Players: AccountAddress[];
  team0Name: string;
  team1Name: string;
  targetScore: number;
  canvasWidth: number;
  canvasHeight: number;
  roundDuration: number;
};

/**
 * Build payload for creating a new Pictionary game using native Aptos SDK
 * Returns the transaction payload to be used with keyless accounts
 */
export const buildCreateGamePayload = (args: CreateGameArguments) => {
  return {
    function: `${MODULE_ADDRESS}::pictionary::create_game` as const,
    functionArguments: [
      // Note: Do NOT include the signer parameter - it's handled automatically by the SDK
      args.team0Players.map((addr) => addr.toString()),
      args.team1Players.map((addr) => addr.toString()),
      args.team0Name,
      args.team1Name,
      args.targetScore.toString(),
      args.canvasWidth.toString(),
      args.canvasHeight.toString(),
      args.roundDuration.toString(),
    ],
    typeArguments: [],
  };
};
