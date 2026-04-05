/**
 * Shared address formatting utilities.
 *
 * Replaces per-app implementations:
 *   - Camp/utils/formatUtils.ts → formatAddress()
 *   - Auction/utils/auctionHelpers.ts → truncateAddress()
 *   - ~20 inline occurrences of `address.slice(0, 6)...slice(-4)`
 */

/**
 * Truncate an Ethereum address to `0xAbCd…EfGh` format.
 * Returns empty string for falsy input.
 *
 * @param address  The full address (or any hex string)
 * @param chars    Number of characters to show after `0x` prefix and before
 *                 the trailing segment. Defaults to 4 → `0xAbCd…EfGh`.
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}\u2026${address.slice(-chars)}`;
}

/**
 * Display an ENS name if available, otherwise truncate the address.
 */
export function formatAddress(
  address: string,
  ensName?: string | null,
): string {
  return ensName || truncateAddress(address);
}
