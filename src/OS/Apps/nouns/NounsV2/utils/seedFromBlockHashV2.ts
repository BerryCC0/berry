/**
 * Generate a V2 noun seed from a block hash, replicating the on-chain
 * NounV2SlobberSeeder at 0xd777E701506A86fE89f07f963aA6c08d6905cFF8.
 *
 * Base algorithm is identical to V1:
 *   1. pseudorandomness = keccak256(abi.encodePacked(blockHash, nounId))
 *   2. Each trait = (pseudorandomness >> shift, masked to uint48) % traitCount
 *
 * V2 adds the slobber override on top: if the base seed is slobber-eligible
 * (head ∈ {retainer, index-card} AND accessory == grease), a 50/50 keccak
 * coin flip decides whether to override accessory to slobber (143).
 *
 * The exact bit/preimage of the coin flip is not publicly documented; we use
 * the lowest bit of keccak256(blockHash, nounId, "slobber"). Best-effort —
 * the slobber case probability is ~1/36,179 so any disagreement is rare and
 * only affects the slobber edge case.
 */

import { keccak256, encodePacked, toHex } from 'viem';
import {
  SLOBBER_RULE,
  isSlobberEligible,
  type V2Seed,
} from './slobber';
import type { V2TraitCounts } from '../hooks/useV2TraitCounts';

const UINT48_MAX = (BigInt(1) << BigInt(48)) - BigInt(1);

function getPseudorandomPart(
  pseudorandomness: bigint,
  partCount: number,
  shiftAmount: number,
): number {
  const uint48 = (pseudorandomness >> BigInt(shiftAmount)) & UINT48_MAX;
  return Number(uint48 % BigInt(partCount));
}

function slobberRoll(blockHash: `0x${string}`, nounId: number | bigint): boolean {
  const tag = toHex('slobber');
  const h = keccak256(
    encodePacked(['bytes32', 'uint256', 'bytes'], [blockHash, BigInt(nounId), tag]),
  );
  return (BigInt(h) & BigInt(1)) === BigInt(1);
}

export function getV2NounSeedFromBlockHash(
  nounId: number | bigint,
  blockHash: `0x${string}`,
  counts: V2TraitCounts,
): V2Seed {
  const pseudorandomness = BigInt(
    keccak256(encodePacked(['bytes32', 'uint256'], [blockHash, BigInt(nounId)])),
  );

  const base: V2Seed = {
    background: getPseudorandomPart(pseudorandomness, counts.backgrounds, 0),
    body: getPseudorandomPart(pseudorandomness, counts.bodies, 48),
    accessory: getPseudorandomPart(pseudorandomness, counts.accessories, 96),
    head: getPseudorandomPart(pseudorandomness, counts.heads, 144),
    glasses: getPseudorandomPart(pseudorandomness, counts.glasses, 192),
  };

  if (isSlobberEligible(base) && slobberRoll(blockHash, nounId)) {
    return { ...base, accessory: SLOBBER_RULE.SLOBBER_INDEX };
  }
  return base;
}
