import { ponder } from "ponder:registry";
import { foodTreasuryTransactions } from "ponder:schema";

/**
 * Compound-style timelock. (txHash, eta) uniquely identifies a queued tx —
 * the on-chain `txHash` is keccak256(target, value, signature, data, eta),
 * already computed by the timelock and emitted on every lifecycle event.
 * We fold eta into the row id defensively in case the same tx is requeued
 * after a cancel.
 */
const rowId = (txHash: string, eta: bigint) => `${txHash}-${eta.toString()}`;

ponder.on("FoodNounsTreasury:QueueTransaction", async ({ event, context }) => {
  const { txHash, target, value, signature, data, eta } = event.args;
  await context.db
    .insert(foodTreasuryTransactions)
    .values({
      id: rowId(txHash, eta),
      txHash,
      target,
      value,
      signature,
      data,
      eta,
      status: "queued",
      queuedTimestamp: event.block.timestamp,
      queuedBlock: event.block.number,
      queuedTxHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

ponder.on("FoodNounsTreasury:ExecuteTransaction", async ({ event, context }) => {
  const { txHash, target, value, signature, data, eta } = event.args;
  await context.db
    .insert(foodTreasuryTransactions)
    .values({
      id: rowId(txHash, eta),
      txHash,
      target,
      value,
      signature,
      data,
      eta,
      status: "executed",
      executedTimestamp: event.block.timestamp,
      executedBlock: event.block.number,
      executedTxHash: event.transaction.hash,
    })
    .onConflictDoUpdate({
      status: "executed",
      executedTimestamp: event.block.timestamp,
      executedBlock: event.block.number,
      executedTxHash: event.transaction.hash,
    });
});

ponder.on("FoodNounsTreasury:CancelTransaction", async ({ event, context }) => {
  const { txHash, target, value, signature, data, eta } = event.args;
  await context.db
    .insert(foodTreasuryTransactions)
    .values({
      id: rowId(txHash, eta),
      txHash,
      target,
      value,
      signature,
      data,
      eta,
      status: "cancelled",
      cancelledTimestamp: event.block.timestamp,
      cancelledBlock: event.block.number,
      cancelledTxHash: event.transaction.hash,
    })
    .onConflictDoUpdate({
      status: "cancelled",
      cancelledTimestamp: event.block.timestamp,
      cancelledBlock: event.block.number,
      cancelledTxHash: event.transaction.hash,
    });
});
