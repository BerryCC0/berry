import { ponder } from "ponder:registry";
import {
  treasuryTxs,
  treasuryTransfers,
  treasuryConfigChanges,
} from "ponder:schema";

// =============================================================================
// TREASURY V2 - Transaction lifecycle
// =============================================================================

ponder.on("TreasuryV2:QueueTransaction", async ({ event, context }) => {
  await context.db.insert(treasuryTxs).values({
    id: `v2-${event.args.txHash}-${event.log.logIndex}`,
    txHash: event.args.txHash,
    target: event.args.target,
    value: event.args.value,
    signature: event.args.signature,
    data: event.args.data,
    eta: event.args.eta,
    status: "QUEUED",
    treasuryVersion: "v2",
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});

ponder.on("TreasuryV2:ExecuteTransaction", async ({ event, context }) => {
  const txId = `v2-${event.args.txHash}-${event.log.logIndex}`;
  // Find matching queued tx -- try to update by known ID pattern
  // Since the original insert used v2-{txHash}-{logIndex}, we search for it
  // As a practical approach, store status update as a new record if needed
  await context.db.insert(treasuryTxs).values({
    id: `v2-exec-${event.transaction.hash}-${event.log.logIndex}`,
    txHash: event.args.txHash,
    target: event.args.target,
    value: event.args.value,
    signature: event.args.signature,
    data: event.args.data,
    eta: event.args.eta,
    status: "EXECUTED",
    treasuryVersion: "v2",
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  }).onConflictDoNothing();
});

ponder.on("TreasuryV2:CancelTransaction", async ({ event, context }) => {
  await context.db.insert(treasuryTxs).values({
    id: `v2-cancel-${event.transaction.hash}-${event.log.logIndex}`,
    txHash: event.args.txHash,
    target: event.args.target,
    value: event.args.value,
    signature: event.args.signature,
    data: event.args.data,
    eta: event.args.eta,
    status: "CANCELLED",
    treasuryVersion: "v2",
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  }).onConflictDoNothing();
});

// =============================================================================
// TREASURY V2 - Direct transfers
// =============================================================================

ponder.on("TreasuryV2:ETHSent", async ({ event, context }) => {
  await context.db.insert(treasuryTransfers).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    to: event.args.to,
    amount: event.args.amount,
    tokenType: "ETH",
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("TreasuryV2:ERC20Sent", async ({ event, context }) => {
  await context.db.insert(treasuryTransfers).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    to: event.args.to,
    amount: event.args.amount,
    tokenType: "ERC20",
    erc20Token: event.args.erc20Token,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

// =============================================================================
// TREASURY V2 - Config
// =============================================================================

const v2ConfigHandler = (eventName: string) =>
  async ({ event, context }: any) => {
    const params: Record<string, any> = {};
    for (const [key, value] of Object.entries(event.args)) {
      params[key] = typeof value === "bigint" ? value.toString() : value;
    }
    await context.db.insert(treasuryConfigChanges).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventName,
      params,
      treasuryVersion: "v2",
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      txHash: event.transaction.hash,
    });
  };

ponder.on("TreasuryV2:NewAdmin", v2ConfigHandler("NewAdmin"));
ponder.on("TreasuryV2:NewDelay", v2ConfigHandler("NewDelay"));
ponder.on("TreasuryV2:NewPendingAdmin", v2ConfigHandler("NewPendingAdmin"));
ponder.on("TreasuryV2:AdminChanged", v2ConfigHandler("AdminChanged"));
ponder.on("TreasuryV2:Upgraded", v2ConfigHandler("Upgraded"));
