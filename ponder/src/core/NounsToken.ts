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
import { resolveAndStoreEns, batchResolveAndStoreEns } from "../helpers/ens";

// NounsToken address -- used to read which descriptor is active at each block
const NOUNS_TOKEN_ADDRESS = "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" as const;

// Minimal ABI for reading the active descriptor address from NounsToken
const descriptorGetterABI = [
  {
    inputs: [],
    name: "descriptor",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

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

  // Dynamically read which descriptor the NounsToken was using at this block,
  // then call generateSVGImage on that descriptor. This guarantees correctness
  // even as the descriptor was upgraded (V1 → V2 → V3) and art was added over time.
  let svg = "";
  try {
    const descriptorAddress = await context.client.readContract({
      abi: descriptorGetterABI,
      address: NOUNS_TOKEN_ADDRESS,
      functionName: "descriptor",
    });

    svg = await context.client.readContract({
      abi: NounsDescriptorV3ABI,
      address: descriptorAddress,
      functionName: "generateSVGImage",
      args: [seed],
    }) as string;
  } catch {
    // Descriptor call failed (e.g. very early blocks before art loaded), leave SVG empty
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
    .set({ burned: true, burnedAt: event.block.timestamp });
});

// =============================================================================
// Transfer -- track every NounsToken transfer, update owner
// =============================================================================
ponder.on("NounsToken:Transfer", async ({ event, context }) => {
  const { from, to, tokenId } = event.args;

  // Resolve ENS for new owner
  await resolveAndStoreEns(context, to);

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

  // Resolve ENS for all delegation participants
  const ensMap = await batchResolveAndStoreEns(context, [delegator, fromDelegate, toDelegate]);

  await context.db.insert(delegations).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    delegator,
    fromDelegate,
    toDelegate,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });

  // Ensure both delegates exist in voters table (with ENS)
  for (const addr of [fromDelegate, toDelegate]) {
    if (addr !== "0x0000000000000000000000000000000000000000") {
      const ensName = ensMap.get(addr.toLowerCase()) ?? null;
      await context.db
        .insert(voters)
        .values({
          address: addr,
          ensName,
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

  // Resolve ENS for delegate
  const ensName = await resolveAndStoreEns(context, delegate);

  await context.db
    .insert(voters)
    .values({
      address: delegate,
      ensName,
      delegatedVotes: Number(newBalance),
      totalVotes: 0,
      firstSeenAt: event.block.timestamp,
    })
    .onConflictDoUpdate({ delegatedVotes: Number(newBalance), ensName });
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
