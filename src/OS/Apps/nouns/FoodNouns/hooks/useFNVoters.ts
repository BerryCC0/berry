/**
 * List of all Food Nouns token holders + delegates with voting power.
 * Backed by /api/food-nouns/voters which queries Ponder.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

export interface FNVoterSummary {
  address: `0x${string}`;
  owned: number;
  delegatedVotes: number;
  totalVotes: number;
}

interface ApiResponse {
  voters?: {
    address: string;
    owned: number;
    delegatedVotes: number;
    totalVotes: number;
  }[];
  error?: string;
}

export function useFNVoters() {
  return useQuery<FNVoterSummary[]>({
    queryKey: ['fn', 'voters'],
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch('/api/food-nouns/voters');
      if (!res.ok) throw new Error(`Voters fetch failed: ${res.status}`);
      const json = (await res.json()) as ApiResponse;
      if (json.error) throw new Error(json.error);
      return (json.voters ?? []).map((v) => ({
        address: v.address as `0x${string}`,
        owned: v.owned,
        delegatedVotes: v.delegatedVotes,
        totalVotes: v.totalVotes,
      }));
    },
  });
}
