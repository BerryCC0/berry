/**
 * useEnsData Hook
 * Batch fetches ENS data from our /api/ens endpoint instead of making
 * individual RPC calls via wagmi. Uses React Query for caching.
 * 
 * This replaces the slow wagmi useEnsName/useEnsAvatar hooks which make
 * separate RPC calls for each address.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface EnsData {
  name: string | null;
  avatar: string | null;
}

type EnsMap = Record<string, EnsData>;

/**
 * Batch fetch ENS data for multiple addresses.
 * Returns a map of lowercase address -> { name, avatar }.
 */
export function useEnsDataBatch(addresses: (string | undefined | null)[]) {
  // Filter and deduplicate addresses
  const validAddresses = useMemo(() => {
    const unique = new Set<string>();
    for (const addr of addresses) {
      if (addr && addr.startsWith('0x') && addr.length === 42) {
        unique.add(addr.toLowerCase());
      }
    }
    return Array.from(unique).sort();
  }, [addresses]);

  const query = useQuery({
    queryKey: ['ens-batch', validAddresses],
    queryFn: async (): Promise<EnsMap> => {
      if (validAddresses.length === 0) return {};

      const response = await fetch('/api/ens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: validAddresses }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch ENS data');
      }

      const data = await response.json();
      return data.ens || {};
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: validAddresses.length > 0,
  });

  return {
    data: query.data ?? {},
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Get ENS name for a single address.
 * Uses the batch hook internally for efficient caching.
 */
export function useEnsName(address: string | undefined | null): string | null {
  const { data } = useEnsDataBatch(address ? [address] : []);
  if (!address) return null;
  return data[address.toLowerCase()]?.name ?? null;
}

/**
 * Get ENS avatar for a single address.
 * Uses the batch hook internally for efficient caching.
 */
export function useEnsAvatar(address: string | undefined | null): string | null {
  const { data } = useEnsDataBatch(address ? [address] : []);
  if (!address) return null;
  return data[address.toLowerCase()]?.avatar ?? null;
}

/**
 * Get both ENS name and avatar for a single address.
 */
export function useEnsData(address: string | undefined | null): EnsData {
  const { data } = useEnsDataBatch(address ? [address] : []);
  if (!address) return { name: null, avatar: null };
  return data[address.toLowerCase()] ?? { name: null, avatar: null };
}

/**
 * Helper to get ENS data from a pre-fetched map.
 * Use this when you've already called useEnsDataBatch and want to extract values.
 */
export function getEnsFromMap(ensMap: EnsMap, address: string | undefined | null): EnsData {
  if (!address) return { name: null, avatar: null };
  return ensMap[address.toLowerCase()] ?? { name: null, avatar: null };
}
