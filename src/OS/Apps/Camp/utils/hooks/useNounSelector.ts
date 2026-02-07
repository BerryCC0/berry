/**
 * useNounSelector Hook
 * Fetches Nouns owned by an address with seed data for image rendering
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { getNounDataUrl, type NounSeed } from '@/app/lib/nouns/render';

export interface NounWithSVG {
  id: string;
  seed: NounSeed;
  svgDataUrl: string | null;
}

async function fetchNounsByOwner(ownerAddress: string): Promise<NounWithSVG[]> {
  const params = new URLSearchParams({
    owner: ownerAddress.toLowerCase(),
    limit: '100',
    sort: 'oldest',
  });

  const response = await fetch(`/api/nouns?${params}`);
  if (!response.ok) throw new Error('Failed to fetch nouns');

  const json = await response.json();
  const nouns = (json.nouns || []).map((noun: any) => {
    const seed: NounSeed = {
      background: Number(noun.background),
      body: Number(noun.body),
      accessory: Number(noun.accessory),
      head: Number(noun.head),
      glasses: Number(noun.glasses),
    };

    return {
      id: String(noun.id),
      seed,
      svgDataUrl: getNounDataUrl(seed),
    };
  });

  // Sort numerically by ID
  return nouns.sort((a: NounWithSVG, b: NounWithSVG) => Number(a.id) - Number(b.id));
}

/**
 * Hook to fetch Nouns owned by an address
 * @param ownerAddress - The wallet address to fetch Nouns for
 * @returns Object containing nouns array, loading state, and error
 */
export function useNounSelector(ownerAddress: string | undefined) {
  const query = useQuery({
    queryKey: ['nouns-by-owner', ownerAddress],
    queryFn: () => fetchNounsByOwner(ownerAddress!),
    enabled: !!ownerAddress,
    staleTime: 30_000,
  });

  return {
    nouns: query.data || [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
