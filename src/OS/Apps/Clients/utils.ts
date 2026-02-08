/**
 * Client Incentives Utility Functions
 */

import type { ClientMetadataMap } from './types';

/**
 * Resolve the best image for a client: favicon first, NFT image fallback.
 */
export function getClientImage(
  clientId: number | undefined,
  clientMetadata: ClientMetadataMap | undefined,
  clients: Array<{ clientId: number; nftImage?: string | null }> | undefined,
): string | undefined {
  if (clientId == null) return undefined;
  const favicon = clientMetadata?.get(clientId)?.favicon;
  if (favicon) return favicon;
  const client = clients?.find((c) => c.clientId === clientId);
  return client?.nftImage ?? undefined;
}

/** Format wei (as string) to ETH number */
export function weiToEth(wei: string): number {
  return Number(BigInt(wei)) / 1e18;
}

/** Format ETH number to compact display string */
export function formatEth(eth: number): string {
  if (eth >= 1000) return `${(eth / 1000).toFixed(1)}k`;
  if (eth >= 100) return eth.toFixed(1);
  if (eth >= 1) return eth.toFixed(2);
  if (eth >= 0.01) return eth.toFixed(3);
  return eth.toFixed(4);
}

/** Get initials from a name string */
export function getInitials(name: string): string {
  if (!name) return '?';
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

/** Format unix timestamp to relative time (e.g. "5m ago") */
export function timeAgo(timestamp: string): string {
  const seconds = Math.floor(Date.now() / 1000 - Number(timestamp));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}

/** Format unix timestamp to date string (e.g. "Jan 15, 2025") */
export function formatDate(timestamp: string): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/** Short date for chart axis (e.g. "1/15") */
export function shortDate(timestamp: string): string {
  const d = new Date(Number(timestamp) * 1000);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
