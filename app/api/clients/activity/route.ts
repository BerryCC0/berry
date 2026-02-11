/**
 * Client Activity API Route
 * Returns recent votes, proposals, and auction wins attributed to clients
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

async function fetchDynamicQuorum(proposalId: number): Promise<string | null> {
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
      return BigInt(json.result).toString();
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const voteLimit = Math.min(parseInt(searchParams.get('voteLimit') || String(limit)), 5000);
  const proposalLimit = Math.min(parseInt(searchParams.get('proposalLimit') || String(limit)), 1000);

  try {
    const sql = ponderSql();

    const clientFilter = clientId ? parseInt(clientId) : null;

    // Fetch recent client votes, proposals, withdrawals, and bids in parallel
    const [voteRows, proposalRows, withdrawalRows, bidRows] = await Promise.all([
      // Recent votes via clients
      clientFilter
        ? sql`
            SELECT v.id, v.voter, v.proposal_id, v.support, v.votes,
                   v.client_id, v.block_timestamp::text as block_timestamp,
                   c.name as client_name, p.title as proposal_title
            FROM ponder_live.votes v
            LEFT JOIN ponder_live.clients c ON v.client_id = c.client_id
            LEFT JOIN ponder_live.proposals p ON v.proposal_id = p.id
            WHERE v.client_id = ${clientFilter}
            ORDER BY v.block_timestamp DESC
            LIMIT ${voteLimit}
          `
        : sql`
            SELECT v.id, v.voter, v.proposal_id, v.support, v.votes,
                   v.client_id, v.block_timestamp::text as block_timestamp,
                   c.name as client_name, p.title as proposal_title
            FROM ponder_live.votes v
            INNER JOIN ponder_live.clients c ON v.client_id = c.client_id
            LEFT JOIN ponder_live.proposals p ON v.proposal_id = p.id
            ORDER BY v.block_timestamp DESC
            LIMIT ${voteLimit}
          `,
      // Proposals submitted via clients
      clientFilter
        ? sql`
            SELECT p.id, p.title, p.proposer, p.status, p.client_id,
                   p.created_timestamp::text as created_timestamp,
                   p.for_votes, p.against_votes, p.abstain_votes,
                   p.quorum_votes::text as quorum_votes,
                   p.start_block::text as start_block,
                   p.end_block::text as end_block,
                   c.name as client_name
            FROM ponder_live.proposals p
            LEFT JOIN ponder_live.clients c ON p.client_id = c.client_id
            WHERE p.client_id = ${clientFilter}
            ORDER BY p.created_timestamp DESC
            LIMIT ${proposalLimit}
          `
        : sql`
            SELECT p.id, p.title, p.proposer, p.status, p.client_id,
                   p.created_timestamp::text as created_timestamp,
                   p.for_votes, p.against_votes, p.abstain_votes,
                   p.quorum_votes::text as quorum_votes,
                   p.start_block::text as start_block,
                   p.end_block::text as end_block,
                   c.name as client_name
            FROM ponder_live.proposals p
            INNER JOIN ponder_live.clients c ON p.client_id = c.client_id
            ORDER BY p.created_timestamp DESC
            LIMIT ${proposalLimit}
          `,
      // Recent withdrawals
      clientFilter
        ? sql`
            SELECT w.id, w.client_id, w.amount::text as amount,
                   w.to as to_address,
                   w.block_timestamp::text as block_timestamp,
                   c.name as client_name
            FROM ponder_live.client_withdrawals w
            LEFT JOIN ponder_live.clients c ON w.client_id = c.client_id
            WHERE w.client_id = ${clientFilter}
            ORDER BY w.block_timestamp DESC
            LIMIT ${limit}
          `
        : sql`
            SELECT w.id, w.client_id, w.amount::text as amount,
                   w.to as to_address,
                   w.block_timestamp::text as block_timestamp,
                   c.name as client_name
            FROM ponder_live.client_withdrawals w
            LEFT JOIN ponder_live.clients c ON w.client_id = c.client_id
            ORDER BY w.block_timestamp DESC
            LIMIT ${limit}
          `,
      // Recent bids via clients
      clientFilter
        ? sql`
            SELECT b.id, b.noun_id, b.bidder, b.amount::text as amount,
                   b.client_id, b.block_timestamp::text as block_timestamp,
                   c.name as client_name
            FROM ponder_live.auction_bids b
            LEFT JOIN ponder_live.clients c ON b.client_id = c.client_id
            WHERE b.client_id = ${clientFilter}
            ORDER BY b.block_timestamp DESC
            LIMIT ${limit}
          `
        : sql`
            SELECT b.id, b.noun_id, b.bidder, b.amount::text as amount,
                   b.client_id, b.block_timestamp::text as block_timestamp,
                   c.name as client_name
            FROM ponder_live.auction_bids b
            INNER JOIN ponder_live.clients c ON b.client_id = c.client_id
            ORDER BY b.block_timestamp DESC
            LIMIT ${limit}
          `,
    ]);

    // Fetch dynamic quorum only for proposals in the active voting lifecycle
    const activeProposals = proposalRows.filter(
      (p: any) => ACTIVE_LIFECYCLE_STATUSES.includes(p.status)
    );
    const quorumMap = new Map<number, string>();
    if (activeProposals.length > 0) {
      await Promise.all(
        activeProposals.map(async (p: any) => {
          const quorum = await fetchDynamicQuorum(Number(p.id));
          if (quorum !== null) {
            quorumMap.set(Number(p.id), quorum);
          }
        })
      );
    }

    // Override quorum_votes with dynamic values where available
    const proposalsWithDynamicQuorum = proposalRows.map((p: any) => {
      const dynamicQuorum = quorumMap.get(Number(p.id));
      if (dynamicQuorum !== undefined) {
        return { ...p, quorum_votes: dynamicQuorum };
      }
      return p;
    });

    return NextResponse.json({
      votes: voteRows,
      proposals: proposalsWithDynamicQuorum,
      withdrawals: withdrawalRows,
      bids: bidRows,
    });
  } catch (error) {
    console.error('[API] Failed to fetch client activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
