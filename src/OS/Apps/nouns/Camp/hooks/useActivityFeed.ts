/**
 * useActivityFeed Hook
 *
 * Fetches the unified activity feed from `/api/activity` and processes it
 * through the activity registry. All per-type SQL, row shapes, and transform
 * logic live in `../activity/definitions/`. This hook is just the React
 * Query wrapper + the call into `processViaRegistry`.
 *
 * The 14-day rolling window is rounded to the hour to keep the React Query
 * key stable between renders.
 */

'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBlockNumber } from 'wagmi';
import type { ActivityItem } from '../types';
import { ACTIVITY_REGISTRY } from '../activity/registry';
import {
  processViaRegistry,
  postProcess,
  type ActivityApiResponseShape,
} from '../activity/orchestrator';

// All registered activity types. Derived from the registry so a new entry
// auto-flows into the feed — no second list to keep in sync.
const ALL_ACTIVITY_TYPES = Object.keys(ACTIVITY_REGISTRY) as (keyof typeof ACTIVITY_REGISTRY)[];

export function useActivityFeed(first: number = 30) {
  // Watch the head block so currentBlock stays fresh. Without this, the
  // fallback endTimestamp = now - (currentBlock - endBlock) * 12 drifts
  // forward as `now` advances while `currentBlock` is stuck at mount-time.
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const currentBlock = blockNumber ? Number(blockNumber) : undefined;

  // Only fetch activity from the last 14 days. Rounded to the hour so the
  // queryKey doesn't change on every render.
  const sinceTimestamp = useMemo(() => {
    const fourteenDaysAgo = Math.floor(Date.now() / 1000) - 14 * 24 * 60 * 60;
    const roundedToHour = Math.floor(fourteenDaysAgo / 3600) * 3600;
    return roundedToHour.toString();
  }, []);

  const query = useQuery({
    queryKey: ['camp', 'activity', first, sinceTimestamp],
    queryFn: async (): Promise<ActivityItem[]> => {
      const params = new URLSearchParams({
        limit: String(first),
        since: sinceTimestamp,
      });

      const response = await fetch(`/api/activity?${params}`);
      if (!response.ok) throw new Error('Failed to fetch activity');

      const data = (await response.json()) as ActivityApiResponseShape;

      const ctx = { currentBlock, nowSeconds: Math.floor(Date.now() / 1000) };
      const items = processViaRegistry(data, ALL_ACTIVITY_TYPES, ctx);
      return postProcess(items);
    },
    staleTime: 60000,
    gcTime: 300000,
    refetchInterval: 60000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
