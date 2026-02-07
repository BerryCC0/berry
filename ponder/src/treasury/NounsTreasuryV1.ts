import { ponder } from "ponder:registry";
import { treasuryTxs, treasuryConfigChanges } from "ponder:schema";

// =============================================================================
// TREASURY V1 (Legacy) - Transaction lifecycle
// =============================================================================

ponder.on("TreasuryV1:QueueTransaction", async ({ event, context }) => {
  await context.db.insert(treasuryTxs).values({
    id: `v1-${event.args.txHash}-${event.log.logIndex}`,
    txHash: event.args.txHash,
    target: event.args.target,
    value: event.args.value,
    signature: event.args.signature,
    data: event.args.data,
    eta: event.args.eta,
    status: "QUEUED",
    treasuryVersion: "v1",
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});

ponder.on("TreasuryV1:ExecuteTransaction", async ({ event, context }) => {
  await context.db.insert(treasuryTxs).values({
    id: `v1-exec-${event.transaction.hash}-${event.log.logIndex}`,
    txHash: event.args.txHash,
    target: event.args.target,
    value: event.args.value,
    signature: event.args.signature,
    data: event.args.data,
    eta: event.args.eta,
    status: "EXECUTED",
    treasuryVersion: "v1",
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  }).onConflictDoNothing();
});

ponder.on("TreasuryV1:CancelTransaction", async ({ event, context }) => {
  await context.db.insert(treasuryTxs).values({
    id: `v1-cancel-${event.transaction.hash}-${event.log.logIndex}`,
    txHash: event.args.txHash,
    target: event.args.target,
    value: event.args.value,
    signature: event.args.signature,
    data: event.args.data,
    eta: event.args.eta,
    status: "CANCELLED",
    treasuryVersion: "v1",
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  }).onConflictDoNothing();
});

// =============================================================================
// TREASURY V1 - Config
// =============================================================================

const v1ConfigHandler = (eventName: string) =>
  async ({ event, context }: any) => {
    const params: Record<string, any> = {};
    for (const [key, value] of Object.entries(event.args)) {
      params[key] = typeof value === "bigint" ? value.toString() : value;
    }
    await context.db.insert(treasuryConfigChanges).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventName,
      params,
      treasuryVersion: "v1",
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      txHash: event.transaction.hash,
    });
  };

ponder.on("TreasuryV1:NewAdmin", v1ConfigHandler("NewAdmin"));
ponder.on("TreasuryV1:NewDelay", v1ConfigHandler("NewDelay"));
ponder.on("TreasuryV1:NewPendingAdmin", v1ConfigHandler("NewPendingAdmin"));
