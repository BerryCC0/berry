import { ponder } from "ponder:registry";
import {
  clients,
  clientRewardEvents,
  clientWithdrawals,
  rewardUpdates,
  rewardConfigChanges,
} from "ponder:schema";

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Fetch and parse the NFT image from tokenURI for a client.
 * tokenURI returns a data URI (data:application/json;base64,...) containing
 * JSON metadata with an `image` field (SVG data URI).
 */
async function fetchNftImage(context: any, clientId: bigint): Promise<string | null> {
  try {
    const uri = await context.client.readContract({
      abi: context.contracts.ClientRewards.abi,
      address: context.contracts.ClientRewards.address,
      functionName: "tokenURI",
      args: [clientId],
    });

    if (typeof uri === "string") {
      if (uri.startsWith("data:application/json;base64,")) {
        const json = Buffer.from(
          uri.slice("data:application/json;base64,".length),
          "base64"
        ).toString("utf-8");
        const metadata = JSON.parse(json);
        return metadata.image ?? null;
      }
      if (uri.startsWith("data:application/json,")) {
        const metadata = JSON.parse(
          decodeURIComponent(uri.slice("data:application/json,".length))
        );
        return metadata.image ?? null;
      }
    }
  } catch {
    // tokenURI may not exist for very early clients — ignore
  }
  return null;
}

// =============================================================================
// CLIENT MANAGEMENT
// =============================================================================

ponder.on("ClientRewards:ClientRegistered", async ({ event, context }) => {
  const nftImage = await fetchNftImage(context, event.args.clientId);

  await context.db.insert(clients).values({
    clientId: Number(event.args.clientId),
    name: event.args.name,
    description: event.args.description,
    approved: false,
    totalRewarded: 0n,
    totalWithdrawn: 0n,
    nftImage,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  }).onConflictDoNothing();
});

ponder.on("ClientRewards:ClientUpdated", async ({ event, context }) => {
  const nftImage = await fetchNftImage(context, event.args.clientId);

  await context.db.insert(clients).values({
    clientId: Number(event.args.clientId),
    name: event.args.name,
    description: event.args.description,
    approved: false,
    totalRewarded: 0n,
    totalWithdrawn: 0n,
    nftImage,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  }).onConflictDoUpdate({
    name: event.args.name,
    description: event.args.description,
    nftImage,
  });
});

ponder.on("ClientRewards:ClientApprovalSet", async ({ event, context }) => {
  const nftImage = await fetchNftImage(context, event.args.clientId);

  const update: Record<string, any> = { approved: event.args.approved };
  if (nftImage) update.nftImage = nftImage;

  await context.db.insert(clients).values({
    clientId: Number(event.args.clientId),
    name: "",
    description: "",
    approved: event.args.approved,
    totalRewarded: 0n,
    totalWithdrawn: 0n,
    nftImage,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  }).onConflictDoUpdate(update);
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

  // Read authoritative on-chain state + NFT image for this client
  const [metadata, nftImage] = await Promise.all([
    context.client.readContract({
      abi: context.contracts.ClientRewards.abi,
      address: context.contracts.ClientRewards.address,
      functionName: "clientMetadata",
      args: [event.args.clientId],
    }),
    fetchNftImage(context, event.args.clientId),
  ]);

  const rewardUpdate: Record<string, any> = {
    totalRewarded: metadata.rewarded,
    totalWithdrawn: metadata.withdrawn,
  };
  if (nftImage) rewardUpdate.nftImage = nftImage;

  await context.db.insert(clients).values({
    clientId: Number(event.args.clientId),
    name: metadata.name,
    description: metadata.description,
    approved: metadata.approved,
    totalRewarded: metadata.rewarded,
    totalWithdrawn: metadata.withdrawn,
    nftImage,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  }).onConflictDoUpdate(rewardUpdate);
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

  // Read authoritative on-chain state + NFT image for this client
  const [metadata, nftImage] = await Promise.all([
    context.client.readContract({
      abi: context.contracts.ClientRewards.abi,
      address: context.contracts.ClientRewards.address,
      functionName: "clientMetadata",
      args: [event.args.clientId],
    }),
    fetchNftImage(context, event.args.clientId),
  ]);

  const withdrawUpdate: Record<string, any> = {
    totalRewarded: metadata.rewarded,
    totalWithdrawn: metadata.withdrawn,
  };
  if (nftImage) withdrawUpdate.nftImage = nftImage;

  await context.db.insert(clients).values({
    clientId: Number(event.args.clientId),
    name: metadata.name,
    description: metadata.description,
    approved: metadata.approved,
    totalRewarded: metadata.rewarded,
    totalWithdrawn: metadata.withdrawn,
    nftImage,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  }).onConflictDoUpdate(withdrawUpdate);
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
