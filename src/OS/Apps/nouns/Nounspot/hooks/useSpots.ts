'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Spot } from '../types';

// Use our proxy to avoid CORS issues
const NOUNSPOT_API = '/api/nounspot';

/**
 * Hook to fetch all spots from the Nounspot API.
 * Uses React Query for caching, deduplication, and automatic refetch.
 */
export function useSpots() {
  const query = useQuery<Spot[]>({
    queryKey: ['nounspot', 'spots'],
    queryFn: async () => {
      const response = await fetch(NOUNSPOT_API);
      if (!response.ok) {
        throw new Error(`Failed to fetch spots: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    spots: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to get a single spot by ID.
 * Reads from the spots cache — no extra network request.
 */
export function useSpot(spotId: string | undefined): { spot: Spot | null; isLoading: boolean } {
  const { spots, isLoading } = useSpots();

  const spot = useMemo(
    () => (spotId ? spots.find((s) => s.id === spotId) ?? null : null),
    [spots, spotId],
  );

  return { spot, isLoading };
}
