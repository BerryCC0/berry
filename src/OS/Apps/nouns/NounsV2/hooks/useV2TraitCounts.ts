/**
 * Read V2 descriptor trait counts once and cache. Crystal-ball seed
 * computation needs these to do `seed % count` per trait category.
 */

'use client';

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { V2_CONTRACTS, V2_CHAIN_ID } from '../contracts';

export interface V2TraitCounts {
  backgrounds: number;
  bodies: number;
  accessories: number;
  heads: number;
  glasses: number;
}

export function useV2TraitCounts() {
  const query = useReadContracts({
    allowFailure: false,
    contracts: [
      {
        address: V2_CONTRACTS.descriptor.address,
        abi: V2_CONTRACTS.descriptor.abi,
        functionName: 'backgroundCount',
        chainId: V2_CHAIN_ID,
      },
      {
        address: V2_CONTRACTS.descriptor.address,
        abi: V2_CONTRACTS.descriptor.abi,
        functionName: 'bodyCount',
        chainId: V2_CHAIN_ID,
      },
      {
        address: V2_CONTRACTS.descriptor.address,
        abi: V2_CONTRACTS.descriptor.abi,
        functionName: 'accessoryCount',
        chainId: V2_CHAIN_ID,
      },
      {
        address: V2_CONTRACTS.descriptor.address,
        abi: V2_CONTRACTS.descriptor.abi,
        functionName: 'headCount',
        chainId: V2_CHAIN_ID,
      },
      {
        address: V2_CONTRACTS.descriptor.address,
        abi: V2_CONTRACTS.descriptor.abi,
        functionName: 'glassesCount',
        chainId: V2_CHAIN_ID,
      },
    ] as const,
    query: {
      staleTime: Infinity,
      gcTime: Infinity,
    },
  });

  const counts = useMemo<V2TraitCounts | null>(
    () =>
      query.data
        ? {
            backgrounds: Number(query.data[0]),
            bodies: Number(query.data[1]),
            accessories: Number(query.data[2]),
            heads: Number(query.data[3]),
            glasses: Number(query.data[4]),
          }
        : null,
    [query.data],
  );

  return { counts, isLoading: query.isLoading, error: query.error };
}
