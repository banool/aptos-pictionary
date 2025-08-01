import { Account, Aptos } from "@aptos-labs/ts-sdk";
import { PICTIONARY_MODULE_ADDRESS } from "@/constants";

/**
 * Start a game (creator only)
 */
export const startGame = async (
  aptos: Aptos,
  sender: Account,
  gameAddress: string
): Promise<void> => {
  const transaction = await aptos.transaction.build.simple({
    sender: sender.accountAddress,
    data: {
      function: `${PICTIONARY_MODULE_ADDRESS}::pictionary::start_game`,
      functionArguments: [gameAddress],
    },
  });

  const committedTransaction = await aptos.signAndSubmitTransaction({
    signer: sender,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: committedTransaction.hash,
  });

  console.log("Game started successfully");
};

/**
 * Submit canvas drawing deltas
 */
export const submitCanvasDelta = async (
  aptos: Aptos,
  sender: Account,
  gameAddress: string,
  team: number,
  positions: number[],
  colors: number[]
): Promise<void> => {
  const transaction = await aptos.transaction.build.simple({
    sender: sender.accountAddress,
    data: {
      function: `${PICTIONARY_MODULE_ADDRESS}::pictionary::submit_canvas_delta`,
      functionArguments: [gameAddress, team, positions, colors],
    },
  });

  const committedTransaction = await aptos.signAndSubmitTransaction({
    signer: sender,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: committedTransaction.hash,
  });

  console.log("Canvas delta submitted successfully");
};

/**
 * Make a guess
 */
export const makeGuess = async (
  aptos: Aptos,
  sender: Account,
  gameAddress: string,
  guess: string
): Promise<void> => {
  const transaction = await aptos.transaction.build.simple({
    sender: sender.accountAddress,
    data: {
      function: `${PICTIONARY_MODULE_ADDRESS}::pictionary::make_guess`,
      functionArguments: [gameAddress, guess],
    },
  });

  const committedTransaction = await aptos.signAndSubmitTransaction({
    signer: sender,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: committedTransaction.hash,
  });

  console.log("Guess submitted successfully");
};

/**
 * Start next round (artist only)
 */
export const nextRound = async (
  aptos: Aptos,
  sender: Account,
  gameAddress: string
): Promise<void> => {
  const transaction = await aptos.transaction.build.simple({
    sender: sender.accountAddress,
    data: {
      function: `${PICTIONARY_MODULE_ADDRESS}::pictionary::next_round`,
      functionArguments: [gameAddress],
    },
  });

  const committedTransaction = await aptos.signAndSubmitTransaction({
    signer: sender,
    transaction,
  });

  await aptos.waitForTransaction({
    transactionHash: committedTransaction.hash,
  });

  console.log("Next round started successfully");
};