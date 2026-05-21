/**
 * ENS-domain indexing helpers.
 *
 * Pure functions used across Registry/BaseRegistrar/Controller/NameWrapper
 * handlers to compute namehashes, decode DNS-encoded names, and upsert
 * ens_domains rows consistently.
 */

import { keccak256, concat, pad, type Hex } from "viem";
import { ensDomains } from "ponder:schema";

/** namehash("eth") — parent node for every .eth 2LD. */
export const ETH_NODE: Hex =
  "0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae";

/** namehash("") — the root. */
export const ROOT_NODE: Hex =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export const ZERO_ADDRESS: Hex = "0x0000000000000000000000000000000000000000";

/** Compute keccak256(parentNode ‖ labelhash). */
export function makeSubnode(parentNode: Hex, labelhashHex: Hex): Hex {
  return keccak256(concat([parentNode, labelhashHex]));
}

/** Convert a uint256 BigInt to its 32-byte hex form (for hash-like ids). */
export function uintToHash(id: bigint): Hex {
  return pad(`0x${id.toString(16)}` as Hex, { size: 32 });
}

/**
 * Decode a DNS-encoded name (length-prefixed labels, null-terminated)
 * back into a human-readable string.
 *
 *   0x076e6f756e7303657468 00  →  "nouns.eth"
 *
 * Returns null if the input is malformed.
 */
export function decodeDnsName(dnsEncoded: Hex): string | null {
  if (!dnsEncoded || dnsEncoded === "0x") return null;
  const hex = dnsEncoded.startsWith("0x") ? dnsEncoded.slice(2) : dnsEncoded;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  const labels: string[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    const len = bytes[offset];
    if (len === undefined) return null;
    if (len === 0) break;
    if (offset + 1 + len > bytes.length) return null;
    const labelBytes = bytes.subarray(offset + 1, offset + 1 + len);
    try {
      labels.push(new TextDecoder("utf-8", { fatal: false }).decode(labelBytes));
    } catch {
      return null;
    }
    offset += 1 + len;
  }
  return labels.join(".");
}

/**
 * Upsert an ens_domains row. Used by every handler — keeps the upsert
 * pattern in one place so we don't drift on default values or timestamps.
 *
 * Existing row fields are preserved unless explicitly overridden by `set`.
 */
export async function upsertEnsDomain(
  context: { db: any },
  node: Hex,
  set: Partial<{
    name: string | null;
    label: string | null;
    labelhash: Hex | null;
    parent: Hex | null;
    owner: Hex | null;
    registrant: Hex | null;
    wrappedOwner: Hex | null;
    resolver: Hex | null;
    ttl: bigint | null;
    expiry: bigint | null;
    isWrapped: boolean;
    fuses: number | null;
  }>,
  blockTimestamp: bigint,
): Promise<void> {
  const updatedAt = blockTimestamp;
  try {
    await context.db
      .insert(ensDomains)
      .values({
        node,
        name: set.name ?? null,
        label: set.label ?? null,
        labelhash: set.labelhash ?? null,
        parent: set.parent ?? null,
        owner: set.owner ?? null,
        registrant: set.registrant ?? null,
        wrappedOwner: set.wrappedOwner ?? null,
        resolver: set.resolver ?? null,
        ttl: set.ttl ?? null,
        expiry: set.expiry ?? null,
        isWrapped: set.isWrapped ?? false,
        fuses: set.fuses ?? null,
        createdAt: blockTimestamp,
        updatedAt,
      })
      .onConflictDoUpdate((existing: any) => ({
        // Only overwrite fields the caller explicitly provided.
        name: set.name !== undefined ? set.name : existing.name,
        label: set.label !== undefined ? set.label : existing.label,
        labelhash: set.labelhash !== undefined ? set.labelhash : existing.labelhash,
        parent: set.parent !== undefined ? set.parent : existing.parent,
        owner: set.owner !== undefined ? set.owner : existing.owner,
        registrant: set.registrant !== undefined ? set.registrant : existing.registrant,
        wrappedOwner:
          set.wrappedOwner !== undefined ? set.wrappedOwner : existing.wrappedOwner,
        resolver: set.resolver !== undefined ? set.resolver : existing.resolver,
        ttl: set.ttl !== undefined ? set.ttl : existing.ttl,
        expiry: set.expiry !== undefined ? set.expiry : existing.expiry,
        isWrapped: set.isWrapped !== undefined ? set.isWrapped : existing.isWrapped,
        fuses: set.fuses !== undefined ? set.fuses : existing.fuses,
        updatedAt,
      }));
  } catch {
    // Don't block indexing on a single bad row.
  }
}
