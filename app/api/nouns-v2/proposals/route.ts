/**
 * GET /api/nouns-v2/proposals?limit=100
 *
 * Returns NounV2 governance proposals in reverse-id order.
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
        p."startBlock"        AS start_block,
        p."endBlock"          AS end_block,
        p.eta,
        p."forVotes"          AS for_votes,
        p."againstVotes"      AS against_votes,
        p."abstainVotes"      AS abstain_votes,
        p.canceled,
        p.queued,
        p.executed,
        p."createdTimestamp"  AS created_timestamp,
        p."createdBlock"      AS created_block,
        p."txHash"            AS tx_hash
      FROM ponder_live.nouns_v2_proposals p
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
