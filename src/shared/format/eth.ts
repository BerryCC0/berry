/**
 * Shared ETH/wei formatting utilities.
 *
 * Wraps viem where possible and provides consistent display formatting.
 *
 * Replaces per-app implementations:
 *   - Clients/utils.ts → weiToEth(), formatEth()
 *   - OG routes → weiToEth(), fmtEth()
 *   - Probe/NounDetail.tsx → formatBidWei()
 *   - Auction/utils/auctionHelpers.ts → formatBidAmount()
 *
 * For parse/format with arbitrary decimals, use viem's parseEther / parseUnits
 * / formatEther / formatUnits directly — no need to wrap those.
 */

/**
 * Convert a wei value (string or bigint) to a JS number in ETH.
 * Only suitable for display — not for precise arithmetic.
 */
export function weiToEth(wei: string | bigint): number {
  const value = typeof wei === 'string' ? BigInt(wei || '0') : wei;
  return Number(value) / 1e18;
}

/**
 * Format an ETH number to a compact display string with adaptive precision.
 *   >= 1000  → "1.2k"
 *   >= 100   → "123.4"
 *   >= 1     → "1.23"
 *   >= 0.01  → "0.012"
 *   < 0.01   → "0.0012"
 */
export function formatEth(eth: number): string {
  if (eth >= 1000) return `${(eth / 1000).toFixed(1)}k`;
  if (eth >= 100) return eth.toFixed(1);
  if (eth >= 1) return eth.toFixed(2);
  if (eth >= 0.01) return eth.toFixed(3);
  return eth.toFixed(4);
}

/**
 * One-step conversion from wei to display string.
 * Optionally prefix with the Ethereum symbol (Ξ).
 */
export function formatWei(
  wei: string | bigint,
  opts?: { symbol?: boolean; decimals?: number },
): string {
  const eth = weiToEth(wei);
  const formatted =
    opts?.decimals !== undefined ? eth.toFixed(opts.decimals) : formatEth(eth);
  return opts?.symbol ? `\u039E ${formatted}` : formatted;
}
