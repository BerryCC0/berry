import { ponder } from "ponder:registry";
import {
  propdates,
  propdateAdmins,
  propdateAdminChanges,
} from "ponder:schema";
import { resolveAndStoreEns } from "../helpers/ens";

// =============================================================================
// POST UPDATE
// =============================================================================
//
// Anyone holding the propUpdateAdmin role for a proposal can post a status
// update. The contract emits PostUpdate with the proposal id, a completion
// flag, and the update text. We store every update and also keep the
// propdateAdmins row in sync so consumers have an easy "current state" read.

ponder.on("Propdates:PostUpdate", async ({ event, context }) => {
  const { propId, isCompleted, update } = event.args;
  const proposalId = Number(propId);

  // tx.from is the EOA that originated the call. The actual propUpdateAdmin
  // may be a smart contract calling postUpdate on behalf of itself, so we
  // also try to read the contract's view to capture the canonical admin.
  // If the contract call fails we fall back to tx.from.
  let admin = event.transaction.from;
  try {
    const info = await context.client.readContract({
      abi: context.contracts.Propdates.abi,
      address: context.contracts.Propdates.address,
      functionName: "propdateInfo",
      args: [propId],
    });
    if (info && typeof info === "object" && "propUpdateAdmin" in info) {
      admin = info.propUpdateAdmin as `0x${string}`;
    }
  } catch {
    // Fall back to tx.from above.
  }

  await context.db.insert(propdates).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    proposalId,
    isCompleted,
    update,
    admin,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });

  await resolveAndStoreEns(context, admin);

  // Mirror the propdateInfo struct: track current admin + last update.
  // PostUpdate doesn't change the admin role itself, so on conflict we leave
  // the admin column alone -- only the status/timestamps refresh.
  await context.db
    .insert(propdateAdmins)
    .values({
      proposalId,
      admin,
      isCompleted,
      lastUpdated: event.block.timestamp,
      updatedBlock: event.block.number,
      updatedTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      isCompleted,
      lastUpdated: event.block.timestamp,
      updatedBlock: event.block.number,
      updatedTimestamp: event.block.timestamp,
    });
});

// =============================================================================
// ADMIN ROLE CHANGES
// =============================================================================
//
// The role can change three ways:
//   - Transferred: current admin voluntarily hands off
//   - Migrated:    DAO bulk-assigns via batchTransferPropUpdateAdmins
//   - Recovered:   superAdmin force-reassigns (escape hatch)
// Each emits the same {propId, oldAdmin, newAdmin} shape, so we share a
// helper. We log every change and overwrite the current-admin row.

async function recordAdminChange(
  changeType: "TRANSFERRED" | "MIGRATED" | "RECOVERED",
  event: any,
  context: any,
) {
  const { propId, oldAdmin, newAdmin } = event.args;
  const proposalId = Number(propId);

  await context.db.insert(propdateAdminChanges).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    proposalId,
    changeType,
    oldAdmin,
    newAdmin,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });

  await resolveAndStoreEns(context, newAdmin);

  await context.db
    .insert(propdateAdmins)
    .values({
      proposalId,
      admin: newAdmin,
      isCompleted: false,
      updatedBlock: event.block.number,
      updatedTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      admin: newAdmin,
      updatedBlock: event.block.number,
      updatedTimestamp: event.block.timestamp,
    });
}

ponder.on("Propdates:PropUpdateAdminTransferred", async ({ event, context }) => {
  await recordAdminChange("TRANSFERRED", event, context);
});

ponder.on("Propdates:PropUpdateAdminMigrated", async ({ event, context }) => {
  await recordAdminChange("MIGRATED", event, context);
});

ponder.on("Propdates:PropUpdateAdminRecovered", async ({ event, context }) => {
  await recordAdminChange("RECOVERED", event, context);
});
