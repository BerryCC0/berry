import { ponder } from "ponder:registry";
import { nounsV2Auctions, nounsV2AuctionBids } from "ponder:schema";

ponder.on("NounV2AuctionHouse:AuctionCreated", async ({ event, context }) => {
  const { nounId, startTime, endTime } = event.args;
  await context.db
    .insert(nounsV2Auctions)
    .values({
      nounId: Number(nounId),
      startTime,
      endTime,
      settled: false,
      blockNumber: event.block.number,
    })
    .onConflictDoNothing();
});

ponder.on("NounV2AuctionHouse:AuctionBid", async ({ event, context }) => {
  const { nounId, sender, value, extended } = event.args;
  const bidId = `${event.transaction.hash}-${nounId}`;
  await context.db.insert(nounsV2AuctionBids).values({
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

ponder.on("NounV2AuctionHouse:AuctionExtended", async ({ event, context }) => {
  const { nounId, endTime } = event.args;
  await context.db
    .update(nounsV2Auctions, { nounId: Number(nounId) })
    .set({ endTime });
});

ponder.on("NounV2AuctionHouse:AuctionSettled", async ({ event, context }) => {
  const { nounId, winner, amount } = event.args;
  const settler = event.transaction.from;
  await context.db
    .update(nounsV2Auctions, { nounId: Number(nounId) })
    .set({
      winner,
      amount,
      settled: true,
      settlerAddress: settler,
      settledTimestamp: event.block.timestamp,
    });
});
