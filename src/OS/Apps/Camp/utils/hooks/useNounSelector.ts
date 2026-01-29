/**
 * useNounSelector Hook
 * Fetches Nouns owned by an address with seed data for image rendering
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { GOLDSKY_ENDPOINT } from '@/app/lib/nouns/constants';
import { getNounDataUrl, type NounSeed } from '@/app/lib/nouns/render';

export interface NounWithSVG {
  id: string;
  seed: NounSeed;
  svgDataUrl: string | null;
}

const NOUNS_BY_OWNER_QUERY = `
  query NounsByOwner($owner: ID!) {
    account(id: $owner) {
      id
      nouns {
        id
        seed {
          background
          body
          accessory
          head
          glasses
        }
      }
    }
  }
`;

interface NounData {
  id: string;
  seed: {
    background: string;
    body: string;
    accessory: string;
    head: string;
    glasses: string;
  };
}

interface QueryResult {
  account: {
    id: string;
    nouns: NounData[];
  } | null;
}

async function fetchNounsByOwner(ownerAddress: string): Promise<NounWithSVG[]> {
  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: NOUNS_BY_OWNER_QUERY,
      variables: { owner: ownerAddress.toLowerCase() },
    }),
  });

  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);

  const account = json.data?.account as QueryResult['account'];
  if (!account || !account.nouns) {
    return [];
  }

  // Convert to NounWithSVG format with data URLs for rendering
  return account.nouns.map((noun) => {
    const seed: NounSeed = {
      background: Number(noun.seed.background),
      body: Number(noun.seed.body),
      accessory: Number(noun.seed.accessory),
      head: Number(noun.seed.head),
      glasses: Number(noun.seed.glasses),
    };

    return {
      id: noun.id,
      seed,
      svgDataUrl: getNounDataUrl(seed),
    };
  });
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
    staleTime: 30_000, // Cache for 30 seconds
  });

  return {
    nouns: query.data || [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
