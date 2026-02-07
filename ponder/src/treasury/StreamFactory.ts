import { ponder } from "ponder:registry";
import { streams } from "ponder:schema";

ponder.on("StreamFactory:StreamCreated", async ({ event, context }) => {
  await context.db.insert(streams).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    msgSender: event.args.msgSender,
    payer: event.args.payer,
    recipient: event.args.recipient,
    tokenAmount: event.args.tokenAmount,
    tokenAddress: event.args.tokenAddress,
    startTime: event.args.startTime,
    stopTime: event.args.stopTime,
    streamAddress: event.args.streamAddress,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});
