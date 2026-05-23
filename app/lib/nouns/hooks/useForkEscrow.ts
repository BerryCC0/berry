/**
 * Hook for the Nouns DAO Fork Escrow contents.
 *
 * Returns the current set of escrowed Nouns + each one's original depositor.
 * Backed by /api/nouns/fork-escrow, which derives the data from the Ponder
 * indexer (current owner = fork escrow, original depositor = most recent
 * inbound transfer's `from`).
 */

'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  EscrowedNoun,
  ForkEscrowResponse,
} from '@/app/api/nouns/fork-escrow/route';

const STALE_TIME = 60_000;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${url} (${res.status})`);
  return (await res.json()) as T;
}

export function useForkEscrowNouns() {
  return useQuery<ForkEscrowResponse>({
    queryKey: ['fork-escrow-nouns'],
    queryFn: () => fetchJson<ForkEscrowResponse>('/api/nouns/fork-escrow'),
    staleTime: STALE_TIME,
  });
}

/**
 * Convenience selector: group the escrowed Nouns by their original depositor.
 * Used by the return-tokens editor, which acts on one (owner, tokenIds[])
 * pair per proposal action.
 */
export interface EscrowedOwnerGroup {
  /** Lowercased depositor address. */
  owner: string;
  ens: string | null;
  nouns: EscrowedNoun[];
}

export function useForkEscrowGroupedByOwner(): {
  data: EscrowedOwnerGroup[] | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const query = useForkEscrowNouns();
  const grouped = useMemo<EscrowedOwnerGroup[] | undefined>(() => {
    if (!query.data) return undefined;
    const byOwner = new Map<string, EscrowedOwnerGroup>();
    for (const noun of query.data.nouns) {
      const owner = noun.originalOwner.toLowerCase();
      const existing = byOwner.get(owner);
      if (existing) {
        existing.nouns.push(noun);
      } else {
        byOwner.set(owner, {
          owner,
          ens: noun.originalOwnerEns,
          nouns: [noun],
        });
      }
    }
    // Sort: groups with more escrowed Nouns first (most interesting to the
    // proposer), then by address for stability.
    return Array.from(byOwner.values()).sort((a, b) => {
      if (b.nouns.length !== a.nouns.length) {
        return b.nouns.length - a.nouns.length;
      }
      return a.owner.localeCompare(b.owner);
    });
  }, [query.data]);

  return {
    data: grouped,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
