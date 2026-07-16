/**
 * Batch-render many V2 nouns at once. Rendering each grid thumbnail with its
 * own client-side dataURI read doesn't scale (dozens of parallel eth_calls
 * throttle and stall), and the app's wallet transport doesn't batch them into a
 * multicall. Instead we hit a server route that does one multicall3 aggregate
 * and returns an id → image-data-URI map.
 */

'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

export function useV2NounImages(ids: number[]) {
  // Stable, sorted key so the query doesn't refire when only order changes.
  const sortedIds = useMemo(() => [...new Set(ids)].sort((a, b) => a - b), [ids]);
  const idsKey = sortedIds.join(',');

  const query = useQuery<Record<number, string>, Error>({
    queryKey: ['nounsV2', 'nounImages', idsKey],
    queryFn: async () => {
      const res = await fetch(`/api/nouns-v2/images?ids=${idsKey}`);
      if (!res.ok) throw new Error('Failed to load V2 noun art');
      const json = (await res.json()) as { images: Record<string, string> };
      const map: Record<number, string> = {};
      for (const [id, img] of Object.entries(json.images)) map[Number(id)] = img;
      return map;
    },
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  return { images: query.data ?? {}, isLoading: query.isLoading };
}
