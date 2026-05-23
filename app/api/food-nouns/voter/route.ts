/**
 * GET /api/food-nouns/voter?address=0x…
 *
 * Returns one voter's full profile, in the shape Camp's VoterDetailView
 * expects so the FN view can mirror that aesthetic:
 *   - Voting power + balance + delegate target
 *   - Represented Nouns (id + svg + owner) — every Noun whose voting power is
 *     currently delegated to this address. The image grid uses this.
 *   - delegatingTo — who this address is currently delegating to (or null)
 *   - delegators — unique owners currently delegating TO this address (≠ self)
 *   - Vote history (with reasons + proposal titles) for the activity feed
 *   - Proposals authored (for an optional sponsored list)
 *
 * "Current delegate" semantics mirror Camp: take the latest DelegateChanged
 * row per delegator from food_delegations, default to owner if none exists
 * (the contract default for implicit self-delegators like auction winners).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

interface RepresentedNoun {
  id: number;
  svg: string;
  /** Current on-chain owner. May equal `address` (self-delegated) or differ
   *  (someone else is delegating their Noun's voting power to this address). */
  owner: string;
}

interface VoteEntry {
  proposalId: number;
  proposalTitle: string | null;
  support: number;
  votes: string;
  reason: string;
  blockNumber: string;
  timestamp: string;
  txHash: string;
}

interface ProposalEntry {
  id: number;
  title: string | null;
  state: string | null;
  createdTimestamp: string;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
}

interface VoterDetail {
  address: string;
  owned: number;
  delegatedVotes: number;
  totalVotes: number;
  firstSeenAt: string | null;
  lastVoteAt: string | null;
  /** Nouns whose voting power is currently delegated to this address. */
  nouns: RepresentedNoun[];
  /** Address this voter currently delegates to (null if never delegated). */
  delegatingTo: string | null;
  /** Unique addresses currently delegating TO this voter (excluding self). */
  delegators: string[];
  votes: VoteEntry[];
  proposals: ProposalEntry[];
}

function firstLine(description: string | null | undefined): string | null {
  if (!description) return null;
  const line = description.trim().split('\n')[0]?.trim() ?? '';
  return line.replace(/^#+\s*/, '') || null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const addressParam = searchParams.get('address');
  if (!addressParam || !addressParam.startsWith('0x')) {
    return NextResponse.json({ error: 'address query param required' }, { status: 400 });
  }
  const address = addressParam.toLowerCase();

  try {
    const sql = ponderSql();

    const [
      voterRows,
      ownedCountRows,
      representedRows,
      delegatingToRows,
      voteRows,
      proposalRows,
    ] = await Promise.all([
      sql`
        SELECT delegated_votes, total_votes, last_vote_at, first_seen_at
        FROM ponder_live.food_voters
        WHERE address = ${address}
        LIMIT 1
      `,
      // Count of Nouns this address currently owns on-chain (regardless of
      // delegation). Used as a small informational stat alongside the
      // represented count.
      sql`
        SELECT COUNT(*)::int AS owned
        FROM ponder_live.food_nouns
        WHERE owner = ${address}
      `,
      // Represented Nouns: each Noun whose owner's CURRENT delegate is this
      // address. Default delegate = owner itself (contract behavior for
      // implicit self-delegators that never called delegate()).
      sql`
        WITH latest_delegations AS (
          SELECT DISTINCT ON (delegator) delegator, to_delegate
          FROM ponder_live.food_delegations
          ORDER BY delegator, block_timestamp DESC, block_number DESC
        )
        SELECT n.id, n.svg, n.owner
        FROM ponder_live.food_nouns n
        LEFT JOIN latest_delegations ld ON ld.delegator = n.owner
        WHERE n.owner IS NOT NULL
          AND COALESCE(ld.to_delegate, n.owner) = ${address}
        ORDER BY n.id ASC
      `,
      // Who this address is currently delegating to (most recent
      // DelegateChanged FROM this address).
      sql`
        SELECT to_delegate
        FROM ponder_live.food_delegations
        WHERE delegator = ${address}
        ORDER BY block_timestamp DESC, block_number DESC
        LIMIT 1
      `,
      sql`
        SELECT v.proposal_id, v.support, v.votes, v.reason,
               v.block_number, v.block_timestamp, v.tx_hash,
               p.description
        FROM ponder_live.food_votes v
        LEFT JOIN ponder_live.food_proposals p ON p.id = v.proposal_id
        WHERE v.voter = ${address}
        ORDER BY v.block_number DESC
      `,
      sql`
        SELECT id, description, created_timestamp,
               for_votes, against_votes, abstain_votes,
               canceled, vetoed, queued, executed
        FROM ponder_live.food_proposals
        WHERE proposer = ${address}
        ORDER BY id DESC
      `,
    ]);

    const voterRow = voterRows[0];
    const ownedCount = Number(ownedCountRows[0]?.owned ?? 0);

    const nouns: RepresentedNoun[] = representedRows.map((r) => ({
      id: Number(r.id),
      svg: String(r.svg ?? ''),
      owner: String(r.owner ?? '').toLowerCase(),
    }));

    // Active delegators = unique owners of represented Nouns, excluding self.
    const delegators = Array.from(
      new Set(
        nouns
          .map((n) => n.owner)
          .filter((o): o is string => !!o && o !== address),
      ),
    ).sort();

    const delegatingToRaw = delegatingToRows[0]?.to_delegate;
    const delegatingTo = delegatingToRaw
      ? String(delegatingToRaw).toLowerCase()
      : null;

    const votes: VoteEntry[] = voteRows.map((r) => ({
      proposalId: Number(r.proposal_id),
      proposalTitle: firstLine(r.description as string | null),
      support: Number(r.support),
      votes: String(r.votes),
      reason: String(r.reason ?? ''),
      blockNumber: String(r.block_number),
      timestamp: String(r.block_timestamp),
      txHash: String(r.tx_hash),
    }));

    const proposals: ProposalEntry[] = proposalRows.map((r) => {
      let state: string | null = null;
      if (r.canceled) state = 'Canceled';
      else if (r.vetoed) state = 'Vetoed';
      else if (r.executed) state = 'Executed';
      else if (r.queued) state = 'Queued';
      return {
        id: Number(r.id),
        title: firstLine(r.description as string | null),
        state,
        createdTimestamp: String(r.created_timestamp),
        forVotes: String(r.for_votes),
        againstVotes: String(r.against_votes),
        abstainVotes: String(r.abstain_votes),
      };
    });

    const detail: VoterDetail = {
      address,
      owned: ownedCount,
      delegatedVotes: voterRow ? Number(voterRow.delegated_votes) : 0,
      totalVotes: voterRow ? Number(voterRow.total_votes) : 0,
      firstSeenAt: voterRow?.first_seen_at != null ? String(voterRow.first_seen_at) : null,
      lastVoteAt: voterRow?.last_vote_at != null ? String(voterRow.last_vote_at) : null,
      nouns,
      delegatingTo,
      delegators,
      votes,
      proposals,
    };

    return NextResponse.json(detail);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
