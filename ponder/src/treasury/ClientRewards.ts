import { ponder } from "ponder:registry";
import {
  clients,
  clientRewardEvents,
  clientWithdrawals,
  rewardUpdates,
  rewardConfigChanges,
} from "ponder:schema";

// =============================================================================
// CLIENT MANAGEMENT
// =============================================================================

ponder.on("ClientRewards:ClientRegistered", async ({ event, context }) => {
  await context.db.insert(clients).values({
    clientId: Number(event.args.clientId),
    name: event.args.name,
    description: event.args.description,
    approved: false,
    totalRewarded: 0n,
    totalWithdrawn: 0n,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  }).onConflictDoNothing();
});

ponder.on("ClientRewards:ClientUpdated", async ({ event, context }) => {
  await context.db
    .update(clients, { clientId: Number(event.args.clientId) })
    .set({
      name: event.args.name,
      description: event.args.description,
    });
});

ponder.on("ClientRewards:ClientApprovalSet", async ({ event, context }) => {
  await context.db
    .update(clients, { clientId: Number(event.args.clientId) })
    .set({ approved: event.args.approved });
});

// =============================================================================
// REWARDS
// =============================================================================

ponder.on("ClientRewards:ClientRewarded", async ({ event, context }) => {
  await context.db.insert(clientRewardEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    clientId: Number(event.args.clientId),
    amount: event.args.amount,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });

  // Update total rewarded
  const client = await context.db.find(clients, { clientId: Number(event.args.clientId) });
  if (client) {
    await context.db.update(clients, { clientId: Number(event.args.clientId) }).set({
      totalRewarded: client.totalRewarded + event.args.amount,
    });
  }
});

ponder.on("ClientRewards:ClientBalanceWithdrawal", async ({ event, context }) => {
  await context.db.insert(clientWithdrawals).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    clientId: Number(event.args.clientId),
    amount: event.args.amount,
    to: event.args.to,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });

  const withdrawClient = await context.db.find(clients, { clientId: Number(event.args.clientId) });
  if (withdrawClient) {
    await context.db.update(clients, { clientId: Number(event.args.clientId) }).set({
      totalWithdrawn: withdrawClient.totalWithdrawn + event.args.amount,
    });
  }
});

// =============================================================================
// REWARD UPDATES
// =============================================================================

ponder.on("ClientRewards:AuctionRewardsUpdated", async ({ event, context }) => {
  await context.db.insert(rewardUpdates).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    updateType: "AUCTION",
    params: {
      firstAuctionId: event.args.firstAuctionId.toString(),
      lastAuctionId: event.args.lastAuctionId.toString(),
    },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});

ponder.on("ClientRewards:ProposalRewardsUpdated", async ({ event, context }) => {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(event.args)) {
    params[key] = typeof value === "bigint" ? value.toString() : String(value);
  }
  await context.db.insert(rewardUpdates).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    updateType: "PROPOSAL",
    params,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});

// =============================================================================
// REWARD CONFIG
// =============================================================================

const rewardCfgHandler = (eventName: string) =>
  async ({ event, context }: any) => {
    const params: Record<string, any> = {};
    for (const [key, value] of Object.entries(event.args ?? {})) {
      params[key] = typeof value === "bigint" ? value.toString() : value;
    }
    await context.db.insert(rewardConfigChanges).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventName,
      params,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      txHash: event.transaction.hash,
    });
  };

ponder.on("ClientRewards:AuctionRewardsEnabled", rewardCfgHandler("AuctionRewardsEnabled"));
ponder.on("ClientRewards:AuctionRewardsDisabled", rewardCfgHandler("AuctionRewardsDisabled"));
ponder.on("ClientRewards:ProposalRewardsEnabled", rewardCfgHandler("ProposalRewardsEnabled"));
ponder.on("ClientRewards:ProposalRewardsDisabled", rewardCfgHandler("ProposalRewardsDisabled"));
ponder.on("ClientRewards:Paused", rewardCfgHandler("Paused"));
ponder.on("ClientRewards:Unpaused", rewardCfgHandler("Unpaused"));
ponder.on("ClientRewards:OwnershipTransferred", rewardCfgHandler("OwnershipTransferred"));
ponder.on("ClientRewards:AdminChanged", rewardCfgHandler("AdminChanged"));
ponder.on("ClientRewards:Upgraded", rewardCfgHandler("Upgraded"));
