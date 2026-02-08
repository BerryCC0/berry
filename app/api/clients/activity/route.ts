/**
 * Client Activity API Route
 * Returns recent votes, proposals, and auction wins attributed to clients
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const voteLimit = Math.min(parseInt(searchParams.get('voteLimit') || String(limit)), 5000);

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
                   c.name as client_name
            FROM ponder_live.proposals p
            LEFT JOIN ponder_live.clients c ON p.client_id = c.client_id
            WHERE p.client_id = ${clientFilter}
            ORDER BY p.created_timestamp DESC
            LIMIT ${limit}
          `
        : sql`
            SELECT p.id, p.title, p.proposer, p.status, p.client_id,
                   p.created_timestamp::text as created_timestamp,
                   p.for_votes, p.against_votes, p.abstain_votes,
                   p.quorum_votes::text as quorum_votes,
                   c.name as client_name
            FROM ponder_live.proposals p
            INNER JOIN ponder_live.clients c ON p.client_id = c.client_id
            ORDER BY p.created_timestamp DESC
            LIMIT ${limit}
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

    return NextResponse.json({
      votes: voteRows,
      proposals: proposalRows,
      withdrawals: withdrawalRows,
      bids: bidRows,
    });
  } catch (error) {
    console.error('[API] Failed to fetch client activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
