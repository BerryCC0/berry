/**
 * ENS Resolution for API Layer
 *
 * Lazy-resolves addresses to ENS names via ensideas.com.
 * Uses an in-memory LRU cache that persists for the lifetime of the Ponder process.
 */

const ensCache = new Map<string, { name: string | null; resolvedAt: number }>();
const ENS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 10_000;

/**
 * Resolve a single address to its ENS name (cached).
 */
export async function resolveEns(address: string): Promise<string | null> {
  const lower = address.toLowerCase();
  const cached = ensCache.get(lower);

  if (cached && Date.now() - cached.resolvedAt < ENS_CACHE_TTL) {
    return cached.name;
  }

  try {
    const res = await fetch(`https://api.ensideas.com/ens/resolve/${lower}`);
    if (!res.ok) {
      ensCache.set(lower, { name: null, resolvedAt: Date.now() });
      return null;
    }
    const data = (await res.json()) as { name?: string };
    const name = data.name || null;

    // Evict oldest entries if cache is too large
    if (ensCache.size >= MAX_CACHE_SIZE) {
      const firstKey = ensCache.keys().next().value;
      if (firstKey) ensCache.delete(firstKey);
    }

    ensCache.set(lower, { name, resolvedAt: Date.now() });
    return name;
  } catch {
    ensCache.set(lower, { name: null, resolvedAt: Date.now() });
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
