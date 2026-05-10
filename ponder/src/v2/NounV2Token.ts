import { ponder } from "ponder:registry";
import { nounsV2, nounsV2Transfers } from "ponder:schema";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

// Slobber rule constants — must match NounV2SlobberSeeder on-chain.
const SLOBBER_INDEX = 143;

// =============================================================================
// NounCreated — insert a new V2 noun with its seed traits.
// V2 reads art via `tokenURI` / `dataURI` — we don't snapshot the SVG into the
// indexer, since the descriptor is mutable (proposable traits) and re-rendering
// historical SVGs would drift. Frontend pulls dataURI(tokenId) directly.
// =============================================================================
ponder.on("NounV2Token:NounCreated", async ({ event, context }) => {
  const { tokenId, seed } = event.args;

  const seedObj = {
    background: Number(seed.background),
    body: Number(seed.body),
    accessory: Number(seed.accessory),
    head: Number(seed.head),
    glasses: Number(seed.glasses),
  };

  await context.db
    .insert(nounsV2)
    .values({
      id: Number(tokenId),
      background: seedObj.background,
      body: seedObj.body,
      accessory: seedObj.accessory,
      head: seedObj.head,
      glasses: seedObj.glasses,
      isSlobber: seedObj.accessory === SLOBBER_INDEX,
      burned: false,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      background: seedObj.background,
      body: seedObj.body,
      accessory: seedObj.accessory,
      head: seedObj.head,
      glasses: seedObj.glasses,
      isSlobber: seedObj.accessory === SLOBBER_INDEX,
    });
});

// =============================================================================
// NounBurned
// =============================================================================
ponder.on("NounV2Token:NounBurned", async ({ event, context }) => {
  const { tokenId } = event.args;
  await context.db
    .update(nounsV2, { id: Number(tokenId) })
    .set({ burned: true, burnedAt: event.block.timestamp });
});

// =============================================================================
// Transfer — record + update owner. For mints (from = 0x0) the noun row may
// not exist yet (NounCreated fires after Transfer in the same tx); insert a
// placeholder so the owner is captured immediately.
// =============================================================================
ponder.on("NounV2Token:Transfer", async ({ event, context }) => {
  const { from, to, tokenId } = event.args;

  await context.db.insert(nounsV2Transfers).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    from,
    to,
    tokenId: Number(tokenId),
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });

  if (from === ZERO) {
    await context.db
      .insert(nounsV2)
      .values({
        id: Number(tokenId),
        background: 0,
        body: 0,
        accessory: 0,
        head: 0,
        glasses: 0,
        owner: to,
        isSlobber: false,
        burned: false,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
      })
      .onConflictDoUpdate({ owner: to });
  } else {
    await context.db
      .update(nounsV2, { id: Number(tokenId) })
      .set({ owner: to });
  }
});
