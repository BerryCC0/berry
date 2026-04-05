/**
 * Client Incentives Utility Functions
 */

import type { ClientMetadataMap } from './types';
import { timeAgo as sharedTimeAgo } from '@/shared/format';
import { getClientName } from '@/OS/lib/clientNames';
import { CHART_COLORS } from './constants';

// Re-export shared formatting utilities
export { weiToEth, formatEth, formatDate, shortDate } from '@/shared/format';

/** Sentinel client ID for entries with no client attribution */
export const NO_CLIENT_ID = -1;
const NO_CLIENT_COLOR = '#999';

/** Get chart color for a client — gray for no-client, indexed color otherwise */
export function clientColor(clientId: number): string {
  return clientId === NO_CLIENT_ID ? NO_CLIENT_COLOR : CHART_COLORS[clientId % CHART_COLORS.length];
}

/** Get display name for a client — 'No Client' for sentinel, registry lookup otherwise */
export function clientDisplayName(clientId: number, fallbackName?: string): string {
  if (clientId === NO_CLIENT_ID) return 'No Client';
  return getClientName(clientId) || fallbackName || `Client ${clientId}`;
}

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

/** Get initials from a name string */
export function getInitials(name: string): string {
  if (!name) return '?';
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

/** Format unix timestamp to relative time (e.g. "5m ago") — uses extended range to show "mo ago" up to 30 days */
export function timeAgo(timestamp: string): string {
  return sharedTimeAgo(timestamp, { extendedRange: true });
}
