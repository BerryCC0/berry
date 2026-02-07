import { ponder } from "ponder:registry";
import { descriptorConfigChanges } from "ponder:schema";

// All DescriptorV3 events go to descriptor_config table

ponder.on("NounsDescriptorV3:ArtUpdated", async ({ event, context }) => {
  await context.db.insert(descriptorConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "ArtUpdated",
    params: { art: event.args.art },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsDescriptorV3:BaseURIUpdated", async ({ event, context }) => {
  await context.db.insert(descriptorConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "BaseURIUpdated",
    params: { baseURI: event.args.baseURI },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsDescriptorV3:DataURIToggled", async ({ event, context }) => {
  await context.db.insert(descriptorConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "DataURIToggled",
    params: { enabled: event.args.enabled },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsDescriptorV3:PartsLocked", async ({ event, context }) => {
  await context.db.insert(descriptorConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "PartsLocked",
    params: {},
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsDescriptorV3:RendererUpdated", async ({ event, context }) => {
  await context.db.insert(descriptorConfigChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    eventName: "RendererUpdated",
    params: { renderer: event.args.renderer },
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("NounsDescriptorV3:OwnershipTransferred", async ({ event, context }) => {
  await context.db.insert(descriptorConfigChanges).values({
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
