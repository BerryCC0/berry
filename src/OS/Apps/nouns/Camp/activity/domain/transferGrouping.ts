/**
 * transferGrouping — two-pass clustering for noun_transfer activity items.
 *
 * Pass 1: Multi-noun purchases in a single transaction. Transfers sharing
 *         the same txHash and toAddress get merged into one bulk item.
 *
 * Pass 2: Same from→to pair across multiple transactions within a 1-hour
 *         window. Catches cases like "alice transferred Nouns 1619, 1732,
 *         1762, 1811 to vault.alice" across separate txs.
 *
 * Both passes preserve the exact behavior of the legacy implementation,
 * including the `consumed` Set bookkeeping and the timestamp string
 * comparison in min/max reducers.
 *
 * Source: extracted from `useActivityFeed.ts:420-547` (the second half of
 * processTransfers). The mint/auction filtering that precedes grouping
 * lives separately in `transferFilters.ts`.
 */

import type { ActivityItem } from '../../types';

/** Pass-2 clustering window: 1 hour in seconds. */
const TIME_WINDOW = 3600;

/**
 * Cluster filtered single-transfer items into bulk groups where appropriate.
 *
 * @param items Items already filtered through `isMintOrAuctionTransfer`.
 *              Must be of type `noun_transfer`; the function does not check.
 */
export function groupTransfers(items: ActivityItem[]): ActivityItem[] {
  const txGrouped = groupBySingleTx(items);
  return groupByPairWithinWindow(txGrouped);
}

/**
 * Pass 1: group by (txHash, toAddress). Items without txHash OR toAddress
 * pass through ungrouped.
 */
function groupBySingleTx(items: ActivityItem[]): ActivityItem[] {
  const grouped = new Map<string, ActivityItem[]>();
  const ungrouped: ActivityItem[] = [];

  for (const item of items) {
    if (item.txHash && item.toAddress) {
      const key = `${item.txHash}-${item.toAddress.toLowerCase()}`;
      const group = grouped.get(key);
      if (group) {
        group.push(item);
      } else {
        grouped.set(key, [item]);
      }
    } else {
      ungrouped.push(item);
    }
  }

  const result: ActivityItem[] = [...ungrouped];

  for (const group of grouped.values()) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    // Multi-noun purchase: merge into a single bulk item.
    const buyer = group[0].toAddress!;
    const nounIds = group.map((g) => g.nounId!);
    const fromAddresses = [...new Set(group.map((g) => g.fromAddress!))];
    const earliestTimestamp = group.reduce(
      (min, g) => (g.timestamp < min ? g.timestamp : min),
      group[0].timestamp,
    );

    result.push({
      id: `bulk-transfer-${group[0].txHash}`,
      type: 'noun_transfer',
      timestamp: earliestTimestamp,
      actor: buyer,
      actorEns: group[0].toAddressEns,
      txHash: group[0].txHash,
      toAddress: buyer,
      toAddressEns: group[0].toAddressEns,
      isBulkTransfer: true,
      nounIds,
      fromAddresses,
      fromAddressEns: group[0].fromAddressEns,
      nounId: nounIds[0],
      fromAddress: fromAddresses[0],
    });
  }

  return result;
}

/**
 * Pass 2: same (from, to) pair within a 1-hour window. Walks items in
 * timestamp order, consuming matched siblings into clusters.
 */
function groupByPairWithinWindow(items: ActivityItem[]): ActivityItem[] {
  // Sort ascending so the time-window break-out works.
  const sorted = [...items].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  const result: ActivityItem[] = [];
  const consumed = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (consumed.has(i)) continue;
    const item = sorted[i];

    // Bulk items from pass 1 and items missing addresses pass through.
    if (item.isBulkTransfer || !item.fromAddress || !item.toAddress) {
      result.push(item);
      continue;
    }

    const fromKey = item.fromAddress.toLowerCase();
    const toKey = item.toAddress.toLowerCase();
    const baseTime = Number(item.timestamp);

    const cluster: ActivityItem[] = [item];
    consumed.add(i);

    for (let j = i + 1; j < sorted.length; j++) {
      if (consumed.has(j)) continue;
      const other = sorted[j];
      if (other.isBulkTransfer || !other.fromAddress || !other.toAddress) continue;

      const timeDiff = Math.abs(Number(other.timestamp) - baseTime);
      if (timeDiff > TIME_WINDOW) break; // Sorted — no further matches possible.

      if (
        other.fromAddress.toLowerCase() === fromKey &&
        other.toAddress.toLowerCase() === toKey
      ) {
        cluster.push(other);
        consumed.add(j);
      }
    }

    if (cluster.length === 1) {
      result.push(item);
      continue;
    }

    // Merge: actor = sender, ids = collected nounIds, timestamp = latest.
    const nounIds = cluster.map((c) => c.nounId!).filter(Boolean);
    const latestTimestamp = cluster.reduce(
      (max, c) => (c.timestamp > max ? c.timestamp : max),
      cluster[0].timestamp,
    );

    result.push({
      id: `bulk-pair-${fromKey.slice(0, 8)}-${toKey.slice(0, 8)}-${latestTimestamp}`,
      type: 'noun_transfer',
      timestamp: latestTimestamp,
      actor: item.fromAddress!,
      actorEns: item.actorEns ?? item.fromAddressEns,
      toAddress: item.toAddress!,
      toAddressEns: item.toAddressEns,
      isBulkTransfer: true,
      nounIds,
      nounId: nounIds[0],
      fromAddress: item.fromAddress!,
      fromAddressEns: item.fromAddressEns,
      fromAddresses: [item.fromAddress!],
    });
  }

  return result;
}
