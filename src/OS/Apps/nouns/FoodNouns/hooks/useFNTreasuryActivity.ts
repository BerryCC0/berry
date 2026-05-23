/**
 * Treasury overview from indexed data — totals, 30-day window, pending queue,
 * unified activity feed (inflows + executed/cancelled outflows), and any Nouns
 * owned by the treasury. Backed by /api/food-nouns/treasury.
 *
 * The live ETH balance still comes from useFNTreasuryBalance (wagmi) — this
 * hook is for everything derived from the Ponder indexer.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
// Type-only imports keep the client bundle from pulling in the server route
// file or the `server-only`-flagged decoder. Both are guaranteed to be erased
// at emit time because nothing here references them at runtime.
import type {
  FNTreasuryResponse,
  FNTreasuryFeedItem,
  FNTreasuryPendingItem,
} from '@/app/api/food-nouns/treasury/route';
import type {
  DecodedTreasuryTx,
  DecodedInput,
} from '@/app/lib/food-nouns/decodeTreasuryTx';

export type {
  FNTreasuryResponse,
  FNTreasuryFeedItem,
  FNTreasuryPendingItem,
  DecodedTreasuryTx,
  DecodedInput,
};

export function useFNTreasuryActivity() {
  return useQuery<FNTreasuryResponse>({
    queryKey: ['fn', 'treasury', 'activity'],
    staleTime: 30_000,
    queryFn: async () => {
      const res = await fetch('/api/food-nouns/treasury');
      if (!res.ok) throw new Error(`Treasury fetch failed: ${res.status}`);
      const json = (await res.json()) as FNTreasuryResponse | { error: string };
      if ('error' in json) throw new Error(json.error);
      return json;
    },
  });
}
