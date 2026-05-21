/**
 * Activity Registry
 *
 * One `ActivityDefinition` per `ActivityType`. The `satisfies` clause at the
 * bottom enforces compile-time completeness — TypeScript errors if anyone
 * adds a variant to `ActivityType` without adding a registry entry.
 *
 * Migration status (see docs/ACTIVITY-REFACTOR.md):
 *   PR1: vote, proposal_feedback, candidate_sponsored, propdate_posted
 *   PR2: proposal_*, candidate_*, noun_transfer, noun_delegation, noun_swap, auction_*
 *   PR3: cleanup + module-load assertion + tests
 *
 * Placeholder definitions (PR2/PR3 entries below) carry NO `buildQuery` and
 * `processRows: () => []`. The orchestrator silently skips them — the legacy
 * `processX` functions in `useActivityFeed.ts` still handle these types until
 * their migration PR lands.
 */

import type { ActivityDefinition } from './types';
import type { ActivityType } from '../types';

import { voteDefinition } from './definitions/vote';
import { proposalFeedbackDefinition } from './definitions/proposalFeedback';
import { candidateSignatureDefinition } from './definitions/candidateSignature';
import { propdateDefinition } from './definitions/propdate';
import { signatureCanceledDefinition } from './definitions/signatureCanceled';

/** Empty processor reused across placeholder entries. Saves arrow allocations. */
const noopProcess = () => [];

/**
 * Builds a placeholder definition. Inlined here so each placeholder line in
 * the registry stays short and the MIGRATE comment is the most prominent
 * thing on the line.
 */
function placeholder<T extends ActivityType>(
  type: T,
  producerKey: ActivityDefinition['producerKey'],
): ActivityDefinition {
  return { type, producerKey, processRows: noopProcess };
}

export const ACTIVITY_REGISTRY = {
  // ---- Migrated in PR1 ----
  vote: voteDefinition,
  proposal_feedback: proposalFeedbackDefinition,
  candidate_sponsored: candidateSignatureDefinition,
  propdate_posted: propdateDefinition,

  // ---- New type (sponsor cancellation tracking, added between PR1 and PR2)
  signature_canceled: signatureCanceledDefinition,

  // ---- MIGRATE: PR2 (proposals producer — 7 types share one query) ----
  proposal_created: placeholder('proposal_created', 'proposals'),
  proposal_voting_started: placeholder('proposal_voting_started', 'proposals'),
  proposal_succeeded: placeholder('proposal_succeeded', 'proposals'),
  proposal_defeated: placeholder('proposal_defeated', 'proposals'),
  proposal_cancelled: placeholder('proposal_cancelled', 'proposals'),
  proposal_queued: placeholder('proposal_queued', 'proposals'),
  proposal_executed: placeholder('proposal_executed', 'proposals'),
  proposal_updated: placeholder('proposal_updated', 'proposalVersions'),

  // ---- MIGRATE: PR2 (candidates cluster) ----
  candidate_created: placeholder('candidate_created', 'candidates'),
  candidate_feedback: placeholder('candidate_feedback', 'candidateFeedback'),
  candidate_updated: placeholder('candidate_updated', 'candidateVersions'),

  // ---- MIGRATE: PR2 (transfers/delegations/swaps/auctions) ----
  noun_transfer: placeholder('noun_transfer', 'transfers'),
  noun_delegation: placeholder('noun_delegation', 'delegations'),
  noun_swap: placeholder('noun_swap', 'swaps'),
  auction_settled: placeholder('auction_settled', 'auctions'),
  auction_started: placeholder('auction_started', 'auctions'),
  // The `any` widens TRow so heterogeneous per-definition row types (ApiVoteRow,
  // ApiPropdateRow, …) all satisfy the constraint. TRow is in a contravariant
  // position via `processRows`, so a strict `ActivityDefinition<unknown>` would
  // reject every typed definition. See `types.ts` for the rationale.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as const satisfies Record<ActivityType, ActivityDefinition<any>>;
