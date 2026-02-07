import { ponder } from "ponder:registry";
import {
  nouns,
  transfers,
  delegations,
  voters,
  tokenConfigChanges,
} from "ponder:schema";
import { computeAllNounMetrics } from "../../../app/lib/nouns/utils/noun-metrics";
import { NounsDescriptorV3ABI } from "../../../app/lib/nouns/abis/NounsDescriptorV3";

const DESCRIPTOR_V3_ADDRESS = "0x33a9c445fb4fb21f2c030a6b2d3e2f12d017bfac" as const;
const DESCRIPTOR_V3_START_BLOCK = 20059934n;

// =============================================================================
// NounCreated -- insert a new Noun with seed traits + metrics + SVG
// =============================================================================
ponder.on("NounsToken:NounCreated", async ({ event, context }) => {
  const { tokenId, seed } = event.args;

  const seedObj = {
    background: Number(seed.background),
    body: Number(seed.body),
    accessory: Number(seed.accessory),
    head: Number(seed.head),
    glasses: Number(seed.glasses),
  };

  // Compute area, colorCount, brightness from seed (pure computation, no RPC)
  const metrics = computeAllNounMetrics(seedObj);

  // Try to fetch SVG from NounsDescriptorV3 (only exists after block 20059934)
  let svg = "";
  if (event.block.number >= DESCRIPTOR_V3_START_BLOCK) {
    try {
      svg = await context.client.readContract({
        abi: NounsDescriptorV3ABI,
        address: DESCRIPTOR_V3_ADDRESS,
        functionName: "generateSVGImage",
        args: [seed],
      }) as string;
    } catch {
      // Descriptor call failed, leave SVG empty
    }
  }

  await context.db.insert(nouns).values({
    id: Number(tokenId),
    background: seedObj.background,
    body: seedObj.body,
    accessory: seedObj.accessory,
    head: seedObj.head,
    glasses: seedObj.glasses,
    svg,
    area: metrics.area,
    colorCount: metrics.color_count,
    brightness: metrics.brightness,
    burned: false,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  }).onConflictDoUpdate({
    background: seedObj.background,
    body: seedObj.body,
    accessory: seedObj.accessory,
    head: seedObj.head,
    glasses: seedObj.glasses,
    svg,
    area: metrics.area,
    colorCount: metrics.color_count,
    brightness: metrics.brightness,
  });
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

  // For mints (from 0x0), Transfer fires BEFORE NounCreated in the same tx,
  // so the noun record doesn't exist yet. Insert a placeholder that NounCreated
  // will fill in with seed/metrics/SVG data via onConflictDoUpdate.
  const isMint = from === "0x0000000000000000000000000000000000000000";

  if (isMint) {
    await context.db
      .insert(nouns)
      .values({
        id: Number(tokenId),
        background: 0,
        body: 0,
        accessory: 0,
        head: 0,
        glasses: 0,
        svg: "",
        owner: to,
        burned: false,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
      })
      .onConflictDoNothing();
  } else {
    // Regular transfer -- noun record guaranteed to exist
    await context.db
      .update(nouns, { id: Number(tokenId) })
      .set({ owner: to });
  }
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
