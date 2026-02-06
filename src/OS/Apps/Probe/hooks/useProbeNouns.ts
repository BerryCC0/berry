/**
 * useProbeNouns Hook
 * Fetches paginated + filtered Nouns list from our API
 * Accumulates pages client-side for infinite scroll
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { NounListItem } from '@/app/lib/nouns/hooks/useNoun';

export interface ProbeFilters {
  background?: number | null;
  body?: number | null;
  accessory?: number | null;
  head?: number | null;
  glasses?: number | null;
  settler?: string | null;
  winner?: string | null;
}

export type ProbeSort = 'newest' | 'oldest';

interface ProbeNounsResponse {
  nouns: NounListItem[];
  total: number;
  limit: number;
  offset: number;
}

/** Items per API request (API max is 100) */
const PAGE_SIZE = 100;

/**
 * Build the API URL with filters and pagination
 */
function buildApiUrl(
  offset: number,
  sort: ProbeSort,
  filters: ProbeFilters
): string {
  const params = new URLSearchParams();
  params.set('limit', String(PAGE_SIZE));
  params.set('offset', String(offset));
  params.set('sort', sort);

  if (filters.background != null) params.set('background', String(filters.background));
  if (filters.body != null) params.set('body', String(filters.body));
  if (filters.accessory != null) params.set('accessory', String(filters.accessory));
  if (filters.head != null) params.set('head', String(filters.head));
  if (filters.glasses != null) params.set('glasses', String(filters.glasses));
  if (filters.settler) params.set('settler', filters.settler);
  if (filters.winner) params.set('winner', filters.winner);

  return `/api/nouns?${params.toString()}`;
}

/**
 * Serialize filters to a stable string for reset detection
 */
function filtersKey(sort: ProbeSort, filters: ProbeFilters): string {
  return JSON.stringify({ sort, ...filters });
}

/**
 * Fetch Nouns with trait filters and infinite-scroll pagination.
 * Each "page" fetches PAGE_SIZE items; results accumulate client-side.
 */
export function useProbeNouns(
  sort: ProbeSort = 'newest',
  filters: ProbeFilters = {}
) {
  const [pages, setPages] = useState<NounListItem[][]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const prevKey = useRef(filtersKey(sort, filters));

  // Reset accumulated pages when filters/sort change
  const currentKey = filtersKey(sort, filters);
  if (currentKey !== prevKey.current) {
    prevKey.current = currentKey;
    setPages([]);
    setPage(0);
    setTotal(0);
  }

  const offset = page * PAGE_SIZE;

  const { data, isFetching } = useQuery<ProbeNounsResponse>({
    queryKey: ['probe', 'nouns', PAGE_SIZE, offset, sort, filters],
    queryFn: async () => {
      const response = await fetch(buildApiUrl(offset, sort, filters));
      if (!response.ok) {
        throw new Error('Failed to fetch nouns');
      }
      return response.json();
    },
    staleTime: 60 * 1000,
  });

  // Accumulate page results when data arrives
  useEffect(() => {
    if (!data) return;
    setTotal(data.total);
    setPages((prev) => {
      // Only update if this page hasn't been stored yet (or data changed)
      if (prev[page] === data.nouns) return prev;
      const next = [...prev];
      next[page] = data.nouns;
      return next;
    });
  }, [data, page]);

  const nouns = pages.flat();
  const hasMore = nouns.length < total;
  const isLoading = isFetching && nouns.length === 0;

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setPage((p) => p + 1);
    }
  }, [isFetching, hasMore]);

  return { nouns, total, hasMore, isLoading, isFetching, loadMore };
}
