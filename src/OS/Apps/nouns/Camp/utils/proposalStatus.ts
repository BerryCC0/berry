/**
 * Proposal Status Utilities
 *
 * Single source of truth for determining a proposal's display status and
 * vote bar dimensions.  Previously duplicated in ProposalListView, Digest,
 * VoterDetailView, and ProposalDetailView.
 *
 * Status determination is non-trivial because the on-chain status may lag
 * behind reality: a proposal whose endBlock has passed might still report
 * ACTIVE until someone calls `queue()` or `execute()`.  These helpers
 * reconcile the indexed status with the current block number to give the
 * best-available display status.
 */

import type { ProposalStatus } from '../types';

// -----------------------------------------------------------------------
// Block estimation
// -----------------------------------------------------------------------

/**
 * Reference point for block estimation (post-Merge, 12s slots).
 * Block 21,000,000 was mined at unix 1733438615 (Dec 5, 2024).
 */
const REFERENCE_BLOCK = 21_000_000;
const REFERENCE_TIMESTAMP = 1_733_438_615;

/** Post-Merge Ethereum block time (12-second slots). */
export const SECONDS_PER_BLOCK = 12;

/** Estimate the current Ethereum block from wall-clock time. */
export function estimateCurrentBlock(): number {
  const elapsed = Math.floor(Date.now() / 1000) - REFERENCE_TIMESTAMP;
  return REFERENCE_BLOCK + Math.floor(elapsed / SECONDS_PER_BLOCK);
}

// -----------------------------------------------------------------------
// Status badge
// -----------------------------------------------------------------------

export interface StatusBadge {
  /** Display label (e.g. "ONGOING", "DEFEATED") */
  label: string;
  /** Semantic key usable as a CSS-module class name.
   *  One of: executed, cancelled, queued, defeated, succeeded, ongoing, upcoming */
  key: string;
}

/**
 * Derive the display status badge for a proposal.
 *
 * Accepts raw string values from the API so callers don't need to parse
 * numbers up front.
 */
export function getProposalStatusBadge(
  status: ProposalStatus | string,
  forVotes: string | number,
  againstVotes: string | number,
  quorumVotes: string | number,
  endBlock: string | number,
  currentBlock: number,
): StatusBadge | null {
  const forNum = Number(forVotes);
  const againstNum = Number(againstVotes);
  const quorum = Number(quorumVotes) || 1;

  const isPending = status === 'PENDING' || status === 'UPDATABLE';
  const isQueued = status === 'QUEUED';
  const isExecuted = status === 'EXECUTED';
  const isCancelled = status === 'CANCELLED';
  const isVetoed = status === 'VETOED';
  const votingEnded = Number(endBlock) <= currentBlock;

  const isActive =
    (status === 'ACTIVE' || status === 'OBJECTION_PERIOD') && !votingEnded;

  const isDefeated =
    status === 'DEFEATED' ||
    (votingEnded &&
      !isQueued &&
      !isExecuted &&
      !isCancelled &&
      !isVetoed &&
      (forNum < quorum || againstNum > forNum));

  const isSucceeded =
    status === 'SUCCEEDED' ||
    (votingEnded &&
      !isQueued &&
      !isExecuted &&
      !isCancelled &&
      !isVetoed &&
      !isDefeated &&
      forNum >= quorum &&
      forNum > againstNum);

  // Order matters — check terminal states first, then calculated, then active
  if (isExecuted) return { label: 'EXECUTED', key: 'executed' };
  if (isCancelled) return { label: 'CANCELLED', key: 'cancelled' };
  if (isVetoed) return { label: 'VETOED', key: 'cancelled' };
  if (isQueued) return { label: 'QUEUED', key: 'queued' };
  if (isDefeated) return { label: 'DEFEATED', key: 'defeated' };
  if (isSucceeded) return { label: 'SUCCEEDED', key: 'succeeded' };
  if (isActive) return { label: 'ONGOING', key: 'ongoing' };
  if (isPending) return { label: 'UPCOMING', key: 'upcoming' };
  return null;
}

// -----------------------------------------------------------------------
// Vote bar dimensions
// -----------------------------------------------------------------------

export interface VoteBarWidths {
  /** For-votes bar width (%) */
  forWidth: number;
  /** Quorum marker position (%) */
  quorumPosition: number;
  /** Abstain bar width (%) */
  abstainWidth: number;
  /** Against bar width (%) */
  againstWidth: number;
  /** Gap between for-bar and quorum when for < quorum (%) */
  gapWidth: number;
}

/**
 * Compute vote bar segment widths as percentages of a unified scale.
 */
export function getVoteBarWidths(
  forVotes: string | number,
  againstVotes: string | number,
  abstainVotes: string | number,
  quorumVotes: string | number,
): VoteBarWidths {
  const forNum = Number(forVotes);
  const againstNum = Number(againstVotes);
  const abstainNum = Number(abstainVotes) || 0;
  const quorum = Number(quorumVotes) || 1;

  const leftExtent = Math.max(forNum, quorum);
  const rightExtent = abstainNum + againstNum;
  const totalScale = leftExtent + rightExtent || 1;

  const forWidth = (forNum / totalScale) * 100;
  const quorumPosition = (quorum / totalScale) * 100;
  const abstainWidth = (abstainNum / totalScale) * 100;
  const againstWidth = (againstNum / totalScale) * 100;
  const gapWidth = forNum < quorum ? quorumPosition - forWidth : 0;

  return { forWidth, quorumPosition, abstainWidth, againstWidth, gapWidth };
}
