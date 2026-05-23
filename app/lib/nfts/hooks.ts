/**
 * Generic NFT hooks for the marketplace editor tabs.
 *
 * `useMyNfts` (in `app/lib/ens/hooks/useMyNfts.ts`) is the paginated
 * catch-all used by the avatar picker and the marketplace editor's
 * "Other" tab.
 *
 * `useNftsByContracts` (here) is for per-collection tab fetches. It uses
 * `useInfiniteQuery` under the hood and auto-fetches every page until
 * the address has been fully enumerated for the requested contracts.
 * Bounded by `AUTO_FETCH_MAX_PAGES` as a safety cap (e.g., the V1
 * treasury holds 800+ Lil Nouns = 8+ pages of 100).
 *
 * The infinite-query shape stays internal — callers see a normal
 * `{ data, isLoading, error, ... }` shape where `data.nfts` is the
 * concatenation of every page that's been fetched. `isFetchingMore` is
 * exposed so the editor can show a loading-more indicator.
 */

'use client';

import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

export interface OwnedNft {
  contract: string;
  tokenId: string;
  tokenType: 'ERC721' | 'ERC1155';
  name: string | null;
  collectionName: string | null;
  image: string;
}

interface OwnedNftsPageResponse {
  address: string;
  nfts: OwnedNft[];
  pageKey: string | null;
  totalCount: number;
}

export interface OwnedNftsResponse {
  address: string;
  /** All NFTs across every page fetched so far. */
  nfts: OwnedNft[];
  /** Alchemy's reported total — same on every page; useful for "loaded X of Y". */
  totalCount: number;
}

/** Safety cap — never auto-fetch more than this many pages per query. */
const AUTO_FETCH_MAX_PAGES = 20;

/**
 * Fetch every NFT an address owns from a specific set of contracts. Uses
 * the `/api/nfts/[address]?contracts=...` server route (which in turn
 * uses Alchemy's `contractAddresses[]` filter).
 *
 * Auto-paginates: a `useEffect` keeps calling `fetchNextPage` while
 * `hasNextPage` is true and we haven't hit the page cap. By the time the
 * `data.nfts` array stabilises, it holds every owned token.
 *
 * Gated by `enabled` on a non-empty contracts array — pass an empty
 * array or `undefined` to keep the query idle.
 */
export function useNftsByContracts(
  owner: string | undefined,
  contracts: readonly string[] | undefined,
): {
  data: OwnedNftsResponse | undefined;
  isLoading: boolean;
  isFetchingMore: boolean;
  error: Error | null;
  /** True until the entire collection has been paged through. */
  hasMore: boolean;
  /** Number of pages fetched so far (≤ AUTO_FETCH_MAX_PAGES). */
  pagesLoaded: number;
} {
  const key = contracts ? contracts.join(',').toLowerCase() : '';

  const query = useInfiniteQuery<
    OwnedNftsPageResponse,
    Error,
    { pages: OwnedNftsPageResponse[]; pageParams: (string | undefined)[] },
    readonly unknown[],
    string | undefined
  >({
    queryKey: ['nfts-by-contracts', owner?.toLowerCase(), key],
    queryFn: async ({ pageParam }) => {
      const url = new URL(
        `/api/nfts/${owner!.toLowerCase()}`,
        window.location.origin,
      );
      url.searchParams.set('contracts', contracts!.join(','));
      if (pageParam) url.searchParams.set('pageKey', pageParam);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch NFTs: ${res.status}`);
      return res.json();
    },
    initialPageParam: undefined,
    getNextPageParam: (last) => last.pageKey ?? undefined,
    enabled:
      !!owner &&
      owner.startsWith('0x') &&
      owner.length === 42 &&
      !!contracts &&
      contracts.length > 0,
    staleTime: 60_000,
  });

  const pagesLoaded = query.data?.pages.length ?? 0;

  // Auto-fetch the next page until the entire collection is enumerated
  // or we hit the safety cap. Self-driving — the editor doesn't need a
  // "load more" button for per-collection panels.
  useEffect(() => {
    if (!query.hasNextPage) return;
    if (query.isFetchingNextPage) return;
    if (pagesLoaded >= AUTO_FETCH_MAX_PAGES) return;
    query.fetchNextPage();
  }, [query, pagesLoaded]);

  const combined = useMemo<OwnedNftsResponse | undefined>(() => {
    if (!query.data) return undefined;
    const allNfts = query.data.pages.flatMap((p) => p.nfts);
    const totalCount = query.data.pages[0]?.totalCount ?? allNfts.length;
    const address = query.data.pages[0]?.address ?? '';
    return { address, nfts: allNfts, totalCount };
  }, [query.data]);

  return {
    data: combined,
    isLoading: query.isLoading,
    isFetchingMore: query.isFetchingNextPage,
    error: (query.error as Error | null) ?? null,
    hasMore: !!query.hasNextPage && pagesLoaded < AUTO_FETCH_MAX_PAGES,
    pagesLoaded,
  };
}
