/**
 * useNounDetail Hook
 * Fetches a single Noun from our API + current owner
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { CachedNoun } from '@/app/lib/nouns/hooks/useNoun';

/**
 * Fetch a single Noun with full data from our cache
 */
export function useNounDetail(id: number | null) {
  return useQuery<CachedNoun>({
    queryKey: ['probe', 'noun', id],
    queryFn: async () => {
      const response = await fetch(`/api/nouns/${id}`);
      if (!response.ok) {
        throw new Error('Noun not found');
      }
      return response.json();
    },
    enabled: id !== null,
    staleTime: Infinity, // Nouns don't change once minted
  });
}

/**
 * Fetch the current owner of a Noun from our API
 */
export function useNounOwner(id: number | null) {
  return useQuery<string | null>({
    queryKey: ['probe', 'noun-owner', id],
    queryFn: async () => {
      const response = await fetch(`/api/nouns/${id}`);
      if (!response.ok) return null;

      const data = await response.json();
      return data?.owner || null;
    },
    enabled: id !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes - owners can change
  });
}

/**
 * Resolve an Ethereum address to an ENS name
 */
export function useENSName(address: string | null) {
  return useQuery<string | null>({
    queryKey: ['ens', address?.toLowerCase()],
    queryFn: async () => {
      if (!address) return null;
      try {
        const response = await fetch(
          `https://api.ensideas.com/ens/resolve/${encodeURIComponent(address)}`
        );
        if (!response.ok) return null;
        const data = await response.json();
        return data.name || null;
      } catch {
        return null;
      }
    },
    enabled: !!address && address !== '0x0000000000000000000000000000000000000000',
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}
