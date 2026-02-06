/**
 * useAuctionData Hook
 * Fetches auction data from Goldsky subgraph
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { GOLDSKY_ENDPOINT } from '@/app/lib/nouns/constants';

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

// GraphQL Queries
const CURRENT_AUCTION_QUERY = `
  query CurrentAuction {
    auctions(
      first: 1
      orderBy: startTime
      orderDirection: desc
    ) {
      id
      amount
      startTime
      endTime
      settled
      noun {
        id
        seed {
          id
          background
          body
          accessory
          head
          glasses
        }
        owner {
          id
        }
      }
      bids(orderBy: amount, orderDirection: desc) {
        id
        amount
        blockTimestamp
        txHash
        clientId
        bidder {
          id
        }
      }
    }
  }
`;

const AUCTION_BY_ID_QUERY = `
  query AuctionById($id: ID!) {
    auction(id: $id) {
      id
      amount
      startTime
      endTime
      settled
      noun {
        id
        seed {
          id
          background
          body
          accessory
          head
          glasses
        }
        owner {
          id
        }
      }
      bids(orderBy: amount, orderDirection: desc) {
        id
        amount
        blockTimestamp
        txHash
        clientId
        bidder {
          id
        }
      }
    }
  }
`;

const NOUN_BY_ID_QUERY = `
  query NounById($id: ID!) {
    noun(id: $id) {
      id
      seed {
        id
        background
        body
        accessory
        head
        glasses
      }
      owner {
        id
      }
    }
  }
`;

async function fetchGoldsky<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  const json = await response.json();

  if (json.errors) {
    throw new Error(json.errors[0].message);
  }

  if (!json.data) {
    throw new Error('No data returned from Goldsky');
  }

  return json.data as T;
}

/**
 * Fetch current auction with polling
 */
export function useCurrentAuction(pollInterval: number = 5000) {
  return useQuery<{ auctions: Auction[] }, Error>({
    queryKey: ['nouns', 'currentAuction'],
    queryFn: () => fetchGoldsky<{ auctions: Auction[] }>(CURRENT_AUCTION_QUERY),
    refetchInterval: pollInterval,
    staleTime: 2000,
  });
}

/**
 * Fetch auction by ID
 */
export function useAuctionById(auctionId: string | null) {
  return useQuery<{ auction: Auction | null }, Error>({
    queryKey: ['nouns', 'auction', auctionId],
    queryFn: () => fetchGoldsky<{ auction: Auction | null }>(AUCTION_BY_ID_QUERY, { id: auctionId }),
    enabled: !!auctionId,
    staleTime: 60000, // Historical auctions are stable
  });
}

/**
 * Fetch noun by ID (for Nounder nouns without auctions)
 */
export function useNounById(nounId: string | null) {
  return useQuery<{ noun: Noun | null }, Error>({
    queryKey: ['nouns', 'noun', nounId],
    queryFn: () => fetchGoldsky<{ noun: Noun | null }>(NOUN_BY_ID_QUERY, { id: nounId }),
    enabled: !!nounId,
    staleTime: Infinity, // Noun data is immutable
  });
}

