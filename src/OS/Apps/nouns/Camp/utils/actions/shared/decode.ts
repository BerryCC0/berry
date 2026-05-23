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
  toFunctionSelector,
  type Hex,
} from 'viem';
import type { ProposalAction } from '../types';

/** Normalise a calldata field to a viem-friendly 0x-prefixed Hex. */
function asHex(calldata: string | undefined): Hex {
  if (!calldata) return '0x';
  return (calldata.startsWith('0x') ? calldata : `0x${calldata}`) as Hex;
}

/**
 * Strip the leading 4-byte function selector from calldata. Used when an
 * action stores its selector inside `calldata` and leaves `signature` empty
 * (a perfectly valid form for Nouns DAO proposals — `delegate-treasury-nouns-
 * to-nouncileth` is a real example).
 */
function stripSelector(calldata: string | undefined): Hex {
  const hex = asHex(calldata);
  // 4-byte selector = 8 hex chars + '0x' prefix = 10-char prefix
  if (hex.length < 10) return '0x';
  return ('0x' + hex.slice(10)) as Hex;
}

/**
 * Decode the args portion of an action against an ABI parameter signature.
 *
 * Accepts either a raw calldata hex string OR a `ProposalAction`. When given
 * an action, it transparently handles the two on-chain forms Nouns proposals
 * can use:
 *
 *   1. `signature: 'foo(address)'`, `calldata: <abi-encoded args>`
 *      → calldata is args-only; selector is computed from signature at exec.
 *
 *   2. `signature: ''`, `calldata: 0x{selector}{abi-encoded args}`
 *      → calldata already contains the selector; the executor uses it as-is.
 *
 * Many clients (Tally, Nouns.wtf, Etherscan-pasted actions) use form #2.
 * Pre-fix, every action def's decode() assumed form #1, so any candidate /
 * proposal built in those clients rendered as "Unknown - Call to <target>".
 *
 * Returns null on any failure (empty calldata, malformed bytes, shape
 * mismatch).
 */
export function decodeArgs<T extends readonly unknown[]>(
  source: string | ProposalAction | undefined,
  signature: string,
): T | null {
  const calldata = isAction(source)
    ? source.signature
      ? source.calldata
      : stripSelector(source.calldata)
    : source;
  if (!calldata || calldata === '0x') return null;
  try {
    return decodeAbiParameters(parseAbiParameters(signature), asHex(calldata)) as unknown as T;
  } catch {
    return null;
  }
}

function isAction(value: unknown): value is ProposalAction {
  return (
    typeof value === 'object' &&
    value !== null &&
    'target' in value &&
    'calldata' in value
  );
}

/**
 * Sugar for the very common "decode this single action against this ABI" path.
 * Lets matchers write `if (!matchSignature(action, 'transfer(address,uint256)')) return null;`
 * and then `const args = decodeArgs(action.calldata, 'address, uint256');`.
 *
 * Comparison is by **4-byte function selector**, not exact string equality.
 * Different clients write proposal signatures in different forms — all of
 * these encode to the same selector and should match the same decoder:
 *
 *   • `delegate(address)`              (canonical, what we use internally)
 *   • `delegate(address delegatee)`    (with parameter name — common in
 *                                       Nouns.wtf candidates, Tally drafts)
 *   • `delegate( address )`            (extra whitespace)
 *
 * Without normalisation, an action created in another client would render
 * as "Unknown" in our breakdown even though it's a perfectly recognisable
 * delegate / transfer / approve call. We canonicalise via viem's
 * `toFunctionSelector` (which strips param names and whitespace internally)
 * and compare the two 4-byte selectors.
 *
 * Empty `action.signature` is supported too: the selector lives in the
 * first 4 bytes of `calldata` in that form, so we compare against that.
 * Use `decodeArgs(action, ...)` (not `decodeArgs(action.calldata, ...)`)
 * downstream so the selector gets stripped correctly before ABI decoding.
 */
export function matchSignature(
  action: ProposalAction,
  expected: string,
): boolean {
  if (action.signature) {
    if (action.signature === expected) return true;
    try {
      return (
        toFunctionSelector(action.signature) === toFunctionSelector(expected)
      );
    } catch {
      return false;
    }
  }
  // Empty signature → selector is at the start of calldata.
  if (!action.calldata || action.calldata.length < 10) return false;
  try {
    const got = asHex(action.calldata).slice(0, 10).toLowerCase();
    const want = toFunctionSelector(expected).toLowerCase();
    return got === want;
  } catch {
    return false;
  }
}

/**
 * Sugar for matching a target address by lowercase equality. Action targets
 * arrive with inconsistent casing from various sources (Etherscan, Tenderly,
 * the proposal contract itself) — always compare lowercased.
 */
export function matchTarget(action: ProposalAction, expected: string): boolean {
  return action.target.toLowerCase() === expected.toLowerCase();
}
