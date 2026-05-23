/**
 * GET /api/food-nouns/proposals
 *
 * Returns Food Nouns governor proposals from the local Ponder index.
 * Response shape preserved for backwards compatibility with existing
 * frontend consumers that previously read these from Etherscan.
 */

import { NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

interface ProposalSummary {
  id: string;
  proposer: string;
  description: string;
  startBlock: string;
  endBlock: string;
  blockNumber: string;
  /** Unix seconds — the block timestamp when the proposal was submitted. */
  timestamp: string;
  txHash: string;
}

export async function GET() {
  try {
    const sql = ponderSql();
    const rows = await sql`
      SELECT id, proposer, description, start_block, end_block,
             created_block, created_timestamp, tx_hash
      FROM ponder_live.food_proposals
      ORDER BY id DESC
    `;

    const proposals: ProposalSummary[] = rows.map((r) => ({
      id: String(r.id),
      proposer: r.proposer,
      description: r.description ?? '',
      startBlock: String(r.start_block),
      endBlock: String(r.end_block),
      blockNumber: String(r.created_block),
      timestamp: String(r.created_timestamp),
      txHash: r.tx_hash,
    }));

    return NextResponse.json({ proposals });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
