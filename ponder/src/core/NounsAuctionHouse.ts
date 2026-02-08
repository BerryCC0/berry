import { ponder } from "ponder:registry";
import {
  auctions,
  auctionBids,
  nouns,
  auctionConfigChanges,
} from "ponder:schema";
import { resolveAndStoreEns, batchResolveAndStoreEns } from "../helpers/ens";

// =============================================================================
// AuctionCreated
// =============================================================================
ponder.on("NounsAuctionHouse:AuctionCreated", async ({ event, context }) => {
  const { nounId, startTime, endTime } = event.args;
  const settler = event.transaction.from;

  // Resolve ENS for the settler (the person who called settleAuctionAndCreateNew)
  const ensMap = await batchResolveAndStoreEns(context, [settler]);
  const settlerEns = ensMap.get(settler.toLowerCase()) ?? null;

  await context.db.insert(auctions).values({
    nounId: Number(nounId),
    startTime,
    endTime,
    settled: false,
    blockNumber: event.block.number,
  }).onConflictDoNothing();

  // Write the settler to the newly minted noun -- this is the person who
  // triggered settleAuctionAndCreateNew, minting this noun in the process.
  // The noun record already exists (Transfer + NounCreated fire before AuctionCreated).
  try {
    await context.db
      .update(nouns, { id: Number(nounId) })
      .set({
        settledByAddress: settler,
        settledByEns: settlerEns,
        settledAt: event.block.timestamp,
        settledTxHash: event.transaction.hash,
      });
  } catch {
    // Noun may not exist yet for the very first auction
  }
});

// =============================================================================
// AuctionBid
// =============================================================================
ponder.on("NounsAuctionHouse:AuctionBid", async ({ event, context }) => {
  const { nounId, sender, value, extended } = event.args;

  // Resolve ENS for bidder
  await resolveAndStoreEns(context, sender);

  // Deterministic ID: one bid per nounId per transaction
  const bidId = `${event.transaction.hash}-${nounId}`;

  await context.db.insert(auctionBids).values({
    id: bidId,
    nounId: Number(nounId),
    bidder: sender,
    amount: value,
    extended,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

// =============================================================================
// AuctionBidWithClientId -- update latest bid with clientId
// =============================================================================
ponder.on("NounsAuctionHouse:AuctionBidWithClientId", async ({ event, context }) => {
  const { nounId, clientId } = event.args;

  // Update the auction-level clientId (tracks latest bid's client)
  await context.db
    .update(auctions, { nounId: Number(nounId) })
    .set({ clientId: Number(clientId) });

  // Deterministic ID matches the AuctionBid handler -- no map needed
  const bidId = `${event.transaction.hash}-${nounId}`;
  await context.db
    .update(auctionBids, { id: bidId })
    .set({ clientId: Number(clientId) });
});

// =============================================================================
// AuctionExtended
// =============================================================================
ponder.on("NounsAuctionHouse:AuctionExtended", async ({ event, context }) => {
  const { nounId, endTime } = event.args;
  await context.db
    .update(auctions, { nounId: Number(nounId) })
    .set({ endTime });
});

// =============================================================================
// AuctionSettled -- update auction, update noun with winner/settler
// =============================================================================
ponder.on("NounsAuctionHouse:AuctionSettled", async ({ event, context }) => {
  const { nounId, winner, amount } = event.args;
  const settler = event.transaction.from;

  // Resolve ENS for winner and settler
  const ensMap = await batchResolveAndStoreEns(context, [winner, settler]);
  const winnerEns = ensMap.get(winner.toLowerCase()) ?? null;
  const settlerEns = ensMap.get(settler.toLowerCase()) ?? null;

  // Update auction record
  await context.db
    .update(auctions, { nounId: Number(nounId) })
    .set({
      winner,
      amount,
      settled: true,
      settlerAddress: settler,
    });

  // Update noun record with auction result + resolved ENS names
  await context.db
    .update(nouns, { id: Number(nounId) })
    .set({
      winningBid: amount,
      winnerAddress: winner,
      winnerEns,
      settledByAddress: settler,
      settledByEns: settlerEns,
      settledAt: event.block.timestamp,
      settledTxHash: event.transaction.hash,
    });
});

// =============================================================================
// AuctionSettledWithClientId
// =============================================================================
ponder.on("NounsAuctionHouse:AuctionSettledWithClientId", async ({ event, context }) => {
  const { nounId, clientId } = event.args;
  await context.db
    .update(auctions, { nounId: Number(nounId) })
    .set({ clientId: Number(clientId) });
});

// =============================================================================
// Config events
// =============================================================================

ponder.on("NounsAuctionHouse:AuctionReservePriceUpdated", async ({ event, context }) => {
  await context.db.insert(auctionConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "AuctionReservePriceUpdated",
    params: { reservePrice: event.args.reservePrice.toString() },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsAuctionHouse:AuctionMinBidIncrementPercentageUpdated", async ({ event, context }) => {
  await context.db.insert(auctionConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "AuctionMinBidIncrementPercentageUpdated",
    params: { minBidIncrementPercentage: event.args.minBidIncrementPercentage.toString() },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsAuctionHouse:AuctionTimeBufferUpdated", async ({ event, context }) => {
  await context.db.insert(auctionConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "AuctionTimeBufferUpdated",
    params: { timeBuffer: event.args.timeBuffer.toString() },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsAuctionHouse:SanctionsOracleSet", async ({ event, context }) => {
  await context.db.insert(auctionConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "SanctionsOracleSet",
    params: { newSanctionsOracle: event.args.newSanctionsOracle },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsAuctionHouse:Paused", async ({ event, context }) => {
  await context.db.insert(auctionConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "Paused",
    params: { account: event.args.account },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsAuctionHouse:Unpaused", async ({ event, context }) => {
  await context.db.insert(auctionConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "Unpaused",
    params: { account: event.args.account },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsAuctionHouse:OwnershipTransferred", async ({ event, context }) => {
  await context.db.insert(auctionConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "OwnershipTransferred",
    params: {
      previousOwner: event.args.previousOwner,
      newOwner: event.args.newOwner,
    },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});
