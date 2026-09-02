/**
 * ENS Resolution Helper for Ponder Indexing
 *
 * Resolves addresses to ENS names and avatars ON-CHAIN via the ENS Universal
 * Resolver and stores them in the ens_names table during indexing.
 *
 * Previously this called api.ensideas.com. That service fronts its reverse
 * lookups with a 24-hour Cloudflare edge cache (`s-maxage=86400`), so a user
 * who changed their primary name kept resolving to the OLD name for up to a
 * day no matter how often we re-asked. Reading the resolver directly removes
 * that floor entirely — a rename is visible on the next block.
 *
 * It also fixes avatars: ensideas returned a metadata.ens.domains avatar URL
 * for every name whether or not one was set, so names without an avatar got a
 * URL that 404s. We now check the `avatar` text record and store null when
 * there isn't one.
 */

import { ensNames } from "ponder:schema";
import type { Context } from "ponder:registry";
import { createPublicClient, fallback, http } from "viem";
import { mainnet } from "viem/chains";

/**
 * The slice of a Ponder indexing context these helpers need.
 *
 * `Context` comes from the generated ponder:registry types, so `db` stays in
 * sync with ponder.schema.ts automatically — no hand-written shape to drift.
 * Picking just `db` documents that we never touch `client`, `chain`, or
 * `contracts`, and lets callers pass their handler context directly.
 */
type EnsWriteContext = Pick<Context, "db">;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** Avatars are served through ENS's metadata service, which handles NFT-typed
 *  avatar records (eip155:.../erc721:...) that we'd otherwise have to unwrap. */
const ENS_METADATA_BASE = "https://metadata.ens.domains/mainnet";
const ENS_RPC_TIMEOUT_MS = 10_000;

/**
 * Dedicated client for ENS reads.
 *
 * Deliberately NOT `context.client`: that one is scoped to the block of the
 * event being indexed, which would give us each address's name AS OF that
 * historical block. ens_names is a "what is this address called right now"
 * cache for the UI, so it must read latest state.
 *
 * Transport mirrors ponder.config.ts — configured RPC first, public fallbacks
 * behind it so a lapsed key doesn't take ENS resolution down with it.
 */
const ensClient = createPublicClient({
  chain: mainnet,
  transport: fallback(
    [
      ...(process.env.PONDER_RPC_URL_1
        ? [http(process.env.PONDER_RPC_URL_1, { timeout: ENS_RPC_TIMEOUT_MS })]
        : []),
      http("https://ethereum-rpc.publicnode.com", {
        timeout: ENS_RPC_TIMEOUT_MS,
      }),
      http("https://eth.llamarpc.com", { timeout: ENS_RPC_TIMEOUT_MS }),
    ],
    { retryCount: 1 },
  ),
});

/** Resolved ENS data (name + avatar) */
export interface EnsResult {
  name: string | null;
  avatar: string | null;
}

/**
 * Outcome of a resolution attempt. `ok` is false only when the upstream lookup
 * FAILED (network error, rate-limit, non-2xx) — distinct from succeeding and
 * finding no name.
 *
 * Why this distinction matters: callers must never persist a failed lookup. A
 * failed lookup written as a fresh `null` row is indistinguishable from an
 * authoritative "this address has no ENS", so it (a) suppresses re-resolution
 * and (b) can overwrite a previously-good name. Back when this resolved through
 * ensideas.com, transient rate-limits doing exactly that poisoned ~75% of the
 * ens_names table with nulls. RPC failures can do the same, so the rule stands.
 */
interface EnsLookup extends EnsResult {
  ok: boolean;
}

/**
 * How long a successful resolution is trusted before we look it up again.
 *
 * This TTL is the whole reason renames ever land. The cache used to hold
 * entries for the lifetime of the process, which meant each address resolved
 * exactly ONCE per Ponder process — a name change on an already-indexed
 * address could only surface via a redeploy that triggered a full re-index.
 * In practice that was every few weeks (and once, a two-month gap). With a
 * TTL, a long-running indexer re-resolves an address on its first event after
 * the window expires.
 */
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

interface CacheEntry extends EnsResult {
  cachedAt: number;
}

// In-memory cache, per Ponder process. Holds only SUCCESSFUL lookups —
// failures stay uncached and get retried on the address's next event.
//
// During a backfill this still collapses a hot address (nounders et al. appear
// in thousands of events) down to roughly one lookup, since a backfill runs
// well inside a single TTL window.
const ENS_CACHE = new Map<string, CacheEntry>();

/**
 * Resolve an Ethereum address to its ENS name and avatar via the on-chain
 * Universal Resolver. Successful results are cached in memory for CACHE_TTL_MS.
 *
 * Returns { name, avatar, ok }; `ok: false` means the lookup FAILED and the
 * result must not be persisted (name/avatar are null placeholders in that
 * case). A successful lookup that finds no name is `ok: true` with `name: null`
 * — that's an authoritative "this address has no primary name".
 */
export async function resolveEns(address: string): Promise<EnsLookup> {
  const lower = address.toLowerCase();

  const cached = ENS_CACHE.get(lower);
  if (cached !== undefined && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { name: cached.name, avatar: cached.avatar, ok: true };
  }

  try {
    // getEnsName reads `reverseWithGateways` on the Universal Resolver, which
    // verifies the forward-resolution roundtrip on-chain and reverts with
    // ReverseAddressMismatch otherwise — viem maps that to null. So nobody can
    // claim to be vitalik.eth just by pointing their reverse record at it.
    const name = await ensClient.getEnsName({
      address: lower as `0x${string}`,
    });

    // Only names can have avatars, and we ask for the record rather than
    // assuming one exists — an unconditional metadata URL 404s for the ~2/3 of
    // named addresses that never set one.
    let avatar: string | null = null;
    if (name) {
      const record = await ensClient.getEnsText({ name, key: "avatar" });
      if (record) {
        avatar = `${ENS_METADATA_BASE}/avatar/${encodeURIComponent(name)}`;
      }
    }

    const result: EnsResult = { name: name || null, avatar };
    ENS_CACHE.set(lower, { ...result, cachedAt: Date.now() });
    return { ...result, ok: true };
  } catch {
    // RPC error — transient. Don't cache, don't persist.
    return { name: null, avatar: null, ok: false };
  }
}

/**
 * Resolve an address to its ENS name/avatar and store the result in the ens_names table.
 * Skips the zero address. Uses in-memory cache to avoid duplicate HTTP calls.
 *
 * @param context - Ponder event handler context (only context.db is used)
 * @param address - The Ethereum address to resolve
 * @returns The resolved ENS name, or null (kept for backward compat with callers)
 */
export async function resolveAndStoreEns(
  context: EnsWriteContext,
  address: string,
): Promise<string | null> {
  const lower = address.toLowerCase();

  // Skip zero address
  if (lower === ZERO_ADDRESS) return null;

  // Resolve (uses in-memory cache internally)
  const { name, avatar, ok } = await resolveEns(lower);

  // Failed lookup: leave any existing row untouched (don't wipe a good name)
  // and don't write a fresh null (which would poison the cache and block
  // re-resolution). The address gets another chance on its next event.
  if (!ok) return null;

  // Write to ens_names table (upsert)
  try {
    await context.db
      .insert(ensNames)
      .values({
        address: lower as `0x${string}`,
        name,
        avatar,
        resolvedAt: BigInt(Math.floor(Date.now() / 1000)),
      })
      .onConflictDoUpdate({
        name,
        avatar,
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
 * @param context - Ponder event handler context (only context.db is used)
 * @param addresses - Array of Ethereum addresses
 * @returns Map of lowercase address -> ENS name (or null)
 */
export async function batchResolveAndStoreEns(
  context: EnsWriteContext,
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

  // Resolve in parallel with a concurrency limit so we don't burst the RPC
  // (each named address costs two calls: reverse lookup + avatar text record).
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
 *
 * Titles are typically formatted as "# Title" in markdown on the first
 * non-empty line. Many clients (Noundry, some Nouns.wtf drafts) prefix
 * the description with blank lines before the heading — the naive
 * `split('\n')[0]` returned "" for those and produced empty titles for
 * ~an accumulating count of proposals. Skip leading blank/whitespace-only
 * lines before looking for the heading.
 */
export function extractTitle(description: string | undefined | null): string {
  if (!description) return "";
  for (const line of description.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    // Remove markdown heading prefix. If the first non-empty line isn't a
    // heading (no leading `#`), still use it verbatim as the title — that's
    // how some very old proposals encode it.
    return trimmed.replace(/^#+\s*/, "").trim();
  }
  return "";
}
