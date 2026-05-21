/**
 * ENSRegistry handlers — the master record for every ENS name.
 *
 * Events:
 *   NewOwner    — a subname's owner was set (creation or replacement)
 *   Transfer    — an existing name's owner changed
 *   NewResolver — resolver address pointer was updated
 *   NewTTL      — TTL changed (rare; included for completeness)
 *
 * NewOwner provides labelhash but not the string label. We record the
 * labelhash here; the human-readable label is filled in later by
 * ETHRegistrarController.NameRegistered or NameWrapper.NameWrapped.
 */

import { ponder } from "ponder:registry";
import {
  ETH_NODE,
  makeSubnode,
  upsertEnsDomain,
  ZERO_ADDRESS,
} from "../helpers/ensDomain";

ponder.on("ENSRegistry:NewOwner", async ({ event, context }) => {
  const { node: parent, label, owner } = event.args;
  const subnode = makeSubnode(parent, label);

  await upsertEnsDomain(
    context,
    subnode,
    {
      parent,
      labelhash: label,
      owner,
    },
    event.block.timestamp,
  );

  // Ensure the parent row exists too — Registry events for new subnames
  // sometimes precede any direct touch on the parent.
  if (parent !== ETH_NODE) {
    await upsertEnsDomain(context, parent, {}, event.block.timestamp);
  }
});

ponder.on("ENSRegistry:Transfer", async ({ event, context }) => {
  const { node, owner } = event.args;
  await upsertEnsDomain(
    context,
    node,
    { owner: owner === ZERO_ADDRESS ? null : owner },
    event.block.timestamp,
  );
});

ponder.on("ENSRegistry:NewResolver", async ({ event, context }) => {
  const { node, resolver } = event.args;
  await upsertEnsDomain(
    context,
    node,
    { resolver: resolver === ZERO_ADDRESS ? null : resolver },
    event.block.timestamp,
  );
});

ponder.on("ENSRegistry:NewTTL", async ({ event, context }) => {
  const { node, ttl } = event.args;
  await upsertEnsDomain(context, node, { ttl }, event.block.timestamp);
});
