import { ponder } from "ponder:registry";
import {
  auctions,
  auctionBids,
  nouns,
  auctionConfigChanges,
} from "ponder:schema";
import { resolveEns } from "../helpers/ens";

// =============================================================================
// AuctionCreated
// =============================================================================
ponder.on("NounsAuctionHouse:AuctionCreated", async ({ event, context }) => {
  const { nounId, startTime, endTime } = event.args;

  await context.db.insert(auctions).values({
    nounId: Number(nounId),
    startTime,
    endTime,
    settled: false,
    blockNumber: event.block.number,
  }).onConflictDoNothing();
});

// =============================================================================
// AuctionBid
// =============================================================================
ponder.on("NounsAuctionHouse:AuctionBid", async ({ event, context }) => {
  const { nounId, sender, value, extended } = event.args;

  await context.db.insert(auctionBids).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
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
  // This event fires in same tx as AuctionBid; we store clientId on auction
  // since it tracks the winning bid's client
  const { nounId, clientId } = event.args;
  await context.db
    .update(auctions, { nounId: Number(nounId) })
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

  // Resolve ENS names
  const [settlerEns, winnerEns] = await Promise.all([
    resolveEns(settler),
    resolveEns(winner),
  ]);

  // Update auction record
  await context.db
    .update(auctions, { nounId: Number(nounId) })
    .set({
      winner,
      amount,
      settled: true,
      settlerAddress: settler,
    });

  // Update noun record with auction result
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
