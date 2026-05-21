/**
 * ETHRegistrarController handlers — public entry point for .eth registration.
 *
 * Critically, this contract emits the registered name as a string, which
 * lets us fill in the human-readable label on the ens_domains row that
 * BaseRegistrar.NameRegistered already created (or co-created).
 *
 * Each registration also gets a row in ens_registrations for history.
 */

import { ponder } from "ponder:registry";
import { ensRegistrations } from "ponder:schema";
import { ETH_NODE, makeSubnode, upsertEnsDomain } from "../helpers/ensDomain";

ponder.on("ENSEthController:NameRegistered", async ({ event, context }) => {
  const { name, label, owner, baseCost, premium, expires } = event.args;
  const node = makeSubnode(ETH_NODE, label);
  const fullName = `${name}.eth`;

  await upsertEnsDomain(
    context,
    node,
    {
      parent: ETH_NODE,
      name: fullName,
      label: name,
      labelhash: label,
      registrant: owner,
      expiry: expires,
    },
    event.block.timestamp,
  );

  try {
    await context.db.insert(ensRegistrations).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      domainNode: node,
      label: name,
      labelhash: label,
      registrant: owner,
      baseCost,
      premium,
      expires,
      registeredAt: event.block.timestamp,
      txHash: event.transaction.hash,
    });
  } catch {
    // Duplicate id — already inserted.
  }
});

ponder.on("ENSEthController:NameRenewed", async ({ event, context }) => {
  const { name, label, expires } = event.args;
  const node = makeSubnode(ETH_NODE, label);
  // Renewal also gives us a chance to back-fill the label if we didn't have it.
  await upsertEnsDomain(
    context,
    node,
    {
      name: `${name}.eth`,
      label: name,
      labelhash: label,
      expiry: expires,
    },
    event.block.timestamp,
  );
});
