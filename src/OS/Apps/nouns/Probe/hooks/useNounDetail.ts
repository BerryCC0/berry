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

