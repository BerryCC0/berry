import { ponder } from "ponder:registry";
import { tokenBuyerTrades, tokenBuyerConfig } from "ponder:schema";

// =============================================================================
// TRADES
// =============================================================================

ponder.on("TokenBuyer:SoldETH", async ({ event, context }) => {
  await context.db.insert(tokenBuyerTrades).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    to: event.args.to,
    ethOut: event.args.ethOut,
    tokenIn: event.args.tokenIn,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

// =============================================================================
// CONFIG EVENTS
// =============================================================================

const tbConfigHandler = (eventName: string) =>
  async ({ event, context }: any) => {
    const params: Record<string, any> = {};
    for (const [key, value] of Object.entries(event.args)) {
      params[key] = typeof value === "bigint" ? value.toString() : value;
    }
    await context.db.insert(tokenBuyerConfig).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      eventName,
      params,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      txHash: event.transaction.hash,
    });
  };

ponder.on("TokenBuyer:PriceFeedSet", tbConfigHandler("PriceFeedSet"));
ponder.on("TokenBuyer:PayerSet", tbConfigHandler("PayerSet"));
ponder.on("TokenBuyer:BaselinePaymentTokenAmountSet", tbConfigHandler("BaselinePaymentTokenAmountSet"));
ponder.on("TokenBuyer:BotDiscountBPsSet", tbConfigHandler("BotDiscountBPsSet"));
ponder.on("TokenBuyer:ETHWithdrawn", tbConfigHandler("ETHWithdrawn"));
ponder.on("TokenBuyer:AdminSet", tbConfigHandler("AdminSet"));
ponder.on("TokenBuyer:MaxAdminBaselinePaymentTokenAmountSet", tbConfigHandler("MaxAdminBaselinePaymentTokenAmountSet"));
ponder.on("TokenBuyer:MinAdminBaselinePaymentTokenAmountSet", tbConfigHandler("MinAdminBaselinePaymentTokenAmountSet"));
ponder.on("TokenBuyer:MaxAdminBotDiscountBPsSet", tbConfigHandler("MaxAdminBotDiscountBPsSet"));
ponder.on("TokenBuyer:MinAdminBotDiscountBPsSet", tbConfigHandler("MinAdminBotDiscountBPsSet"));
ponder.on("TokenBuyer:OwnershipTransferred", tbConfigHandler("OwnershipTransferred"));
ponder.on("TokenBuyer:Paused", tbConfigHandler("Paused"));
ponder.on("TokenBuyer:Unpaused", tbConfigHandler("Unpaused"));
