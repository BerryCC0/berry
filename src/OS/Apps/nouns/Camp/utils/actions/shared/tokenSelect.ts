/**
 * The token-select form field stores its value as a JSON-stringified payload
 * — the legacy templates layer encodes a {symbol, address, decimals, isNative}
 * blob into `fieldValues.token` and parses it back at encode time. This module
 * centralises that round-trip so action `encode()` implementations don't all
 * duplicate the same `JSON.parse` + shape-check.
 */

import type { Address } from 'viem';
import { ETH_ADDRESS } from './format';

/** Structured form of a token-select field value. */
export interface TokenSelectValue {
  symbol: string;
  address: Address;
  decimals: number;
  isNative: boolean;
}

/**
 * Parse the JSON-stringified token-select payload. Tolerates the legacy
 * shapes the existing fields produce: a bare 0x address (resolved against
 * `knownTokens`), or a stringified `TokenSelectValue`. Returns null on
 * unrecoverable input.
 *
 * `knownTokens` is the list to consult when only an address is provided —
 * pass the consolidated registry's token table here so the action layer
 * doesn't reach into the legacy `COMMON_TOKENS` list directly.
 */
export function parseTokenSelectValue(
  raw: string | undefined,
  knownTokens?: ReadonlyArray<{
    symbol: string;
    address: Address;
    decimals: number;
  }>,
): TokenSelectValue | null {
  if (!raw) return null;

  // Bare 0x address — resolve against the known list, default to 18 decimals
  // if not found (matches legacy `resolveTokenField` behaviour).
  if (raw.startsWith('0x') && raw.length === 42) {
    const match = knownTokens?.find(
      (t) => t.address.toLowerCase() === raw.toLowerCase(),
    );
    return {
      symbol: match?.symbol ?? raw,
      address: raw as Address,
      decimals: match?.decimals ?? 18,
      isNative: false,
    };
  }

  // Stringified payload from the token-select editor
  try {
    const parsed = JSON.parse(raw) as Partial<TokenSelectValue>;
    if (typeof parsed.address !== 'string') return null;
    return {
      symbol: typeof parsed.symbol === 'string' ? parsed.symbol : parsed.address,
      address: parsed.address as Address,
      decimals: typeof parsed.decimals === 'number' ? parsed.decimals : 18,
      isNative:
        parsed.isNative === true ||
        parsed.address.toLowerCase() === ETH_ADDRESS,
    };
  } catch {
    return null;
  }
}

/**
 * Stringify a token-select value back to its on-disk form. The inverse of
 * `parseTokenSelectValue` — used by `decode()` implementations when they need
 * to round-trip an on-chain action back into editable form state.
 */
export function stringifyTokenSelectValue(value: TokenSelectValue): string {
  return JSON.stringify(value);
}
