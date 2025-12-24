/**
 * Noun Cache Hooks
 * Fetch Nouns from our database cache
 */

import { useQuery } from '@tanstack/react-query';

export interface CachedNoun {
  id: number;
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
  svg: string;
  settled_by_address: string;
  settled_by_ens: string | null;
  settled_at: string;
  settled_tx_hash: string;
  winning_bid: string | null;
  winner_address: string | null;
  winner_ens: string | null;
}

export interface NounListItem {
  id: number;
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
  settled_by_address: string;
  settled_by_ens: string | null;
  settled_at: string;
  winning_bid: string | null;
  winner_address: string | null;
  winner_ens: string | null;
}

interface NounListResponse {
  nouns: NounListItem[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Fetch a single Noun from our cache
 */
export function useNoun(id: number | undefined) {
  return useQuery<CachedNoun>({
    queryKey: ['noun', id],
    queryFn: async () => {
      const response = await fetch(`/api/nouns/${id}`);
      if (!response.ok) {
        throw new Error('Noun not found');
      }
      return response.json();
    },
    enabled: id !== undefined,
    staleTime: Infinity, // Nouns don't change once minted
  });
}

/**
 * Fetch a paginated list of Nouns from our cache
 */
export function useNouns(limit = 50, offset = 0) {
  return useQuery<NounListResponse>({
    queryKey: ['nouns', 'list', limit, offset],
    queryFn: async () => {
      const response = await fetch(`/api/nouns?limit=${limit}&offset=${offset}`);
      if (!response.ok) {
        throw new Error('Failed to fetch nouns');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch Nouns settled by a specific address
 */
export function useNounsBySettler(address: string | undefined, limit = 50) {
  return useQuery<NounListResponse>({
    queryKey: ['nouns', 'settler', address, limit],
    queryFn: async () => {
      const response = await fetch(`/api/nouns?settler=${address}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch nouns');
      }
      return response.json();
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch Nouns won by a specific address
 */
export function useNounsByWinner(address: string | undefined, limit = 50) {
  return useQuery<NounListResponse>({
    queryKey: ['nouns', 'winner', address, limit],
    queryFn: async () => {
      const response = await fetch(`/api/nouns?winner=${address}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch nouns');
      }
      return response.json();
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
  });
}

