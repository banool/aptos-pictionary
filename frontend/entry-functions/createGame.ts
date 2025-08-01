import { Account, Aptos } from "@aptos-labs/ts-sdk";
import { PICTIONARY_MODULE_ADDRESS } from "@/constants";

export type CreateGameArguments = {
  team0Players: string[];
  team1Players: string[];
  targetScore: number;
  canvasWidth: number;
  canvasHeight: number;
  roundDuration: number;
};

/**
 * Create a new Pictionary game
 */
export const createGame = async (
  aptos: Aptos,
  sender: Account,
  args: CreateGameArguments
): Promise<string> => {
  const transaction = await aptos.transaction.build.simple({
    sender: sender.accountAddress,
    data: {
      function: `${PICTIONARY_MODULE_ADDRESS}::pictionary::create_game`,
      functionArguments: [
        args.team0Players,
        args.team1Players,
        args.targetScore,
        args.canvasWidth,
        args.canvasHeight,
        args.roundDuration,
      ],
    },
  });

  const committedTransaction = await aptos.signAndSubmitTransaction({
    signer: sender,
    transaction,
  });

  const response = await aptos.waitForTransaction({
    transactionHash: committedTransaction.hash,
  });

  console.log("Game created successfully:", response);

  // TODO: Extract game address from events
  // For now, return a mock address based on the contract
  return PICTIONARY_MODULE_ADDRESS.slice(0, 10) + Math.random().toString(16).slice(2, 12);
};