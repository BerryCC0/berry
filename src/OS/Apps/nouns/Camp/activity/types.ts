/**
 * Activity Registry — Type Contracts
 *
 * One `ActivityDefinition` per `ActivityType`. Definitions that share an
 * underlying SQL query share a `producerKey`; exactly one definition per
 * producerKey carries `buildQuery`, the others only have `processRows`. The
 * orchestrator dedupes by producerKey before executing queries.
 *
 * See docs/ACTIVITY-REFACTOR.md for the architecture writeup.
 */

import type { Sql, PendingQuery } from 'postgres';
import type { ActivityItem, ActivityType } from '../types';

/**
 * Stable identifier for a SQL query source. One producer can feed multiple
 * `ActivityDefinition`s (e.g. the `proposals` producer feeds `proposal_created`
 * plus 5 outcome types).
 *
 * Adding a new producer requires updating this union AND `runActivityQueries`
 * in `orchestrator.ts` — the type forces the developer to wire both sides.
 */
export type ProducerKey =
  | 'votes'
  | 'proposalFeedback'
  | 'proposals'
  | 'candidates'
  | 'candidateFeedback'
  | 'candidateSignatures'
  | 'transfers'
  | 'delegations'
  | 'auctions'
  | 'proposalVersions'
  | 'candidateVersions'
  | 'swaps'
  | 'propdates'
  | 'cancelledSignatures';

/** Context passed to `buildQuery`. The tagged template + window parameters. */
export interface QueryContext {
  sql: Sql;
  /** Unix seconds. Producers should filter `block_timestamp >= since`. */
  since: string;
  /** Row limit per query. */
  limit: number;
}

/**
 * Context passed to `processRows`. Captured once at the start of feed
 * processing — kept small to avoid stale-closure bugs.
 */
export interface ProcessContext {
  /** Current head block. Used by proposal status derivation. */
  currentBlock?: number;
  /** Unix seconds at the time processing started. */
  nowSeconds: number;
}

/**
 * A single activity type's definition.
 *
 * `TRow` is the API row shape (matches the SELECT columns from `buildQuery`).
 * `TItem` is the emitted activity item shape (a subtype of `ActivityItem`).
 */
export interface ActivityDefinition<
  TRow = unknown,
  TItem extends ActivityItem = ActivityItem,
> {
  /** The ActivityType this definition emits. Must match the registry key. */
  type: ActivityType;

  /**
   * Which SQL producer this definition consumes. Multiple definitions can
   * share a producerKey when they slice the same row set into different
   * activity types (e.g. proposal_created vs proposal_succeeded).
   */
  producerKey: ProducerKey;

  /**
   * Builds the SQL query for this producer. Set on EXACTLY ONE definition per
   * `producerKey`. The orchestrator asserts this invariant at module load.
   *
   * Returns a postgres-js `PendingQuery` (the thenable returned by `sql\`\``).
   * Pass it through to `Promise.allSettled` — no need to await before
   * returning.
   *
   * Omit on definitions that piggyback on another producer's query (e.g.
   * the 5 proposal_outcome definitions in PR2 don't set buildQuery — only
   * `proposalCreated` does, since they all read from `producers.proposals`).
   */
  // Row shape is intentionally `any[]` here, not the per-definition `TRow[]`.
  // postgres-js returns rows typed against the SQL — we coerce in `processRows`
  // where each definition's own `TRow` interface gives us a narrow type. Using
  // `any` keeps the registry-level `satisfies` check happy across heterogeneous
  // row types without forcing every caller to thread a generic.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildQuery?: (ctx: QueryContext) => PendingQuery<any[]>;

  /**
   * Filters / transforms producer rows into activity items of `this.type`.
   * Must return only items where `item.type === this.type` — the orchestrator
   * trusts this contract and does not re-filter.
   *
   * For 1:1 mappings, just `rows.map(...)`. For multi-emit producers, filter
   * to your slice (e.g. proposal_outcome defs filter on `classifyOutcome(row)`).
   *
   * Placeholders (definitions awaiting migration in a later PR) return `[]`
   * and omit `buildQuery`. The orchestrator silently ignores them.
   */
  processRows: (rows: TRow[], ctx: ProcessContext) => TItem[];
}
