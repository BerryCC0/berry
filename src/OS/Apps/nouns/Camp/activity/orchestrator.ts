/**
 * Activity Orchestrator
 *
 * Three exports, plus a module-load invariant check.
 *
 *   - `runActivityQueries(sql, ctx)` — SERVER. Walks the registry, dedupes
 *     by producerKey, runs every buildQuery via `safeAll`, returns the
 *     producer-keyed JSON used by `/api/activity`. The wire format is
 *     literally `{ [producerKey]: rows[] }` — no rename layer.
 *
 *   - `processViaRegistry(data, types, ctx)` — CLIENT. Takes the API JSON,
 *     runs every definition's `processRows` for the requested types, returns
 *     concatenated `ActivityItem[]`. Multiple definitions sharing a
 *     producerKey each consume the same rows independently (e.g. the 7
 *     proposal_* defs all read the `proposals` producer rows).
 *
 *   - `postProcess(items)` — sorts by timestamp DESC. Mutates and returns
 *     the array. Single sort site so future cross-type logic has a home.
 *
 * **Module-load invariant:** exactly one buildQuery per producerKey, and
 * every producerKey referenced by a definition must have a buildQuery
 * owner. Violations throw at app boot, not at request time. Backed by
 * `__tests__/registry.test.ts`.
 */

import type { Sql } from 'postgres';
import type { ActivityItem, ActivityType } from '../types';
import type { ProcessContext, ProducerKey } from './types';
import { ACTIVITY_REGISTRY } from './registry';
import { safeAll, type SafeAllResult } from '@/app/lib/safeAll';

// =============================================================================
// API WIRE FORMAT
// =============================================================================

/**
 * The JSON shape returned by `/api/activity`. Keys are producer identifiers
 * (matching `ProducerKey`). Values are row arrays as returned by Postgres —
 * each definition's `TRow` interface narrows them at the consumption site.
 *
 * `_failedProducers` is set in dev only by `safeAll` to surface which
 * producers rejected; stripped in production to avoid leaking query names
 * to clients.
 */
export type ActivityApiResponseShape =
  & Partial<Record<ProducerKey, unknown[]>>
  & { _failedProducers?: string[] };

// =============================================================================
// MODULE-LOAD INVARIANT
// =============================================================================

import type { ActivityDefinition } from './types';

/**
 * Validate the registry invariants:
 *   1. Exactly one buildQuery per producerKey (no two definitions claiming
 *      the same producer's SQL).
 *   2. Every producerKey referenced by a definition has a buildQuery owner
 *      (no definition consuming rows that nothing fetches).
 *
 * Exported so the unit test can call it with synthetic registries. Called
 * once at module load against the real registry — throws at app boot if
 * violated, surfacing during `next build` in CI rather than at request
 * time in production.
 *
 * @param registry Map-like of definitions to validate.
 * @throws Error with a descriptive message on the first violation.
 */
export function assertRegistryInvariants(
  registry: Record<string, ActivityDefinition<unknown>>,
): void {
  const buildQueryOwners = new Map<ProducerKey, ActivityType>();
  const referencedProducers = new Set<ProducerKey>();

  for (const def of Object.values(registry)) {
    referencedProducers.add(def.producerKey);
    if (def.buildQuery) {
      const existing = buildQueryOwners.get(def.producerKey);
      if (existing) {
        throw new Error(
          `[activity registry] producer "${def.producerKey}" has two buildQuery owners: ${existing} + ${def.type}. ` +
            `Exactly one definition per producerKey may carry buildQuery.`,
        );
      }
      buildQueryOwners.set(def.producerKey, def.type);
    }
  }

  for (const producer of referencedProducers) {
    if (!buildQueryOwners.has(producer)) {
      throw new Error(
        `[activity registry] producer "${producer}" is referenced by at least one definition but has no buildQuery owner. ` +
          `One definition per producerKey must implement buildQuery.`,
      );
    }
  }
}

// Run once at module load against the real registry.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
assertRegistryInvariants(ACTIVITY_REGISTRY as Record<string, ActivityDefinition<any>>);

// =============================================================================
// SERVER: runActivityQueries
// =============================================================================

/**
 * Walk the registry, dedupe by producerKey, run every buildQuery via
 * `safeAll`. Returns producer-keyed rows ready to JSON-serialize.
 *
 * The invariant check above guarantees exactly one buildQuery per producer,
 * so it's safe to skip duplicate definitions here.
 */
export async function runActivityQueries(
  sql: Sql,
  ctx: { since: string; limit: number },
): Promise<SafeAllResult<Record<ProducerKey, ReturnType<NonNullable<typeof ACTIVITY_REGISTRY[ActivityType]['buildQuery']>>>>> {
  const queries = {} as Record<ProducerKey, ReturnType<NonNullable<typeof ACTIVITY_REGISTRY[ActivityType]['buildQuery']>>>;
  const seen = new Set<ProducerKey>();

  for (const def of Object.values(ACTIVITY_REGISTRY)) {
    if (!def.buildQuery) continue;
    if (seen.has(def.producerKey)) continue;
    seen.add(def.producerKey);
    queries[def.producerKey] = def.buildQuery({ sql, since: ctx.since, limit: ctx.limit });
  }

  return safeAll('activity', queries);
}

// =============================================================================
// CLIENT: processViaRegistry, postProcess
// =============================================================================

/**
 * Run every definition's `processRows` for the given types against the
 * fetched API data. Returns concatenated items in arrival order; sort with
 * `postProcess`.
 *
 * Definitions without a buildQuery (like `proposal_voting_started`, which
 * is intentionally empty) still get their processRows called against an
 * empty rows array — they're expected to return `[]`.
 */
export function processViaRegistry(
  data: ActivityApiResponseShape,
  types: readonly ActivityType[],
  ctx: ProcessContext,
): ActivityItem[] {
  const out: ActivityItem[] = [];

  for (const type of types) {
    const def = ACTIVITY_REGISTRY[type];
    if (!def) {
      // Should be unreachable thanks to the `satisfies` check on the
      // registry, but log defensively in case of dynamic key paths.
      console.warn(`[activity] no registry definition for type "${type}"`);
      continue;
    }

    const rows = (data[def.producerKey] ?? []) as unknown[];
    out.push(...def.processRows(rows as never, ctx));
  }

  return out;
}

/**
 * Final ordering step. Currently just timestamp DESC — kept as a separate
 * function so future cross-type post-processing (dedup, grouping across
 * types) has a natural home.
 *
 * Mutates the input array. Returns the same reference for chaining.
 */
export function postProcess(items: ActivityItem[]): ActivityItem[] {
  items.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  return items;
}
