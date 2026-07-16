/**
 * GET /api/small-grants/proposals?limit=100
 *
 * Returns Small Grants proposals in reverse-id order.
 */

import { NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitRaw = parseInt(url.searchParams.get('limit') ?? '100', 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

  try {
    const sql = ponderSql();
    const rows = await sql`
      SELECT
        p.id,
        p.proposer,
        p.description,
        p.start_block,
        p.end_block,
        p.eta,
        p.for_votes,
        p.against_votes,
        p.abstain_votes,
        p.canceled,
        p.queued,
        p.executed,
        p.created_timestamp,
        p.created_block,
        p.tx_hash
      FROM ponder_live.small_grants_proposals p
      ORDER BY p.id DESC
      LIMIT ${limit}
    `;

    const proposals = rows.map((r) => ({
      id: Number(r.id),
      proposer: r.proposer,
      description: r.description,
      startBlock: String(r.start_block),
      endBlock: String(r.end_block),
      eta: r.eta != null ? String(r.eta) : null,
      forVotes: String(r.for_votes),
      againstVotes: String(r.against_votes),
      abstainVotes: String(r.abstain_votes),
      canceled: !!r.canceled,
      queued: !!r.queued,
      executed: !!r.executed,
      createdTimestamp: String(r.created_timestamp),
      createdBlock: String(r.created_block),
      txHash: r.tx_hash,
    }));

    return NextResponse.json({ proposals });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
