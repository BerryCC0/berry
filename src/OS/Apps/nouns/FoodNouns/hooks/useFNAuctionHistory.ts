/**
 * Recent settled Food Nouns auctions, fetched server-side via Etherscan.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

export interface FNSettledAuction {
  nounId: bigint;
  winner: `0x${string}`;
  amount: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
}

interface ApiAuction {
  nounId: string;
  winner: string;
  amount: string;
  blockNumber: string;
  txHash: string;
}

export function useFNAuctionHistory(limit: number = 30) {
  return useQuery<FNSettledAuction[]>({
    queryKey: ['fn', 'auction-history', limit],
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch('/api/food-nouns/auctions');
      if (!res.ok) throw new Error(`Auctions fetch failed: ${res.status}`);
      const json = (await res.json()) as { auctions?: ApiAuction[]; error?: string };
      if (json.error) throw new Error(json.error);
      const auctions = json.auctions ?? [];
      return auctions.slice(0, limit).map((a) => ({
        nounId: BigInt(a.nounId),
        winner: a.winner as `0x${string}`,
        amount: BigInt(a.amount),
        blockNumber: BigInt(a.blockNumber),
        txHash: a.txHash as `0x${string}`,
      }));
    },
  });
}
