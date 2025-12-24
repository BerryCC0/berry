'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Spot } from '../types';

// Use our proxy to avoid CORS issues
const NOUNSPOT_API = '/api/nounspot';

interface UseSpotsResult {
  spots: Spot[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch all spots from the Nounspot API
 */
export function useSpots(): UseSpotsResult {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSpots = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(NOUNSPOT_API);
      if (!response.ok) {
        throw new Error(`Failed to fetch spots: ${response.statusText}`);
      }
      const data = await response.json();
      setSpots(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpots();
  }, [fetchSpots]);

  return { spots, isLoading, error, refetch: fetchSpots };
}

/**
 * Hook to get a single spot by ID
 */
export function useSpot(spotId: string | undefined): { spot: Spot | null; isLoading: boolean } {
  const { spots, isLoading } = useSpots();
  
  const spot = spotId 
    ? spots.find(s => s.id === spotId) ?? null 
    : null;

  return { spot, isLoading };
}

