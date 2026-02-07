/**
 * useAuctionData Hook
 * Fetches auction data from Ponder API
 */

'use client';

import { useQuery } from '@tanstack/react-query';

// Types
export interface Bid {
  id: string;
  amount: string;
  blockTimestamp: string;
  txHash: string;
  clientId: number | null;
  bidder: {
    id: string;
  };
}

export interface NounSeed {
  id: string;
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
}

export interface NounOwner {
  id: string;
}

export interface Noun {
  id: string;
  seed: NounSeed;
  owner: NounOwner | null;
}

export interface Auction {
  id: string;
  amount: string;
  startTime: string;
  endTime: string;
  settled: boolean;
  noun: Noun;
  bids: Bid[];
}

// ============================================================================
// API RESPONSE MAPPING
// ============================================================================

function mapAuctionResponse(json: any): Auction | null {
  const a = json.auction;
  const n = json.noun;
  const bids = json.bids || [];

  if (!a) return null;

  return {
    id: String(a.noun_id),
    amount: String(a.amount || '0'),
    startTime: String(a.start_time),
    endTime: String(a.end_time),
    settled: a.settled || false,
    noun: n ? {
      id: String(n.id),
      seed: {
        id: String(n.id),
        background: n.background,
        body: n.body,
        accessory: n.accessory,
        head: n.head,
        glasses: n.glasses,
      },
      owner: n.owner ? { id: n.owner } : null,
    } : {
      id: String(a.noun_id),
      seed: { id: String(a.noun_id), background: 0, body: 0, accessory: 0, head: 0, glasses: 0 },
      owner: null,
    },
    bids: bids.map((b: any) => ({
      id: b.id,
      amount: String(b.amount),
      blockTimestamp: String(b.block_timestamp),
      txHash: b.tx_hash || '',
      clientId: b.client_id ?? null,
      bidder: { id: b.bidder },
    })),
  };
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch current auction with polling
 */
export function useCurrentAuction(pollInterval: number = 5000) {
  return useQuery<{ auctions: Auction[] }, Error>({
    queryKey: ['nouns', 'currentAuction'],
    queryFn: async () => {
      const response = await fetch('/api/auction');
      if (!response.ok) throw new Error('Failed to fetch current auction');

      const json = await response.json();
      const auction = mapAuctionResponse(json);
      return { auctions: auction ? [auction] : [] };
    },
    refetchInterval: pollInterval,
    staleTime: 2000,
  });
}

/**
 * Fetch auction by ID (noun ID)
 */
export function useAuctionById(auctionId: string | null) {
  return useQuery<{ auction: Auction | null }, Error>({
    queryKey: ['nouns', 'auction', auctionId],
    queryFn: async () => {
      const response = await fetch(`/api/auction?id=${auctionId}`);
      if (!response.ok) throw new Error('Auction not found');

      const json = await response.json();
      return { auction: mapAuctionResponse(json) };
    },
    enabled: !!auctionId,
    staleTime: 60000,
  });
}

/**
 * Fetch noun by ID (for Nounder nouns without auctions)
 */
export function useNounById(nounId: string | null) {
  return useQuery<{ noun: Noun | null }, Error>({
    queryKey: ['nouns', 'noun', nounId],
    queryFn: async () => {
      const response = await fetch(`/api/nouns/${nounId}`);
      if (!response.ok) return { noun: null };

      const n = await response.json();
      return {
        noun: n ? {
          id: String(n.id),
          seed: {
            id: String(n.id),
            background: n.background,
            body: n.body,
            accessory: n.accessory,
            head: n.head,
            glasses: n.glasses,
          },
          owner: n.owner ? { id: n.owner } : null,
        } : null,
      };
    },
    enabled: !!nounId,
    staleTime: Infinity,
  });
}
