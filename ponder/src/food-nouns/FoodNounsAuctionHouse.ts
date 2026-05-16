import { ponder } from "ponder:registry";
import { foodAuctions, foodAuctionBids } from "ponder:schema";

ponder.on("FoodNounsAuctionHouse:AuctionCreated", async ({ event, context }) => {
  const { nounId, startTime, endTime } = event.args;
  await context.db
    .insert(foodAuctions)
    .values({
      nounId: Number(nounId),
      startTime,
      endTime,
      settled: false,
      blockNumber: event.block.number,
    })
    .onConflictDoNothing();
});

ponder.on("FoodNounsAuctionHouse:AuctionBid", async ({ event, context }) => {
  const { nounId, sender, value, extended } = event.args;
  const bidId = `${event.transaction.hash}-${nounId}`;
  await context.db.insert(foodAuctionBids).values({
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

// Upsert in Extended / Settled too. If indexing starts mid-auction the row
// won't exist from AuctionCreated, but Extended/Settled still need to land.
ponder.on("FoodNounsAuctionHouse:AuctionExtended", async ({ event, context }) => {
  const { nounId, endTime } = event.args;
  await context.db
    .insert(foodAuctions)
    .values({
      nounId: Number(nounId),
      startTime: 0n,
      endTime,
      settled: false,
      blockNumber: event.block.number,
    })
    .onConflictDoUpdate({ endTime });
});

ponder.on("FoodNounsAuctionHouse:AuctionSettled", async ({ event, context }) => {
  const { nounId, winner, amount } = event.args;
  const settler = event.transaction.from;
  await context.db
    .insert(foodAuctions)
    .values({
      nounId: Number(nounId),
      startTime: 0n,
      endTime: 0n,
      settled: true,
      winner,
      amount,
      settlerAddress: settler,
      settledTimestamp: event.block.timestamp,
      blockNumber: event.block.number,
    })
    .onConflictDoUpdate({
      winner,
      amount,
      settled: true,
      settlerAddress: settler,
      settledTimestamp: event.block.timestamp,
    });
});
