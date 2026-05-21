/**
 * Proposal status derivation — pure functions used by the proposal cluster
 * of activity definitions.
 *
 * The proposal API row carries a raw `status` string plus block numbers
 * (start_block, end_block) and vote tallies. We derive a normalized status
 * (active | pending | succeeded | defeated), a `votingEnded` flag, and an
 * `endTimestamp` that prefers a recorded lifecycle timestamp over a
 * block-based estimate. The same row produces either ONE proposal_created
 * item (active/pending) OR one outcome item (succeeded/defeated/cancelled/
 * queued/executed) — never both — so each definition in the proposal cluster
 * filters by checking its specific bucket of this output.
 *
 * Source: extracted from `useActivityFeed.ts:186-294` (processProposals).
 * Behavior preserved byte-equal; the only structural change is splitting
 * the per-row item emission into the calling definitions.
 */

import { BLOCK_TIME_SECONDS } from './transferFilters';

/** Subset of the proposals API row needed for status derivation. */
export interface ProposalStatusInput {
  id: string | number;
  status: string | null;
  start_block: string;
  end_block: string;
  for_votes: string | null;
  against_votes: string | null;
  quorum_votes: string | null;
  created_timestamp: string;
  cancelled_timestamp: string | null;
  queued_timestamp: string | null;
  executed_timestamp: string | null;
  vetoed_timestamp: string | null;
}

export type DerivedStatus = 'active' | 'pending' | 'succeeded' | 'defeated';

export interface DerivedProposalStatus {
  /** Normalized status. `undefined` only when input.status is unrecognized AND no currentBlock is available. */
  derivedStatus: DerivedStatus | undefined;
  /** True if voting period has concluded (terminal status OR currentBlock past end_block). */
  votingEnded: boolean;
  /**
   * Unix-seconds string for the moment voting ended. Computed lazily — only
   * meaningful when `votingEnded === true`. Prefers a recorded lifecycle
   * timestamp (cancelled/queued/executed/vetoed) over a block-based estimate.
   */
  endTimestamp: string;
  isCancelled: boolean;
  isExecuted: boolean;
  isQueued: boolean;
}

/** The five mutually-exclusive proposal outcomes. */
export type ProposalOutcome = 'succeeded' | 'defeated' | 'cancelled' | 'queued' | 'executed';

/**
 * Bucket a derived status into one of the five outcome types, or `null` if
 * voting hasn't ended. The priority order matches the legacy code at
 * `useActivityFeed.ts:302-356`: cancelled > executed > queued > succeeded >
 * defeated. The 5 outcome activity definitions all call this helper so they
 * stay mutually exclusive — one row produces exactly one outcome item.
 */
export function classifyOutcome(d: DerivedProposalStatus): ProposalOutcome | null {
  if (!d.votingEnded) return null;
  if (d.isCancelled) return 'cancelled';
  if (d.isExecuted) return 'executed';
  if (d.isQueued) return 'queued';
  if (d.derivedStatus === 'succeeded') return 'succeeded';
  if (d.derivedStatus === 'defeated') return 'defeated';
  return null;
}

/**
 * Derive the proposal's lifecycle state from API row + (optionally) the
 * current head block number.
 *
 * Without `currentBlock` we fall back to the row's raw `status` string when
 * it's a known value, otherwise to vote-tally heuristics. With `currentBlock`
 * we prefer block-position derivation (active/pending) but still honor
 * terminal statuses.
 */
export function deriveProposalStatus(
  row: ProposalStatusInput,
  currentBlock: number | undefined,
): DerivedProposalStatus {
  const startBlock = Number(row.start_block);
  const endBlock = Number(row.end_block);
  const forVotes = BigInt(row.for_votes || '0');
  const againstVotes = BigInt(row.against_votes || '0');
  const quorumVotes = BigInt(row.quorum_votes || '0');
  const status = (row.status || '').toUpperCase();

  const isCancelled = status === 'CANCELLED';
  const isExecuted = status === 'EXECUTED';
  const isQueued = status === 'QUEUED';
  const isTerminal =
    isCancelled ||
    isExecuted ||
    isQueued ||
    status === 'DEFEATED' ||
    status === 'VETOED' ||
    status === 'EXPIRED';

  let derivedStatus: DerivedStatus | undefined;
  let votingEnded = false;

  if (currentBlock !== undefined) {
    if (isTerminal) {
      votingEnded = true;
      if (isCancelled || status === 'DEFEATED' || status === 'VETOED' || status === 'EXPIRED') {
        derivedStatus = 'defeated';
      } else {
        derivedStatus = 'succeeded';
      }
    } else if (currentBlock < startBlock) {
      derivedStatus = 'pending';
    } else if (currentBlock >= startBlock && currentBlock <= endBlock) {
      derivedStatus = 'active';
    } else {
      votingEnded = true;
      derivedStatus = forVotes > againstVotes && forVotes >= quorumVotes ? 'succeeded' : 'defeated';
    }
  } else {
    if (status === 'PENDING') derivedStatus = 'pending';
    else if (status === 'ACTIVE') derivedStatus = 'active';
    else if (['SUCCEEDED', 'QUEUED', 'EXECUTED'].includes(status)) {
      derivedStatus = 'succeeded';
      votingEnded = true;
    } else if (['DEFEATED', 'VETOED', 'CANCELLED', 'EXPIRED'].includes(status)) {
      derivedStatus = 'defeated';
      votingEnded = true;
    } else {
      const totalVotes = forVotes + againstVotes;
      if (totalVotes > BigInt(0)) {
        derivedStatus = forVotes > againstVotes && forVotes >= quorumVotes ? 'succeeded' : 'defeated';
        votingEnded = true;
      } else {
        derivedStatus = 'pending';
      }
    }
  }

  const endTimestamp = computeEndTimestamp(row, currentBlock, {
    isCancelled,
    isExecuted,
    isQueued,
    isVetoed: status === 'VETOED',
    endBlock,
    startBlock,
  });

  return { derivedStatus, votingEnded, endTimestamp, isCancelled, isExecuted, isQueued };
}

interface EndTimestampCtx {
  isCancelled: boolean;
  isExecuted: boolean;
  isQueued: boolean;
  isVetoed: boolean;
  endBlock: number;
  startBlock: number;
}

/**
 * Three-tier resolution for "when did voting end":
 *  1. Recorded lifecycle timestamp from the indexer (most accurate)
 *  2. currentBlock-derived "blocks ago" estimate when voting has concluded
 *  3. Fallback: created_timestamp + (endBlock - startBlock) × BLOCK_TIME_SECONDS,
 *     capped at now so early-terminated proposals don't show future times.
 */
function computeEndTimestamp(
  row: ProposalStatusInput,
  currentBlock: number | undefined,
  ctx: EndTimestampCtx,
): string {
  const now = Math.floor(Date.now() / 1000);

  const lifecycleTimestamp = ctx.isCancelled
    ? row.cancelled_timestamp
    : ctx.isQueued
      ? row.queued_timestamp
      : ctx.isExecuted
        ? row.executed_timestamp
        : ctx.isVetoed
          ? row.vetoed_timestamp
          : null;

  if (lifecycleTimestamp) return String(lifecycleTimestamp);

  if (currentBlock !== undefined && currentBlock > ctx.endBlock) {
    const blocksAgo = currentBlock - ctx.endBlock;
    const secondsAgo = blocksAgo * BLOCK_TIME_SECONDS;
    return String(now - secondsAgo);
  }

  const createdTime = Number(row.created_timestamp);
  const estimatedEnd = createdTime + Math.abs(ctx.endBlock - ctx.startBlock) * BLOCK_TIME_SECONDS;
  return String(Math.min(estimatedEnd, now));
}
