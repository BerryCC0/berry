/**
 * useEnsData — Shared ENS Resolution Hooks
 *
 * Two-tier resolution strategy:
 *   1. **Primary** — batch fetch from /api/ens (Ponder-indexed ens_names table,
 *      9,000+ entries).  Fast, batched, React Query cached.
 *   2. **Fallback** — for addresses the DB returned null (never interacted with
 *      Nouns contracts), resolve live via api.ensideas.com.  Results are merged
 *      into the same map so consumers see a single, seamless data source.
 *
 * Staleness is handled server-side: /api/ens background-refreshes entries older
 * than 7 days so the *next* request returns updated data.
 *
 * This is the recommended ENS resolution strategy for all apps.  It replaces:
 *   - Direct wagmi useEnsName / useEnsAvatar imports (1 RPC call per component)
 *   - Probe's custom useENSName hook (api.ensideas.com per address)
 *   - Most uses of the OS-level ensService singleton
 *
 * The OS-level useENS hook (src/OS/hooks/useENS.ts) still exists for wallet UI
 * where live RPC resolution and the privacy toggle are needed.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface EnsData {
  name: string | null;
  avatar: string | null;
}

export type EnsMap = Record<string, EnsData>;

// ---------------------------------------------------------------------------
// Live resolution via ensideas.com (used as fallback for DB misses)
// ---------------------------------------------------------------------------

async function resolveEnsLive(
  address: string,
): Promise<EnsData> {
  try {
    const res = await fetch(
      `https://api.ensideas.com/ens/resolve/${address}`,
    );
    if (!res.ok) return { name: null, avatar: null };
    const data = (await res.json()) as {
      name?: string;
      avatar?: string;
    };
    return {
      name: data.name || null,
      avatar: data.avatar || null,
    };
  } catch {
    return { name: null, avatar: null };
  }
}

/**
 * Batch-resolve addresses that the DB didn't have data for.
 * Resolves in parallel with a concurrency cap to be kind to ensideas.com.
 */
async function batchResolveFallback(
  addresses: string[],
): Promise<EnsMap> {
  if (addresses.length === 0) return {};

  const BATCH_SIZE = 10;
  const results: EnsMap = {};

  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    const batch = addresses.slice(i, i + BATCH_SIZE);
    const resolved = await Promise.all(
      batch.map(async (addr) => ({
        addr,
        data: await resolveEnsLive(addr),
      })),
    );
    for (const { addr, data } of resolved) {
      results[addr] = data;
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Batch fetch ENS data for multiple addresses.
 *
 * Returns a map of lowercase address → { name, avatar }.
 * Addresses not found in the Ponder DB are resolved live via ensideas.com
 * in a second query pass (also React Query cached).
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

  // Tier 1: Ponder DB batch lookup
  const dbQuery = useQuery({
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

      const json = await response.json();
      return json.ens || {};
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: validAddresses.length > 0,
  });

  // Identify addresses where DB returned null name (not in DB or genuinely no ENS)
  const missedAddresses = useMemo(() => {
    if (!dbQuery.data) return [];
    return validAddresses.filter((addr) => {
      const entry = dbQuery.data[addr];
      // No entry at all, or entry with null name AND null resolvedAt (never looked up)
      return !entry || (entry.name === null && !(entry as EnsData & { resolvedAt?: number | null }).resolvedAt);
    });
  }, [dbQuery.data, validAddresses]);

  // Tier 2: Live fallback for DB misses
  const fallbackQuery = useQuery({
    queryKey: ['ens-fallback', missedAddresses],
    queryFn: () => batchResolveFallback(missedAddresses),
    staleTime: 10 * 60 * 1000, // 10 minutes (live resolution is more expensive)
    gcTime: 30 * 60 * 1000,
    enabled: missedAddresses.length > 0,
  });

  // Merge: DB results + fallback results (fallback wins for addresses it resolved)
  const mergedData = useMemo((): EnsMap => {
    const base = dbQuery.data ?? {};
    const fallback = fallbackQuery.data ?? {};
    if (Object.keys(fallback).length === 0) return base;

    const merged = { ...base };
    for (const [addr, data] of Object.entries(fallback)) {
      // Only override if fallback actually found something
      if (data.name || data.avatar) {
        merged[addr] = data;
      }
    }
    return merged;
  }, [dbQuery.data, fallbackQuery.data]);

  return {
    data: mergedData,
    isLoading: dbQuery.isLoading,
    error: dbQuery.error,
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
