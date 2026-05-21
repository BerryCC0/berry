/**
 * Re-exports of ENSIP-1 namehash and ENSIP-15 normalize from ensjs.
 *
 * Always normalize a name before hashing. ENSIP-15 normalization handles
 * unicode confusables, emoji, and case folding — rolling our own would
 * silently produce wrong namehashes for non-ASCII names.
 */

import { keccak256, stringToBytes } from 'viem';

export { namehash, normalise as normalize } from '@ensdomains/ensjs/utils';

/** keccak256(label) — used as the ERC-721 tokenId for `.eth` second-level names. */
export function labelhash(label: string): `0x${string}` {
  return keccak256(stringToBytes(label));
}

/** Convert a .eth name's label to its BaseRegistrar tokenId (uint256). */
export function ethLabelToTokenId(label: string): bigint {
  return BigInt(labelhash(label));
}

export function isValidEnsName(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  if (!input.includes('.')) return false;
  return input.split('.').every((label) => label.length > 0);
}
