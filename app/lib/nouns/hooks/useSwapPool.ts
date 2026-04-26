/**
 * Swap Pool Hook
 * Lists Noun NFTs currently held by the $nouns swap contract.
 * These are the Nouns available to redeem (with $nouns) or trade for (NFT-for-NFT).
 *
 * Backed by /api/nouns?owner=<tokenSwap>, which queries ponder_live.nouns —
 * already kept current by the existing Transfer indexer.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { NOUNS_ADDRESSES } from '../contracts';

export interface SwapPoolNoun {
  id: string;
  seed: {
    background: number;
    body: number;
    accessory: number;
    head: number;
    glasses: number;
  };
  /** Inline SVG when present in the indexer cache. */
  svg?: string;
}

interface SwapPoolData {
  nouns: SwapPoolNoun[];
  total: number;
}

const SWAP_ADDRESS_LOWER = NOUNS_ADDRESSES.tokenSwap.toLowerCase();

async function fetchSwapPool(limit: number, offset: number): Promise<SwapPoolData> {
  const params = new URLSearchParams({
    owner: SWAP_ADDRESS_LOWER,
    limit: String(limit),
    offset: String(offset),
    sort: 'oldest',
  });
  const response = await fetch(`/api/nouns?${params}`);
  if (!response.ok) throw new Error('Failed to fetch swap pool');

  const json = await response.json();
  const nouns: SwapPoolNoun[] = (json.nouns || []).map((n: {
    id: number | string;
    background: number;
    body: number;
    accessory: number;
    head: number;
    glasses: number;
    svg?: string;
  }) => ({
    id: String(n.id),
    seed: {
      background: n.background,
      body: n.body,
      accessory: n.accessory,
      head: n.head,
      glasses: n.glasses,
    },
    svg: n.svg,
  }));

  return { nouns, total: json.total ?? nouns.length };
}

/**
 * Fetch the Nouns currently held by the $nouns swap contract.
 * Polled every 30s — pool changes are infrequent.
 */
export function useSwapPool(limit = 100, offset = 0) {
  return useQuery<SwapPoolData>({
    queryKey: ['swap-pool', limit, offset],
    queryFn: () => fetchSwapPool(limit, offset),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
