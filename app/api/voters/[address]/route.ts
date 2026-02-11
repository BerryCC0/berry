/**
 * Single Voter API Route
 * Queries ponder_live for voter detail with votes, proposals, and candidates
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns/contracts';

// Dynamic quorum: keccak256("quorumVotes(uint256)") = 0x0f7b1f08
const ETH_RPC = 'https://eth.llamarpc.com';
const QUORUM_VOTES_SELECTOR = '0x0f7b1f08';
// Only fetch dynamic quorum for proposals in the active voting lifecycle (typically 1-5).
// Historical proposals use the indexed quorum value, avoiding excessive RPC calls.
const ACTIVE_LIFECYCLE_STATUSES = ['ACTIVE', 'OBJECTION_PERIOD', 'PENDING', 'UPDATABLE'];

/**
 * Fetch dynamic quorum for a single proposal from the Nouns DAO contract.
 */
async function fetchDynamicQuorum(proposalId: number): Promise<bigint | null> {
  try {
    const paddedId = BigInt(proposalId).toString(16).padStart(64, '0');
    const callData = QUORUM_VOTES_SELECTOR + paddedId;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(ETH_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: NOUNS_ADDRESSES.governor, data: callData }, 'latest'],
        id: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const json = await response.json();
    if (json.result && json.result !== '0x') {
      return BigInt(json.result);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Batch-fetch dynamic quorum for proposals in the active voting lifecycle.
 */
async function fetchDynamicQuorumBatch(proposals: any[]): Promise<Map<number, bigint>> {
  const results = new Map<number, bigint>();
  const activeProposals = proposals.filter((p: any) => ACTIVE_LIFECYCLE_STATUSES.includes(p.status));
  if (activeProposals.length === 0) return results;

  await Promise.all(
    activeProposals.map(async (p: any) => {
      const quorum = await fetchDynamicQuorum(Number(p.id));
      if (quorum !== null) {
        results.set(Number(p.id), quorum);
      }
    })
  );

  return results;
}

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

    // Fetch dynamic quorum for active lifecycle proposals and sponsored proposals
    const allProposalRows = [...proposalRows, ...sponsoredRows];
    const quorumMap = await fetchDynamicQuorumBatch(allProposalRows);

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
        proposals: proposalRows.map((p: any) => {
          const dynamicQuorum = quorumMap.get(Number(p.id));
          return {
            id: String(p.id),
            title: p.title || 'Untitled Proposal',
            status: p.status,
            forVotes: String(p.for_votes),
            againstVotes: String(p.against_votes),
            abstainVotes: String(p.abstain_votes),
            quorumVotes: dynamicQuorum !== undefined ? dynamicQuorum.toString() : String(p.quorum_votes),
            startBlock: String(p.start_block),
            endBlock: String(p.end_block),
            createdTimestamp: String(p.created_timestamp),
            signers: p.signers || [],
          };
        }),
        candidates: candidateRows.map((c: any) => ({
          id: c.id,
          slug: c.slug,
          proposer: c.proposer,
          title: c.title || 'Untitled Candidate',
          createdTimestamp: String(c.created_timestamp),
        })),
        sponsored: sponsoredRows.map((p: any) => {
          const dynamicQuorum = quorumMap.get(Number(p.id));
          return {
            id: String(p.id),
            title: p.title || 'Untitled Proposal',
            status: p.status,
            proposer: p.proposer,
            forVotes: String(p.for_votes),
            againstVotes: String(p.against_votes),
            abstainVotes: String(p.abstain_votes),
            quorumVotes: dynamicQuorum !== undefined ? dynamicQuorum.toString() : String(p.quorum_votes),
            startBlock: String(p.start_block),
            endBlock: String(p.end_block),
            createdTimestamp: String(p.created_timestamp),
          };
        }),
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
