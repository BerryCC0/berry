import { ponder } from "ponder:registry";
import {
  nouns,
  transfers,
  delegations,
  voters,
  tokenConfigChanges,
} from "ponder:schema";

// =============================================================================
// NounCreated -- insert a new Noun with seed traits
// =============================================================================
ponder.on("NounsToken:NounCreated", async ({ event, context }) => {
  const { tokenId, seed } = event.args;

  await context.db.insert(nouns).values({
    id: Number(tokenId),
    background: Number(seed.background),
    body: Number(seed.body),
    accessory: Number(seed.accessory),
    head: Number(seed.head),
    glasses: Number(seed.glasses),
    svg: "", // SVG rendering deferred -- populated via separate process or on-chain call
    burned: false,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  }).onConflictDoNothing();
});

// =============================================================================
// NounBurned -- mark noun as burned
// =============================================================================
ponder.on("NounsToken:NounBurned", async ({ event, context }) => {
  const { tokenId } = event.args;

  await context.db
    .update(nouns, { id: Number(tokenId) })
    .set({ burned: true });
});

// =============================================================================
// Transfer -- track every NounsToken transfer, update owner
// =============================================================================
ponder.on("NounsToken:Transfer", async ({ event, context }) => {
  const { from, to, tokenId } = event.args;

  await context.db.insert(transfers).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    from,
    to,
    tokenId: Number(tokenId),
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });

  // Update owner on the noun record
  await context.db
    .update(nouns, { id: Number(tokenId) })
    .set({ owner: to });
});

// =============================================================================
// DelegateChanged -- track delegation history, update voters
// =============================================================================
ponder.on("NounsToken:DelegateChanged", async ({ event, context }) => {
  const { delegator, fromDelegate, toDelegate } = event.args;

  await context.db.insert(delegations).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    delegator,
    fromDelegate,
    toDelegate,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });

  // Ensure both delegates exist in voters table
  for (const addr of [fromDelegate, toDelegate]) {
    if (addr !== "0x0000000000000000000000000000000000000000") {
      await context.db
        .insert(voters)
        .values({
          address: addr,
          delegatedVotes: 0,
          totalVotes: 0,
          firstSeenAt: event.block.timestamp,
        })
        .onConflictDoNothing();
    }
  }
});

// =============================================================================
// DelegateVotesChanged -- update voting power on voters table
// =============================================================================
ponder.on("NounsToken:DelegateVotesChanged", async ({ event, context }) => {
  const { delegate, newBalance } = event.args;

  await context.db
    .insert(voters)
    .values({
      address: delegate,
      delegatedVotes: Number(newBalance),
      totalVotes: 0,
      firstSeenAt: event.block.timestamp,
    })
    .onConflictDoUpdate({ delegatedVotes: Number(newBalance) });
});

// =============================================================================
// Config events -- all go to token_config_changes
// =============================================================================

ponder.on("NounsToken:DescriptorUpdated", async ({ event, context }) => {
  await context.db.insert(tokenConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "DescriptorUpdated",
    params: { descriptor: event.args.descriptor },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsToken:DescriptorLocked", async ({ event, context }) => {
  await context.db.insert(tokenConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "DescriptorLocked",
    params: {},
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsToken:MinterUpdated", async ({ event, context }) => {
  await context.db.insert(tokenConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "MinterUpdated",
    params: { minter: event.args.minter },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsToken:MinterLocked", async ({ event, context }) => {
  await context.db.insert(tokenConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "MinterLocked",
    params: {},
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsToken:SeederUpdated", async ({ event, context }) => {
  await context.db.insert(tokenConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "SeederUpdated",
    params: { seeder: event.args.seeder },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsToken:SeederLocked", async ({ event, context }) => {
  await context.db.insert(tokenConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "SeederLocked",
    params: {},
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsToken:NoundersDAOUpdated", async ({ event, context }) => {
  await context.db.insert(tokenConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "NoundersDAOUpdated",
    params: { noundersDAO: event.args.noundersDAO },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsToken:OwnershipTransferred", async ({ event, context }) => {
  await context.db.insert(tokenConfigChanges).values({
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
