/**
 * ENS Resolution Helper for Ponder Indexing
 *
 * Resolves addresses to ENS names via ensideas.com and stores them
 * in the ens_names table during indexing. Uses an in-memory cache
 * to avoid duplicate HTTP calls across the lifetime of the process.
 */

import { ensNames } from "ponder:schema";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// In-memory cache: persists for the lifetime of the Ponder process.
// During backfill, this means each unique address is resolved exactly once.
const ENS_CACHE = new Map<string, string | null>();

/**
 * Resolve an Ethereum address to its ENS name via ensideas.com.
 * Results are cached in memory for the lifetime of the process.
 * Returns null if no ENS name is found or on error.
 */
export async function resolveEns(address: string): Promise<string | null> {
  const lower = address.toLowerCase();

  if (ENS_CACHE.has(lower)) {
    return ENS_CACHE.get(lower) ?? null;
  }

  try {
    const res = await fetch(`https://api.ensideas.com/ens/resolve/${lower}`);
    if (!res.ok) {
      ENS_CACHE.set(lower, null);
      return null;
    }
    const data = (await res.json()) as { name?: string; address?: string };
    const name = data.name || null;
    ENS_CACHE.set(lower, name);
    return name;
  } catch {
    ENS_CACHE.set(lower, null);
    return null;
  }
}

/**
 * Resolve an address to its ENS name and store the result in the ens_names table.
 * Skips the zero address. Uses in-memory cache to avoid duplicate HTTP calls.
 *
 * @param context - Ponder event handler context (must have context.db)
 * @param address - The Ethereum address to resolve
 * @returns The resolved ENS name, or null
 */
export async function resolveAndStoreEns(
  context: { db: any },
  address: string,
): Promise<string | null> {
  const lower = address.toLowerCase();

  // Skip zero address
  if (lower === ZERO_ADDRESS) return null;

  // Resolve (uses in-memory cache internally)
  const name = await resolveEns(lower);

  // Write to ens_names table (upsert)
  try {
    await context.db
      .insert(ensNames)
      .values({
        address: lower as `0x${string}`,
        name,
        resolvedAt: BigInt(Math.floor(Date.now() / 1000)),
      })
      .onConflictDoUpdate({
        name,
        resolvedAt: BigInt(Math.floor(Date.now() / 1000)),
      });
  } catch {
    // DB write failed -- don't block indexing
  }

  return name;
}

/**
 * Batch-resolve multiple addresses to ENS names and store in ens_names.
 * Deduplicates addresses and skips the zero address.
 *
 * @param context - Ponder event handler context
 * @param addresses - Array of Ethereum addresses
 * @returns Map of lowercase address -> ENS name (or null)
 */
export async function batchResolveAndStoreEns(
  context: { db: any },
  addresses: string[],
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  // Deduplicate and filter zero address
  const unique = [
    ...new Set(
      addresses
        .map((a) => a.toLowerCase())
        .filter((a) => a !== ZERO_ADDRESS),
    ),
  ];

  // Resolve in parallel with concurrency limit to be kind to ensideas.com
  const BATCH_SIZE = 10;
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const resolved = await Promise.all(
      batch.map((addr) => resolveAndStoreEns(context, addr)),
    );
    batch.forEach((addr, idx) => results.set(addr, resolved[idx]!));
  }

  return results;
}

/**
 * Extract a title from a proposal/candidate description.
 * Titles are the first line, typically formatted as "# Title" in markdown.
 */
export function extractTitle(description: string | undefined | null): string {
  if (!description) return "";
  const firstLine = description.split("\n")[0]?.trim() ?? "";
  // Remove markdown heading prefix
  return firstLine.replace(/^#+\s*/, "").trim();
}
