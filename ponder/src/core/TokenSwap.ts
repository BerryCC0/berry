/**
 * TokenSwap handlers — index $nouns NFT-backed token activity.
 *
 * The contract is at the same address as the $nouns ERC-20 (0x5c17…7619C)
 * and emits three categorical events:
 *   - Deposit(uint256[] tokenIds, address indexed to)
 *   - Redeem (uint256[] tokenIds, address indexed to)
 *   - Swap   (uint256[] tokensIn, uint256[] tokensOut, address indexed to)
 *
 * Each row in token_swap_events maps to a single emission. The accompanying
 * NounsToken Transfer events still flow through the ordinary transfer indexer;
 * the activity feed should join the two so it can label these as swaps rather
 * than anonymous transfers.
 */

import { ponder } from "ponder:registry";
import { tokenSwapEvents } from "ponder:schema";

function eventId(txHash: string, logIndex: number) {
  return `${txHash}-${logIndex}`;
}

ponder.on("TokenSwap:Deposit", async ({ event, context }) => {
  await context.db.insert(tokenSwapEvents).values({
    id: eventId(event.transaction.hash, event.log.logIndex),
    kind: "deposit",
    actor: event.args.to,
    tokensIn: event.args.tokenIds.map((id) => Number(id)),
    tokensOut: [],
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("TokenSwap:Redeem", async ({ event, context }) => {
  await context.db.insert(tokenSwapEvents).values({
    id: eventId(event.transaction.hash, event.log.logIndex),
    kind: "redeem",
    actor: event.args.to,
    tokensIn: [],
    tokensOut: event.args.tokenIds.map((id) => Number(id)),
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("TokenSwap:Swap", async ({ event, context }) => {
  await context.db.insert(tokenSwapEvents).values({
    id: eventId(event.transaction.hash, event.log.logIndex),
    kind: "swap",
    actor: event.args.to,
    tokensIn: event.args.tokensIn.map((id) => Number(id)),
    tokensOut: event.args.tokensOut.map((id) => Number(id)),
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});
