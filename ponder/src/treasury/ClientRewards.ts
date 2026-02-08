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
  await context.db.insert(clients).values({
    clientId: Number(event.args.clientId),
    name: event.args.name,
    description: event.args.description,
    approved: false,
    totalRewarded: 0n,
    totalWithdrawn: 0n,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  }).onConflictDoUpdate({
    name: event.args.name,
    description: event.args.description,
  });
});

ponder.on("ClientRewards:ClientApprovalSet", async ({ event, context }) => {
  await context.db.insert(clients).values({
    clientId: Number(event.args.clientId),
    name: "",
    description: "",
    approved: event.args.approved,
    totalRewarded: 0n,
    totalWithdrawn: 0n,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  }).onConflictDoUpdate({
    approved: event.args.approved,
  });
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

  // Read authoritative on-chain state for this client
  const metadata = await context.client.readContract({
    abi: context.contracts.ClientRewards.abi,
    address: context.contracts.ClientRewards.address,
    functionName: "clientMetadata",
    args: [event.args.clientId],
  });

  await context.db.insert(clients).values({
    clientId: Number(event.args.clientId),
    name: metadata.name,
    description: metadata.description,
    approved: metadata.approved,
    totalRewarded: metadata.rewarded,
    totalWithdrawn: metadata.withdrawn,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  }).onConflictDoUpdate({
    totalRewarded: metadata.rewarded,
    totalWithdrawn: metadata.withdrawn,
  });
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

  // Read authoritative on-chain state for this client
  const metadata = await context.client.readContract({
    abi: context.contracts.ClientRewards.abi,
    address: context.contracts.ClientRewards.address,
    functionName: "clientMetadata",
    args: [event.args.clientId],
  });

  await context.db.insert(clients).values({
    clientId: Number(event.args.clientId),
    name: metadata.name,
    description: metadata.description,
    approved: metadata.approved,
    totalRewarded: metadata.rewarded,
    totalWithdrawn: metadata.withdrawn,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  }).onConflictDoUpdate({
    totalRewarded: metadata.rewarded,
    totalWithdrawn: metadata.withdrawn,
  });
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
