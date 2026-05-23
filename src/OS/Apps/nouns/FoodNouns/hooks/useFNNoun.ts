/**
 * Fetches the on-chain SVG for a Food Nouns token via dataURI(tokenId).
 * dataURI returns base64-encoded JSON with embedded SVG.
 */

'use client';

import { useReadContract } from 'wagmi';
import { useMemo } from 'react';
import { FN_CONTRACTS, FN_CHAIN_ID } from '../contracts';

interface DataURIPayload {
  name?: string;
  description?: string;
  image?: string;
}

export function useFNNounImage(tokenId: bigint | null | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: FN_CONTRACTS.token.address,
    abi: FN_CONTRACTS.token.abi,
    functionName: 'dataURI',
    args: tokenId != null ? [tokenId] : undefined,
    chainId: FN_CHAIN_ID,
    query: {
      enabled: tokenId != null,
      staleTime: Infinity,
      gcTime: Infinity,
    },
  });

  const decoded = useMemo<DataURIPayload | null>(() => {
    if (!data || typeof data !== 'string') return null;
    try {
      const prefix = 'data:application/json;base64,';
      const raw = data.startsWith(prefix) ? data.slice(prefix.length) : data;
      const json = typeof atob === 'function' ? atob(raw) : Buffer.from(raw, 'base64').toString('utf8');
      return JSON.parse(json) as DataURIPayload;
    } catch {
      return null;
    }
  }, [data]);

  return { image: decoded?.image ?? null, name: decoded?.name ?? null, isLoading, error };
}
