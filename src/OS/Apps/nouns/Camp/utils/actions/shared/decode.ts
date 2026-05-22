/**
 * Thin wrappers around viem's `decodeAbiParameters` / `parseAbiParameters` for
 * the common shapes action `decode()` matchers need. Centralised so:
 *   1. Action modules don't all import viem directly.
 *   2. Malformed calldata fails cleanly (returns null) instead of throwing.
 *   3. Replaces the legacy hand-rolled `decodeCalldata` in parser.ts:1377-1411
 *      which only handled address/uint and skipped real ABI semantics.
 */

import {
  decodeAbiParameters,
  parseAbiParameters,
  type Hex,
} from 'viem';
import type { ProposalAction } from '../types';

/** Normalise a calldata field to a viem-friendly 0x-prefixed Hex. */
function asHex(calldata: string | undefined): Hex {
  if (!calldata) return '0x';
  return (calldata.startsWith('0x') ? calldata : `0x${calldata}`) as Hex;
}

/**
 * Decode action calldata against an ABI parameter signature. Returns null on
 * any failure — empty calldata, malformed bytes, or shape mismatch.
 *
 * Example: `decodeArgs(action.calldata, 'address, uint256')` returns
 * `[Address, bigint] | null`.
 */
export function decodeArgs<T extends readonly unknown[]>(
  calldata: string | undefined,
  signature: string,
): T | null {
  if (!calldata || calldata === '0x') return null;
  try {
    return decodeAbiParameters(parseAbiParameters(signature), asHex(calldata)) as unknown as T;
  } catch {
    return null;
  }
}

/**
 * Sugar for the very common "decode this single action against this ABI" path.
 * Lets matchers write `if (!matchSignature(action, 'transfer(address,uint256)')) return null;`
 * and then `const args = decodeArgs(action.calldata, 'address, uint256');`.
 */
export function matchSignature(
  action: ProposalAction,
  expected: string,
): boolean {
  return action.signature === expected;
}

/**
 * Sugar for matching a target address by lowercase equality. Action targets
 * arrive with inconsistent casing from various sources (Etherscan, Tenderly,
 * the proposal contract itself) — always compare lowercased.
 */
export function matchTarget(action: ProposalAction, expected: string): boolean {
  return action.target.toLowerCase() === expected.toLowerCase();
}
