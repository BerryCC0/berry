/**
 * Domain-agnostic formatting helpers used by action `describe()` implementations.
 * No business logic — just bigint/address arithmetic and string formatting.
 */

import { formatUnits } from 'viem';

/**
 * Format an on-chain integer (already in raw token units) as a human string.
 * Trims trailing zeros but keeps at least one decimal place for non-integers.
 */
export function formatTokenAmount(rawAmount: bigint, decimals: number): string {
  const formatted = formatUnits(rawAmount, decimals);
  // `formatUnits` returns things like "1.500000000000000000" or "0".
  // Trim trailing zeros, then trailing dot.
  return formatted.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

/**
 * Case-insensitive Ethereum address equality. Both strings are normalised to
 * lowercase before comparison. Returns false for malformed inputs.
 */
export function addressEquals(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

/** The native-ETH sentinel address used in token-select payloads. */
export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

/** True if the given address is the native-ETH sentinel. */
export function isNativeEth(address: string | undefined | null): boolean {
  return addressEquals(address, ETH_ADDRESS);
}
