/**
 * Tests for the proposal status derivation. The function combines three
 * sources of truth:
 *
 *   1. Indexer-reported `status` string (sometimes terminal, sometimes not)
 *   2. Block position (`currentBlock` vs start/end blocks)
 *   3. Vote tally (for_votes vs against_votes vs quorum)
 *
 * Most regressions show up at the boundaries between these sources. The
 * table-driven cases here exercise each branch of the legacy
 * `processProposals` logic at `useActivityFeed.ts:186-294`.
 */

import { describe, it, expect } from 'vitest';
import { classifyOutcome, deriveProposalStatus } from '../proposalStatus';
import type { ProposalStatusInput } from '../proposalStatus';

function row(over: Partial<ProposalStatusInput>): ProposalStatusInput {
  return {
    id: '1',
    status: null,
    start_block: '100',
    end_block: '200',
    for_votes: '0',
    against_votes: '0',
    quorum_votes: '50',
    created_timestamp: '1700000000',
    cancelled_timestamp: null,
    queued_timestamp: null,
    executed_timestamp: null,
    vetoed_timestamp: null,
    ...over,
  };
}

describe('deriveProposalStatus — with currentBlock', () => {
  it('marks pre-start block as pending', () => {
    const d = deriveProposalStatus(row({}), 50);
    expect(d.derivedStatus).toBe('pending');
    expect(d.votingEnded).toBe(false);
  });

  it('marks in-window block as active', () => {
    const d = deriveProposalStatus(row({}), 150);
    expect(d.derivedStatus).toBe('active');
    expect(d.votingEnded).toBe(false);
  });

  it('after end block with quorum + majority → succeeded', () => {
    const d = deriveProposalStatus(row({ for_votes: '100', against_votes: '20' }), 250);
    expect(d.derivedStatus).toBe('succeeded');
    expect(d.votingEnded).toBe(true);
  });

  it('after end block missing quorum → defeated', () => {
    const d = deriveProposalStatus(row({ for_votes: '40', against_votes: '5' }), 250);
    expect(d.derivedStatus).toBe('defeated');
    expect(d.votingEnded).toBe(true);
  });

  it('terminal CANCELLED overrides block position', () => {
    const d = deriveProposalStatus(row({ status: 'CANCELLED' }), 150);
    expect(d.isCancelled).toBe(true);
    expect(d.votingEnded).toBe(true);
    expect(d.derivedStatus).toBe('defeated');
  });

  it('terminal EXECUTED overrides block position', () => {
    const d = deriveProposalStatus(row({ status: 'EXECUTED' }), 150);
    expect(d.isExecuted).toBe(true);
    expect(d.votingEnded).toBe(true);
    expect(d.derivedStatus).toBe('succeeded');
  });

  it('terminal QUEUED overrides block position', () => {
    const d = deriveProposalStatus(row({ status: 'QUEUED' }), 150);
    expect(d.isQueued).toBe(true);
    expect(d.votingEnded).toBe(true);
    expect(d.derivedStatus).toBe('succeeded');
  });

  it('terminal VETOED reads as defeated', () => {
    const d = deriveProposalStatus(row({ status: 'VETOED' }), 150);
    expect(d.derivedStatus).toBe('defeated');
    expect(d.votingEnded).toBe(true);
  });
});

describe('deriveProposalStatus — without currentBlock (fallback)', () => {
  it('PENDING status passes through', () => {
    const d = deriveProposalStatus(row({ status: 'PENDING' }), undefined);
    expect(d.derivedStatus).toBe('pending');
    expect(d.votingEnded).toBe(false);
  });

  it('ACTIVE status passes through', () => {
    const d = deriveProposalStatus(row({ status: 'ACTIVE' }), undefined);
    expect(d.derivedStatus).toBe('active');
    expect(d.votingEnded).toBe(false);
  });

  it('SUCCEEDED maps to succeeded + votingEnded', () => {
    const d = deriveProposalStatus(row({ status: 'SUCCEEDED' }), undefined);
    expect(d.derivedStatus).toBe('succeeded');
    expect(d.votingEnded).toBe(true);
  });

  it('unknown status with votes uses tally', () => {
    const d = deriveProposalStatus(
      row({ status: 'UNKNOWN_STATE', for_votes: '100', against_votes: '20' }),
      undefined,
    );
    expect(d.derivedStatus).toBe('succeeded');
    expect(d.votingEnded).toBe(true);
  });

  it('unknown status with no votes defaults to pending', () => {
    const d = deriveProposalStatus(row({ status: 'UNKNOWN_STATE' }), undefined);
    expect(d.derivedStatus).toBe('pending');
    expect(d.votingEnded).toBe(false);
  });
});

describe('endTimestamp resolution', () => {
  it('prefers lifecycle timestamp when present (cancelled)', () => {
    const d = deriveProposalStatus(
      row({ status: 'CANCELLED', cancelled_timestamp: '1700050000' }),
      250,
    );
    expect(d.endTimestamp).toBe('1700050000');
  });

  it('prefers lifecycle timestamp when present (executed)', () => {
    const d = deriveProposalStatus(
      row({ status: 'EXECUTED', executed_timestamp: '1700060000' }),
      250,
    );
    expect(d.endTimestamp).toBe('1700060000');
  });

  it('falls back to block-derived estimate when no lifecycle timestamp', () => {
    // With currentBlock = 250 and endBlock = 200, blocksAgo = 50, secondsAgo = 600.
    // endTimestamp should be roughly now - 600. We just check it's < now.
    const now = Math.floor(Date.now() / 1000);
    const d = deriveProposalStatus(row({}), 250);
    const end = Number(d.endTimestamp);
    expect(end).toBeLessThanOrEqual(now);
    // Should be in the last hour for the assumptions above.
    expect(now - end).toBeLessThan(3600);
  });

  it('caps fallback at now (terminated-early proposals)', () => {
    // No currentBlock, no lifecycle ts — uses created + (endBlock - startBlock) * 12.
    // For created in the future, that estimate would exceed now; verify the cap.
    const future = Math.floor(Date.now() / 1000) + 100000;
    const d = deriveProposalStatus(
      row({ created_timestamp: String(future), status: 'CANCELLED' }),
      undefined,
    );
    const now = Math.floor(Date.now() / 1000);
    expect(Number(d.endTimestamp)).toBeLessThanOrEqual(now);
  });
});

describe('classifyOutcome', () => {
  it('returns null when voting has not ended', () => {
    const d = deriveProposalStatus(row({}), 150); // mid-window, active
    expect(classifyOutcome(d)).toBeNull();
  });

  it('priority: cancelled wins over derivedStatus', () => {
    const d = deriveProposalStatus(row({ status: 'CANCELLED' }), 250);
    expect(classifyOutcome(d)).toBe('cancelled');
  });

  it('priority: executed wins over queued', () => {
    // Both can't be true simultaneously in real data, but the helper's
    // ladder should still be defined and consistent.
    const d = deriveProposalStatus(row({ status: 'EXECUTED' }), 250);
    expect(classifyOutcome(d)).toBe('executed');
  });

  it('queued surfaces correctly', () => {
    const d = deriveProposalStatus(row({ status: 'QUEUED' }), 250);
    expect(classifyOutcome(d)).toBe('queued');
  });

  it('succeeded (no terminal flag) maps to succeeded bucket', () => {
    const d = deriveProposalStatus(row({ for_votes: '100', against_votes: '20' }), 250);
    expect(classifyOutcome(d)).toBe('succeeded');
  });

  it('defeated maps to defeated bucket', () => {
    const d = deriveProposalStatus(row({ for_votes: '5', against_votes: '20' }), 250);
    expect(classifyOutcome(d)).toBe('defeated');
  });
});
