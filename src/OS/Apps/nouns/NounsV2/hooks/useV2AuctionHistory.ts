/**
 * V2 auction history hooks — indexer-backed, for browsing settled/past auctions.
 *
 * - useV2AuctionDetail: full detail (auction + noun traits + bids) for one noun.
 * - useV2RecentAuctions: the most-recent settled auctions, for the history grid.
 *
 * The *live* auction's real-time state still comes from the contract via
 * useV2CurrentAuction; these read from ponder_live.* through the API routes.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

export interface V2AuctionRow {
  nounId: string;
  startTime: string;
  endTime: string;
  winner: string | null;
  amount: string | null;
  settled: boolean;
  settlerAddress: string | null;
  settledTimestamp: string | null;
}

export interface V2NounRow {
  id: string;
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
  owner: string | null;
  isSlobber: boolean;
  burned: boolean;
}

export interface V2BidRow {
  id: string;
  bidder: string;
  amount: string;
  extended: boolean;
  blockTimestamp: string;
  txHash: string;
}

export interface V2AuctionDetail {
  auction: V2AuctionRow | null;
  noun: V2NounRow | null;
  bids: V2BidRow[];
}

/**
 * Full detail for a single V2 noun's auction. `pollInterval` keeps the live
 * auction's bid list fresh; pass 0 (default) for historical nouns.
 */
export function useV2AuctionDetail(
  nounId: number | string | null | undefined,
  pollInterval = 0
) {
  const id = nounId != null ? String(nounId) : null;

  return useQuery<V2AuctionDetail, Error>({
    queryKey: ['nounsV2', 'auctionDetail', id],
    queryFn: async () => {
      const res = await fetch(`/api/nouns-v2/auctions/${id}`);
      if (!res.ok) throw new Error('Failed to load V2 auction');
      return (await res.json()) as V2AuctionDetail;
    },
    enabled: id != null,
    staleTime: pollInterval > 0 ? 2_000 : 60_000,
    refetchInterval: pollInterval > 0 ? pollInterval : false,
  });
}

/** Most-recent settled V2 auctions (winner + winning bid), newest first. */
export function useV2RecentAuctions(limit = 12) {
  return useQuery<{ auctions: V2AuctionRow[] }, Error>({
    queryKey: ['nounsV2', 'recentAuctions', limit],
    queryFn: async () => {
      const res = await fetch(`/api/nouns-v2/auctions?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to load V2 auctions');
      return (await res.json()) as { auctions: V2AuctionRow[] };
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
