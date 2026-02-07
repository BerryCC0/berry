/**
 * ENS Resolution for API Layer
 *
 * DB-backed: reads from ens_names table first (populated during indexing),
 * then falls back to ensideas.com HTTP resolution for any misses.
 * Uses an in-memory LRU cache for the lifetime of the Ponder process.
 */

import { eq } from "ponder";
import { ensNames } from "ponder:schema";

// In-memory cache that persists for the lifetime of the Ponder API process
const ensCache = new Map<string, { name: string | null; resolvedAt: number }>();
const ENS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 10_000;

// The db instance is set once via init() from the API index
let _db: any = null;

/**
 * Initialize the ENS resolver with the Ponder API db instance.
 * Must be called once from ponder/src/api/index.ts.
 */
export function initEnsResolver(db: any) {
  _db = db;
}

/**
 * Resolve a single address to its ENS name.
 * 1. Check in-memory cache
 * 2. Check ens_names DB table (populated during indexing)
 * 3. Fall back to ensideas.com HTTP
 */
export async function resolveEns(address: string): Promise<string | null> {
  const lower = address.toLowerCase();

  // 1. In-memory cache
  const cached = ensCache.get(lower);
  if (cached && Date.now() - cached.resolvedAt < ENS_CACHE_TTL) {
    return cached.name;
  }

  // 2. DB lookup (ens_names table populated during indexing)
  if (_db) {
    try {
      const rows = await _db
        .select()
        .from(ensNames)
        .where(eq(ensNames.address, lower as `0x${string}`))
        .limit(1);

      if (rows.length > 0) {
        const name = rows[0].name ?? null;
        setCacheEntry(lower, name);
        return name;
      }
    } catch {
      // DB query failed, fall through to HTTP
    }
  }

  // 3. HTTP fallback (ensideas.com)
  try {
    const res = await fetch(`https://api.ensideas.com/ens/resolve/${lower}`);
    if (!res.ok) {
      setCacheEntry(lower, null);
      return null;
    }
    const data = (await res.json()) as { name?: string };
    const name = data.name || null;
    setCacheEntry(lower, name);
    return name;
  } catch {
    setCacheEntry(lower, null);
    return null;
  }
}

/**
 * Batch-resolve multiple addresses to ENS names.
 * Returns a map of address -> ENS name (or null).
 */
export async function batchResolveEns(
  addresses: string[],
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const uniqueAddresses = [...new Set(addresses.map((a) => a.toLowerCase()))];

  // Resolve in parallel with concurrency limit
  const BATCH_SIZE = 10;
  for (let i = 0; i < uniqueAddresses.length; i += BATCH_SIZE) {
    const batch = uniqueAddresses.slice(i, i + BATCH_SIZE);
    const resolved = await Promise.all(batch.map(resolveEns));
    batch.forEach((addr, idx) => results.set(addr, resolved[idx]!));
  }

  return results;
}

function setCacheEntry(address: string, name: string | null) {
  // Evict oldest entries if cache is too large
  if (ensCache.size >= MAX_CACHE_SIZE) {
    const firstKey = ensCache.keys().next().value;
    if (firstKey) ensCache.delete(firstKey);
  }
  ensCache.set(address, { name, resolvedAt: Date.now() });
}
