import { ponder } from "ponder:registry";
import { nounsV2, nounsV2Transfers } from "ponder:schema";

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

  // Upsert in both mint and regular-transfer cases. The V1 handler relies on
  // "noun row guaranteed to exist" after the mint Transfer, but on V2 that
  // assumption breaks for the very first token (tokenId 0): the historical
  // Transfer fires from the auction house before any NounCreated row exists.
  // Inserting with placeholder traits keeps things consistent; NounCreated
  // fills the real seed in via its own onConflictDoUpdate when it fires.
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
});
