import { ponder } from "ponder:registry";
import { payerDebts, payerEvents } from "ponder:schema";

ponder.on("Payer:RegisteredDebt", async ({ event, context }) => {
  await context.db.insert(payerDebts).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    account: event.args.account,
    amount: event.args.amount,
    eventType: "REGISTERED",
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});

ponder.on("Payer:PaidBackDebt", async ({ event, context }) => {
  await context.db.insert(payerDebts).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    account: event.args.account,
    amount: event.args.amount,
    eventType: "PAID_BACK",
    remainingDebt: event.args.remainingDebt,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});

ponder.on("Payer:TokensWithdrawn", async ({ event, context }) => {
  await context.db.insert(payerEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "TokensWithdrawn",
    params: {
      account: event.args.account,
      amount: event.args.amount.toString(),
    },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});

ponder.on("Payer:OwnershipTransferred", async ({ event, context }) => {
  await context.db.insert(payerEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "OwnershipTransferred",
    params: {
      previousOwner: event.args.previousOwner,
      newOwner: event.args.newOwner,
    },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});
