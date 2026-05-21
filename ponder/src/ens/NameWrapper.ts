/**
 * NameWrapper handlers — wrapped names (ERC-1155).
 *
 * Wrapped names are the modern default for new ENS registrations and
 * for subname management. Most importantly, NameWrapped emits the
 * DNS-encoded name bytes — by decoding them we recover labels for
 * names we'd otherwise only know by namehash.
 *
 * Token ID is uint256(namehash). For TransferSingle / TransferBatch,
 * we use uintToHash() to recover the namehash bytes32.
 */

import { ponder } from "ponder:registry";
import {
  decodeDnsName,
  uintToHash,
  upsertEnsDomain,
  ZERO_ADDRESS,
} from "../helpers/ensDomain";

ponder.on("ENSNameWrapper:NameWrapped", async ({ event, context }) => {
  const { node, name: nameBytes, owner, fuses, expiry } = event.args;
  const decoded = decodeDnsName(nameBytes);

  // Extract label = last component of the name (e.g. "vitalik" for "vitalik.eth")
  const label = decoded ? decoded.split(".")[0] : null;

  await upsertEnsDomain(
    context,
    node,
    {
      name: decoded ?? undefined,
      label: label ?? undefined,
      wrappedOwner: owner,
      isWrapped: true,
      fuses: Number(fuses),
      expiry,
    },
    event.block.timestamp,
  );
});

ponder.on("ENSNameWrapper:NameUnwrapped", async ({ event, context }) => {
  const { node, owner } = event.args;
  await upsertEnsDomain(
    context,
    node,
    {
      isWrapped: false,
      wrappedOwner: null,
      owner: owner === ZERO_ADDRESS ? null : owner,
    },
    event.block.timestamp,
  );
});

ponder.on("ENSNameWrapper:FusesSet", async ({ event, context }) => {
  const { node, fuses } = event.args;
  await upsertEnsDomain(
    context,
    node,
    { fuses: Number(fuses) },
    event.block.timestamp,
  );
});

ponder.on("ENSNameWrapper:ExpiryExtended", async ({ event, context }) => {
  const { node, expiry } = event.args;
  await upsertEnsDomain(context, node, { expiry }, event.block.timestamp);
});

ponder.on("ENSNameWrapper:TransferSingle", async ({ event, context }) => {
  const { from, to, id } = event.args;
  // Skip mint — handled by NameWrapped.
  if (from === ZERO_ADDRESS) return;

  const node = uintToHash(id);
  await upsertEnsDomain(
    context,
    node,
    { wrappedOwner: to === ZERO_ADDRESS ? null : to },
    event.block.timestamp,
  );
});

ponder.on("ENSNameWrapper:TransferBatch", async ({ event, context }) => {
  const { from, to, ids } = event.args;
  if (from === ZERO_ADDRESS) return;

  const wrappedOwner = to === ZERO_ADDRESS ? null : to;
  for (const id of ids) {
    const node = uintToHash(id);
    await upsertEnsDomain(context, node, { wrappedOwner }, event.block.timestamp);
  }
});
