/**
 * Small Grants treasury balance.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { SG_ADDRESSES } from '../contracts';

export function useSGTreasuryBalance() {
  const publicClient = usePublicClient({ chainId: 1 });
  return useQuery<bigint>({
    queryKey: ['sg', 'treasury', 'balance'],
    enabled: !!publicClient,
    staleTime: 30_000,
    queryFn: async () => {
      if (!publicClient) return BigInt(0);
      return publicClient.getBalance({ address: SG_ADDRESSES.treasury });
    },
  });
}
