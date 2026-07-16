/**
 * useV2ProbeNouns — fetch the full V2 noun set (with auction results) for the
 * Probe explorer. The collection is small, so the whole thing is fetched once
 * and filtered / sorted client-side.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

export interface V2ProbeNoun {
  id: number;
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
  owner: string | null;
  isSlobber: boolean;
  burned: boolean;
  winner: string | null;
  amount: string | null;
  settlerAddress: string | null;
  settled: boolean;
}

export function useV2ProbeNouns() {
  return useQuery<{ nouns: V2ProbeNoun[]; total: number }, Error>({
    queryKey: ['nounsV2', 'probeNouns'],
    queryFn: async () => {
      const res = await fetch('/api/nouns-v2/nouns');
      if (!res.ok) throw new Error('Failed to load V2 nouns');
      return (await res.json()) as { nouns: V2ProbeNoun[]; total: number };
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
