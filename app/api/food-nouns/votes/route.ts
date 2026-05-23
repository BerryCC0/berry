/**
 * GET /api/food-nouns/votes?proposalId=X
 *
 * Returns Food Nouns governor votes from the local Ponder index.
 * Filters to a single proposalId when provided. Response shape preserved
 * for backwards compatibility with existing frontend consumers that
 * previously read these from Etherscan.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

interface VoteCastRow {
  voter: string;
  proposalId: string;
  support: number;
  votes: string;
  reason: string;
  blockNumber: string;
  /** Unix seconds — block timestamp the vote was cast in. */
  timestamp: string;
  txHash: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const proposalIdParam = searchParams.get('proposalId');

  try {
    const sql = ponderSql();
    const rows = proposalIdParam
      ? await sql`
          SELECT voter, proposal_id, support, votes, reason,
                 block_number, block_timestamp, tx_hash
          FROM ponder_live.food_votes
          WHERE proposal_id = ${parseInt(proposalIdParam)}
          ORDER BY block_number DESC
        `
      : await sql`
          SELECT voter, proposal_id, support, votes, reason,
                 block_number, block_timestamp, tx_hash
          FROM ponder_live.food_votes
          ORDER BY block_number DESC
        `;

    const votes: VoteCastRow[] = rows.map((r) => ({
      voter: r.voter,
      proposalId: String(r.proposal_id),
      support: Number(r.support),
      votes: String(r.votes),
      reason: r.reason ?? '',
      blockNumber: String(r.block_number),
      timestamp: String(r.block_timestamp),
      txHash: r.tx_hash,
    }));

    return NextResponse.json({ votes });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
