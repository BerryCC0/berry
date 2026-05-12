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

// Upsert in Extended/Settled too. The very first V2 auction's AuctionCreated
// fires in the same block as the contract's unpause() call, which may sit
// just before the indexer's startBlock — so the Settled event arrives with
// no prior auction row. startTime/endTime get placeholder 0n in that case;
// every later auction has the proper values from AuctionCreated.
ponder.on("NounV2AuctionHouse:AuctionExtended", async ({ event, context }) => {
  const { nounId, endTime } = event.args;
  await context.db
    .insert(nounsV2Auctions)
    .values({
      nounId: Number(nounId),
      startTime: 0n,
      endTime,
      settled: false,
      blockNumber: event.block.number,
    })
    .onConflictDoUpdate({ endTime });
});

ponder.on("NounV2AuctionHouse:AuctionSettled", async ({ event, context }) => {
  const { nounId, winner, amount } = event.args;
  const settler = event.transaction.from;
  await context.db
    .insert(nounsV2Auctions)
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
