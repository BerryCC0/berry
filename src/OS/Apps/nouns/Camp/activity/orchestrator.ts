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
 * is responsible for the final timestamp sort via `postProcess`.
 *
 * **Producer dedup:** multiple definitions can share a producerKey (e.g.
 * the 7 proposal_* defs all read from the `proposals` producer). We track
 * which producer rows we've already passed to which definitions so each
 * definition runs exactly once per request.
 *
 * **buildQuery is not consulted here** — this function consumes data already
 * fetched by the API route. Definitions without a buildQuery (like
 * `proposal_voting_started`, intentionally empty) still get their processRows
 * called; they're expected to return `[]`.
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

    const apiKey = API_KEY_BY_PRODUCER[def.producerKey];
    const rows = (data[apiKey] ?? []) as unknown[];
    out.push(...def.processRows(rows as never, ctx));
  }

  return out;
}

/**
 * Final ordering step. Currently just timestamp DESC — but kept as a
 * separate function so the orchestrator's sort site is single and obvious,
 * and so future cross-type post-processing (dedup, grouping across types,
 * etc.) has a natural home.
 *
 * Mutates the input array for efficiency. Returns the same reference.
 */
export function postProcess(items: ActivityItem[]): ActivityItem[] {
  items.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  return items;
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
