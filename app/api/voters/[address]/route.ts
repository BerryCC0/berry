/**
 * Single Voter API Route
 * Queries ponder_live for voter detail with votes, proposals, and candidates
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const addr = address.toLowerCase();

  try {
    const sql = ponderSql();

    // Fetch voter, votes, proposals, candidates, and nouns owned in parallel
    const [voterRows, voteRows, proposalRows, candidateRows, nounsOwnedRows, delegationRows, sponsoredRows] = await Promise.all([
      // Voter/delegate data
      sql`
        SELECT address, ens_name, delegated_votes, nouns_represented,
               total_votes, last_vote_at, first_seen_at
        FROM ponder_live.voters
        WHERE address = ${addr}
      `,
      // Recent votes with proposal info
      sql`
        SELECT v.id, v.voter, v.proposal_id, v.support, v.votes,
               v.reason, v.block_timestamp, v.tx_hash,
               p.title as proposal_title
        FROM ponder_live.votes v
        LEFT JOIN ponder_live.proposals p ON v.proposal_id = p.id
        WHERE v.voter = ${addr}
        ORDER BY v.block_timestamp DESC
        LIMIT 500
      `,
      // Proposals created by this address
      sql`
        SELECT id, title, status, for_votes, against_votes, abstain_votes,
               quorum_votes, start_block, end_block, created_timestamp, signers
        FROM ponder_live.proposals
        WHERE proposer = ${addr}
        ORDER BY created_timestamp DESC
        LIMIT 50
      `,
      // Candidates by this address
      sql`
        SELECT id, slug, proposer, title, created_timestamp
        FROM ponder_live.candidates
        WHERE proposer = ${addr} AND canceled = false
        ORDER BY created_timestamp DESC
        LIMIT 50
      `,
      // Nouns currently owned by this address (based on latest transfers)
      sql`
        SELECT id, background, body, accessory, head, glasses
        FROM ponder_live.nouns
        WHERE owner = ${addr}
        ORDER BY id ASC
      `,
      // Who is delegating to this address (delegators)
      sql`
        SELECT DISTINCT delegator
        FROM ponder_live.delegations
        WHERE to_delegate = ${addr}
        AND delegator != ${addr}
        ORDER BY delegator
        LIMIT 50
      `,
      // Proposals where this address is a signer (sponsored)
      sql`
        SELECT id, title, status, proposer, for_votes, against_votes,
               abstain_votes, quorum_votes, start_block, end_block, created_timestamp
        FROM ponder_live.proposals
        WHERE signers::text LIKE ${'%' + addr + '%'}
        ORDER BY created_timestamp DESC
        LIMIT 50
      `,
    ]);

    const voter = voterRows[0] || null;

    // Find who this address is delegating to (most recent delegation FROM this address)
    const delegatingToRows = await sql`
      SELECT to_delegate
      FROM ponder_live.delegations
      WHERE delegator = ${addr}
      ORDER BY block_timestamp DESC
      LIMIT 1
    `;
    const delegatingTo = delegatingToRows[0]?.to_delegate || null;

    return NextResponse.json({
      voter: {
        id: voter?.address || addr,
        delegatedVotes: voter?.delegated_votes?.toString() || '0',
        totalVotes: voter?.total_votes || 0,
        ensName: voter?.ens_name || null,
        nounsRepresented: voter?.nouns_represented || [],
        recentVotes: voteRows.map((v: any) => ({
          id: v.id,
          voter: v.voter,
          proposalId: String(v.proposal_id),
          proposalTitle: v.proposal_title || 'Untitled',
          support: v.support,
          votes: String(v.votes),
          reason: v.reason,
          blockTimestamp: String(v.block_timestamp),
        })),
        proposals: proposalRows.map((p: any) => ({
          id: String(p.id),
          title: p.title || 'Untitled Proposal',
          status: p.status,
          forVotes: String(p.for_votes),
          againstVotes: String(p.against_votes),
          abstainVotes: String(p.abstain_votes),
          quorumVotes: String(p.quorum_votes),
          startBlock: String(p.start_block),
          endBlock: String(p.end_block),
          createdTimestamp: String(p.created_timestamp),
          signers: p.signers || [],
        })),
        candidates: candidateRows.map((c: any) => ({
          id: c.id,
          slug: c.slug,
          proposer: c.proposer,
          title: c.title || 'Untitled Candidate',
          createdTimestamp: String(c.created_timestamp),
        })),
        sponsored: sponsoredRows.map((p: any) => ({
          id: String(p.id),
          title: p.title || 'Untitled Proposal',
          status: p.status,
          proposer: p.proposer,
          forVotes: String(p.for_votes),
          againstVotes: String(p.against_votes),
          abstainVotes: String(p.abstain_votes),
          quorumVotes: String(p.quorum_votes),
          startBlock: String(p.start_block),
          endBlock: String(p.end_block),
          createdTimestamp: String(p.created_timestamp),
        })),
        nounsOwned: nounsOwnedRows.map((n: any) => ({
          id: String(n.id),
          seed: {
            background: n.background,
            body: n.body,
            accessory: n.accessory,
            head: n.head,
            glasses: n.glasses,
          },
        })),
        delegatingTo,
        delegators: delegationRows.map((d: any) => d.delegator),
      },
    });
  } catch (error) {
    console.error('Failed to fetch voter:', error);
    return NextResponse.json({ error: 'Failed to fetch voter' }, { status: 500 });
  }
}
