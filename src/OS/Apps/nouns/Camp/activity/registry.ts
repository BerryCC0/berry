/**
 * Activity Registry
 *
 * One `ActivityDefinition` per `ActivityType`. The `satisfies` clause at the
 * bottom enforces compile-time completeness — TypeScript errors if anyone
 * adds a variant to `ActivityType` without adding a registry entry.
 *
 * Producer sharing: definitions that read from the same SQL query share a
 * `producerKey`. Exactly one definition per producerKey carries `buildQuery`
 * (the orchestrator's module-load assertion in PR3 will enforce this).
 *
 *   proposals       — proposalCreated (owns query) + 5 outcome defs + voting_started placeholder
 *   auctions        — auctionSettled (owns query) + auctionStarted
 *   proposalVersions — proposalUpdated
 *   candidateVersions — candidateUpdated
 *   transfers       — transfer
 *   delegations     — delegation
 *   candidates      — candidateCreated
 *   candidateFeedback — candidateFeedback
 *   candidateSignatures — candidate_sponsored
 *   cancelledSignatures — signature_canceled
 *   votes           — vote
 *   proposalFeedback — proposalFeedback
 *   swaps           — swap
 *   propdates       — propdate
 *
 * See docs/ACTIVITY-REFACTOR.md for the architecture writeup.
 */

import type { ActivityDefinition } from './types';
import type { ActivityType } from '../types';

import { voteDefinition } from './definitions/vote';
import { proposalFeedbackDefinition } from './definitions/proposalFeedback';
import { candidateSignatureDefinition } from './definitions/candidateSignature';
import { propdateDefinition } from './definitions/propdate';
import { signatureCanceledDefinition } from './definitions/signatureCanceled';
import { candidateCreatedDefinition } from './definitions/candidateCreated';
import { candidateFeedbackDefinition } from './definitions/candidateFeedback';
import { candidateUpdatedDefinition } from './definitions/candidateUpdated';
import { delegationDefinition } from './definitions/delegation';
import { swapDefinition } from './definitions/swap';
import { transferDefinition } from './definitions/transfer';
import { proposalCreatedDefinition } from './definitions/proposalCreated';
import { proposalUpdatedDefinition } from './definitions/proposalUpdated';
import { proposalVotingStartedDefinition } from './definitions/proposalVotingStarted';
import {
  proposalSucceededDefinition,
  proposalDefeatedDefinition,
  proposalCancelledDefinition,
  proposalQueuedDefinition,
  proposalExecutedDefinition,
} from './definitions/proposalOutcomes';
import { auctionSettledDefinition } from './definitions/auctionSettled';
import { auctionStartedDefinition } from './definitions/auctionStarted';

export const ACTIVITY_REGISTRY = {
  // ---- Voting + feedback ----
  vote: voteDefinition,
  proposal_feedback: proposalFeedbackDefinition,

  // ---- Proposal lifecycle (all share producerKey: 'proposals') ----
  proposal_created: proposalCreatedDefinition,
  proposal_voting_started: proposalVotingStartedDefinition,
  proposal_succeeded: proposalSucceededDefinition,
  proposal_defeated: proposalDefeatedDefinition,
  proposal_cancelled: proposalCancelledDefinition,
  proposal_queued: proposalQueuedDefinition,
  proposal_executed: proposalExecutedDefinition,
  proposal_updated: proposalUpdatedDefinition,

  // ---- Candidate cluster ----
  candidate_created: candidateCreatedDefinition,
  candidate_feedback: candidateFeedbackDefinition,
  candidate_sponsored: candidateSignatureDefinition,
  candidate_updated: candidateUpdatedDefinition,
  signature_canceled: signatureCanceledDefinition,

  // ---- Noun lifecycle ----
  noun_transfer: transferDefinition,
  noun_delegation: delegationDefinition,
  noun_swap: swapDefinition,

  // ---- Auctions (share producerKey: 'auctions') ----
  auction_settled: auctionSettledDefinition,
  auction_started: auctionStartedDefinition,

  // ---- Propdates ----
  propdate_posted: propdateDefinition,

  // The `any` widens TRow so heterogeneous per-definition row types (ApiVoteRow,
  // ApiPropdateRow, …) all satisfy the constraint. TRow is in a contravariant
  // position via `processRows`, so a strict `ActivityDefinition<unknown>` would
  // reject every typed definition. See `types.ts` for the rationale.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as const satisfies Record<ActivityType, ActivityDefinition<any>>;
