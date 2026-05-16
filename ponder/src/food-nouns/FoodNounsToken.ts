import { ponder } from "ponder:registry";
import { foodNouns, foodTransfers, foodDelegations, foodVoters } from "ponder:schema";
import { fnDescriptorAbi } from "../../../app/lib/food-nouns/abis/fnDescriptor";

const FOOD_NOUNS_TOKEN = "0xF5331380e1d19757388A6E6198BF3BDc93D8b07a" as const;

// Minimal ABI for reading the active descriptor at index time. Inlined so the
// handler doesn't depend on the full token ABI shape.
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
// NounCreated — insert a Food Noun with seed traits + on-chain-rendered SVG.
// Mirrors the mainline Nouns flow: read active descriptor, call
// generateSVGImage(seed). If the descriptor read fails (e.g. very early
// blocks before art was uploaded), persist the row with an empty SVG.
// =============================================================================
ponder.on("FoodNounsToken:NounCreated", async ({ event, context }) => {
  const { tokenId, seed } = event.args;

  const seedObj = {
    background: Number(seed.background),
    body: Number(seed.body),
    accessory: Number(seed.accessory),
    head: Number(seed.head),
    glasses: Number(seed.glasses),
  };

  let svg = "";
  try {
    const descriptorAddress = await context.client.readContract({
      abi: descriptorGetterABI,
      address: FOOD_NOUNS_TOKEN,
      functionName: "descriptor",
    });

    svg = (await context.client.readContract({
      abi: fnDescriptorAbi,
      address: descriptorAddress,
      functionName: "generateSVGImage",
      args: [seed],
    })) as string;
  } catch {
    // Descriptor read failed — leave SVG empty.
  }

  await context.db
    .insert(foodNouns)
    .values({
      id: Number(tokenId),
      background: seedObj.background,
      body: seedObj.body,
      accessory: seedObj.accessory,
      head: seedObj.head,
      glasses: seedObj.glasses,
      svg,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      background: seedObj.background,
      body: seedObj.body,
      accessory: seedObj.accessory,
      head: seedObj.head,
      glasses: seedObj.glasses,
      svg,
    });
});

// =============================================================================
// Transfer — track every token transfer; on mints, seed the noun row.
// V1-style: NounCreated fires after Transfer in the mint tx, so we insert a
// placeholder here and let NounCreated fill in seed + SVG via the conflict
// update above.
// =============================================================================
ponder.on("FoodNounsToken:Transfer", async ({ event, context }) => {
  const { from, to, tokenId } = event.args;

  await context.db.insert(foodTransfers).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    from,
    to,
    tokenId: Number(tokenId),
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });

  const isMint = from === "0x0000000000000000000000000000000000000000";

  if (isMint) {
    await context.db
      .insert(foodNouns)
      .values({
        id: Number(tokenId),
        background: 0,
        body: 0,
        accessory: 0,
        head: 0,
        glasses: 0,
        svg: "",
        owner: to,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
      })
      .onConflictDoUpdate({ owner: to });
  } else {
    await context.db.update(foodNouns, { id: Number(tokenId) }).set({ owner: to });
  }
});

// =============================================================================
// DelegateChanged — record delegation change; bootstrap voter rows.
// =============================================================================
ponder.on("FoodNounsToken:DelegateChanged", async ({ event, context }) => {
  const { delegator, fromDelegate, toDelegate } = event.args;

  await context.db.insert(foodDelegations).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    delegator,
    fromDelegate,
    toDelegate,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });

  for (const addr of [fromDelegate, toDelegate]) {
    if (addr !== "0x0000000000000000000000000000000000000000") {
      await context.db
        .insert(foodVoters)
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
// DelegateVotesChanged — keep current voting power in sync on the voter row.
// =============================================================================
ponder.on("FoodNounsToken:DelegateVotesChanged", async ({ event, context }) => {
  const { delegate, newBalance } = event.args;

  await context.db
    .insert(foodVoters)
    .values({
      address: delegate,
      delegatedVotes: Number(newBalance),
      totalVotes: 0,
      firstSeenAt: event.block.timestamp,
    })
    .onConflictDoUpdate({ delegatedVotes: Number(newBalance) });
});
