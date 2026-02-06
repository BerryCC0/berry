/**
 * useNounDetail Hook
 * Fetches a single Noun from our cache + current owner from Goldsky subgraph
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { CachedNoun } from '@/app/lib/nouns/hooks/useNoun';
import { GOLDSKY_ENDPOINT } from '@/app/lib/nouns/constants';

/**
 * Noun owner query from Goldsky subgraph
 */
const NOUN_OWNER_QUERY = `
  query NounOwner($id: ID!) {
    noun(id: $id) {
      owner {
        id
      }
    }
  }
`;

interface NounOwnerResponse {
  noun: {
    owner: {
      id: string;
    } | null;
  } | null;
}

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
 * Fetch the current owner of a Noun from the Goldsky subgraph
 */
export function useNounOwner(id: number | null) {
  return useQuery<string | null>({
    queryKey: ['probe', 'noun-owner', id],
    queryFn: async () => {
      const response = await fetch(GOLDSKY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: NOUN_OWNER_QUERY,
          variables: { id: String(id) },
        }),
      });

      const json = await response.json();
      if (json.errors) {
        throw new Error(json.errors[0].message);
      }

      return (json.data as NounOwnerResponse)?.noun?.owner?.id || null;
    },
    enabled: id !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes - owners can change
  });
}
