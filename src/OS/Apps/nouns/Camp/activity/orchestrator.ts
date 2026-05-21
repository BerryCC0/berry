/**
 * Activity Orchestrator
 *
 * Bridges the registry to the existing data shape. Two exports:
 *
 *   - `processViaRegistry(data, types, ctx)` — client-side. Takes the API
 *     response JSON, runs the registry's `processRows` for the requested
 *     activity types, returns merged `ActivityItem[]`. Used by
 *     `useActivityFeed` during the migration window where some types are
 *     registry-driven and others still go through legacy `processX` calls.
 *
 *   - `runActivityQueries(sql, ctx)` — server-side. Stub in PR1, implemented
 *     in PR3 when the API route becomes registry-driven.
 */

import type { Sql } from 'postgres';
import type { ActivityItem, ActivityType } from '../types';
import type { ProcessContext, ProducerKey } from './types';
import { ACTIVITY_REGISTRY } from './registry';

/**
 * The shape `useActivityFeed` receives from `/api/activity`. Keys are
 * camelCased producer names — this matches what `app/api/activity/route.ts`
 * returns today. The orchestrator owns the camelCase ↔ producerKey mapping
 * so individual definitions never have to think about it.
 */
export interface ActivityApiResponseShape {
  votes?: unknown[];
  proposalFeedback?: unknown[];
  proposals?: unknown[];
  candidates?: unknown[];
  candidateFeedback?: unknown[];
  candidateSignatures?: unknown[];
  transfers?: unknown[];
  delegations?: unknown[];
  auctions?: unknown[];
  proposalVersions?: unknown[];
  candidateVersions?: unknown[];
  swaps?: unknown[];
  propdates?: unknown[];
  cancelledSignatures?: unknown[];
  /** Dev-only diagnostic from safeAll. */
  _failedProducers?: string[];
}

/**
 * Map ProducerKey → the JSON field name the API route currently returns.
 * Today these happen to match 1:1, but encoding the mapping explicitly
 * keeps the registry decoupled from the wire format. PR3 will likely
 * collapse this to identity once everything goes through the registry.
 */
const API_KEY_BY_PRODUCER: Record<ProducerKey, keyof ActivityApiResponseShape> = {
  votes: 'votes',
  proposalFeedback: 'proposalFeedback',
  proposals: 'proposals',
  candidates: 'candidates',
  candidateFeedback: 'candidateFeedback',
  candidateSignatures: 'candidateSignatures',
  transfers: 'transfers',
  delegations: 'delegations',
  auctions: 'auctions',
  proposalVersions: 'proposalVersions',
  candidateVersions: 'candidateVersions',
  swaps: 'swaps',
  propdates: 'propdates',
  cancelledSignatures: 'cancelledSignatures',
};

/**
 * Run the registered `processRows` for the given activity types against the
 * fetched API data. Returns concatenated items in arrival order; the caller
 * is responsible for the final timestamp sort (kept there for now so the
 * coexistence with legacy `processX` outputs is a single sort site).
 *
 * Types not yet migrated (those whose registry entry has no `buildQuery`)
 * are silently skipped — the legacy `processX` path still handles them.
 * Once PR2 promotes a placeholder to a real definition, just add its type
 * to the caller's `types` array.
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
    // Placeholder definitions: no buildQuery means they haven't been
    // migrated yet. The legacy processX handles this type; skip here.
    if (!def.buildQuery) continue;

    const apiKey = API_KEY_BY_PRODUCER[def.producerKey];
    const rows = (data[apiKey] ?? []) as unknown[];
    out.push(...def.processRows(rows as never, ctx));
  }

  return out;
}

/**
 * Server-side counterpart. Will run every definition's `buildQuery` (deduped
 * by producerKey) under `safeAll` semantics and return producer-keyed rows.
 *
 * Implemented in PR3 — PR1 keeps `app/api/activity/route.ts` running the
 * legacy explicit `safeAll({ votes: sql\`...\`, ... })` block so the
 * migration can land in two halves.
 */
export async function runActivityQueries(
  _sql: Sql,
  _ctx: { since: string; limit: number },
): Promise<ActivityApiResponseShape> {
  throw new Error(
    'runActivityQueries is a PR3 stub. PR1 uses the explicit safeAll block in app/api/activity/route.ts.',
  );
}
