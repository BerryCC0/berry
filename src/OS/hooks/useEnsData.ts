/**
 * useEnsData — Shared ENS Resolution Hooks
 *
 * Two-tier resolution strategy:
 *   1. **Primary** — batch fetch from /api/ens (Ponder-indexed ens_names table,
 *      9,000+ entries).  Fast, batched, React Query cached.
 *   2. **Fallback** — for any address the indexer has no usable name for,
 *      resolve on-chain via the ENS Universal Resolver.  Results are merged
 *      into the same map so consumers see a single, seamless data source.
 *
 * The fallback fires for two kinds of row:
 *   - **null name.** The indexer stores a null both when an address genuinely
 *     has no ENS and when its lookup transiently failed (that once poisoned
 *     ~75% of ens_names rows). We can't tell the two apart, so we re-check.
 *   - **stale row.** A row whose `resolvedAt` is older than STALE_AFTER_MS.
 *     Without this, a RENAME never surfaced: the row is non-null, so the null
 *     check above skipped it, and the indexer only re-resolves an address on
 *     its next event. Someone who changed their primary name kept showing the
 *     old one indefinitely.
 *
 * The indexer's tables are Ponder-owned (live-query/reorg triggers) and cannot
 * be written by the frontend, so this client-side re-check is the healing path.
 *
 * Resolution is on-chain rather than through api.ensideas.com because that
 * service caches reverse lookups at the edge for 24 hours (`s-maxage=86400`) —
 * asking it more often can't beat its own cache, so a rename stayed invisible
 * for up to a day regardless of what we did here.
 *
 * This is the recommended ENS resolution strategy for all apps.  It replaces:
 *   - Direct wagmi useEnsName / useEnsAvatar imports (1 RPC call per component)
 *   - Probe's custom useENSName hook (api.ensideas.com per address)
 *   - Most uses of the OS-level ensService singleton
 *
 * The OS-level useENS hook (src/OS/hooks/useENS.ts) still exists for wallet UI
 * where live RPC resolution and the privacy toggle are needed. Note that this
 * hook deliberately does NOT gate on privacy.ensResolution — tier 1 serves
 * names from the DB regardless, so gating only tier 2 would be incoherent.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ensPublicClient } from '@/app/lib/ens/client';
import { ensAvatarUrl } from '@/app/lib/ens/contracts';

export interface EnsData {
  name: string | null;
  avatar: string | null;
}

export type EnsMap = Record<string, EnsData>;

/** A tier-1 row: what /api/ens returned, plus the freshness verdict. */
interface EnsDbEntry extends EnsData {
  /** unix seconds; null = address not present in ens_names at all */
  resolvedAt: number | null;
  /**
   * Whether this row is old enough to re-check on-chain. Decided in the
   * queryFn, not in render — staleness depends on the wall clock, and reading
   * it during render is impure (React can re-render at any time, which would
   * make the tier-2 address list unstable). Fetch time is also the honest
   * moment to ask: React Query refetches on its own staleTime, so the verdict
   * is re-derived whenever the underlying data is.
   */
  isStale: boolean;
}

/**
 * Cap on live fallbacks per batch. Bounds fan-out when a single view has many
 * addresses the indexer has no usable name for; addresses beyond the cap keep
 * their truncated-address display and resolve on a later, smaller view.
 */
const MAX_LIVE_FALLBACK = 50;

/**
 * How old an indexed row may be before we re-check it on-chain.
 *
 * Trades RPC calls against rename latency. Kept generous because the indexer
 * now re-resolves on its own (ponder/src/helpers/ens.ts holds a 12h cache TTL),
 * so this is a safety net for addresses that emit no events — not the primary
 * refresh path. Lowering it pushes more addresses past MAX_LIVE_FALLBACK.
 */
const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Live on-chain resolution (used as fallback for DB misses and stale rows)
// ---------------------------------------------------------------------------

async function resolveEnsLive(
  address: string,
): Promise<EnsData> {
  try {
    const client = ensPublicClient();

    // reverseWithGateways on the Universal Resolver verifies the forward
    // roundtrip on-chain (reverts ReverseAddressMismatch, which viem maps to
    // null), so a reverse record alone can't spoof someone else's name.
    const name = await client.getEnsName({ address: address as `0x${string}` });
    if (!name) return { name: null, avatar: null };

    // Only claim an avatar when the record actually exists — the metadata
    // service 404s for names that never set one.
    const record = await client.getEnsText({ name, key: 'avatar' });
    return { name, avatar: record ? ensAvatarUrl(name) : null };
  } catch {
    return { name: null, avatar: null };
  }
}

/**
 * Batch-resolve addresses the DB has no usable data for.
 * Resolves in parallel with a concurrency cap so we don't burst the RPC.
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
    queryFn: async (): Promise<Record<string, EnsDbEntry>> => {
      if (validAddresses.length === 0) return {};

      const response = await fetch('/api/ens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: validAddresses }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch ENS data');
      }

      const json = (await response.json()) as {
        ens?: Record<string, Partial<EnsDbEntry>>;
      };

      const now = Date.now();
      const entries: Record<string, EnsDbEntry> = {};
      for (const [addr, row] of Object.entries(json.ens ?? {})) {
        const resolvedAt = row.resolvedAt ?? null;
        entries[addr] = {
          name: row.name ?? null,
          avatar: row.avatar ?? null,
          resolvedAt,
          isStale:
            resolvedAt === null || now - resolvedAt * 1000 > STALE_AFTER_MS,
        };
      }
      return entries;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: validAddresses.length > 0,
  });

  // Addresses to resolve live, in priority order:
  //   1. no name — row missing entirely, or present-but-null. A present null is
  //      either a genuine "no ENS" or a failed lookup we can't distinguish, so
  //      re-checking is the only way a newly-set name or a poisoned row heals.
  //   2. stale name — a non-null row older than STALE_AFTER_MS. Catches renames,
  //      which tier 1 will otherwise serve at the old value forever.
  //
  // Nulls go first because they're the visible breakage (a raw 0x address on
  // screen), while a stale row at least renders *a* name. When a view has more
  // candidates than MAX_LIVE_FALLBACK, that ordering decides who gets the slots.
  const missedAddresses = useMemo(() => {
    const data = dbQuery.data;
    if (!data) return [];

    const unnamed: string[] = [];
    const stale: string[] = [];

    for (const addr of validAddresses) {
      const entry = data[addr];
      if (!entry || entry.name === null) {
        unnamed.push(addr);
      } else if (entry.isStale) {
        stale.push(addr);
      }
    }

    return [...unnamed, ...stale].slice(0, MAX_LIVE_FALLBACK);
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
    // Widening to EnsMap here drops resolvedAt, which is a tier-2 scheduling
    // detail — consumers only ever want name/avatar.
    const base: EnsMap = dbQuery.data ?? {};
    const fallback = fallbackQuery.data ?? {};
    if (Object.keys(fallback).length === 0) return base;

    const merged: EnsMap = { ...base };
    for (const [addr, data] of Object.entries(fallback)) {
      // Only override if the fallback actually found something. A null here is
      // ambiguous — genuinely nameless, or an RPC hiccup — and overriding on it
      // would let one flaky call wipe a good name back to a raw 0x address.
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
