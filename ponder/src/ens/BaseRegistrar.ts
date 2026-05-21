/**
 * BaseRegistrar handlers — .eth 2LD ERC-721 ownership.
 *
 * The token ID is uint256(labelhash). To compute the namehash for our
 * ens_domains row, we hash the .eth parent node with the labelhash bytes.
 *
 * NameRegistered fires for every .eth registration regardless of which
 * controller version was used — captures the labelhash and expiry.
 * The label string itself comes from ETHRegistrarController.NameRegistered.
 */

import { ponder } from "ponder:registry";
import {
  ETH_NODE,
  makeSubnode,
  uintToHash,
  upsertEnsDomain,
  ZERO_ADDRESS,
} from "../helpers/ensDomain";

ponder.on("ENSBaseRegistrar:NameRegistered", async ({ event, context }) => {
  const { id, owner, expires } = event.args;
  const labelhash = uintToHash(id);
  const node = makeSubnode(ETH_NODE, labelhash);

  await upsertEnsDomain(
    context,
    node,
    {
      parent: ETH_NODE,
      labelhash,
      registrant: owner,
      expiry: expires,
    },
    event.block.timestamp,
  );
});

ponder.on("ENSBaseRegistrar:NameRenewed", async ({ event, context }) => {
  const { id, expires } = event.args;
  const node = makeSubnode(ETH_NODE, uintToHash(id));
  await upsertEnsDomain(context, node, { expiry: expires }, event.block.timestamp);
});

ponder.on("ENSBaseRegistrar:Transfer", async ({ event, context }) => {
  const { from, to, tokenId } = event.args;
  // Skip mint events — those are handled by NameRegistered.
  if (from === ZERO_ADDRESS) return;

  const node = makeSubnode(ETH_NODE, uintToHash(tokenId));
  await upsertEnsDomain(
    context,
    node,
    { registrant: to === ZERO_ADDRESS ? null : to },
    event.block.timestamp,
  );
});
