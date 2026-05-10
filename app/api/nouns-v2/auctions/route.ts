/**
 * GET /api/nouns-v2/auctions?limit=50
 *
 * Returns settled NounV2 auctions in reverse chronological order, with the
 * winning bid + winner address from the indexer.
 */

import { NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitRaw = parseInt(url.searchParams.get('limit') ?? '50', 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

  try {
    const sql = ponderSql();
    const rows = await sql`
      SELECT
        a."nounId"            AS noun_id,
        a."startTime"         AS start_time,
        a."endTime"           AS end_time,
        a.winner,
        a.amount,
        a.settled,
        a."settlerAddress"    AS settler_address,
        a."settledTimestamp"  AS settled_timestamp
      FROM ponder_live.nouns_v2_auctions a
      WHERE a.settled = TRUE
      ORDER BY a."nounId" DESC
      LIMIT ${limit}
    `;

    const auctions = rows.map((r) => ({
      nounId: String(r.noun_id),
      startTime: String(r.start_time),
      endTime: String(r.end_time),
      winner: r.winner,
      amount: r.amount != null ? String(r.amount) : null,
      settlerAddress: r.settler_address,
      settledTimestamp: r.settled_timestamp != null ? String(r.settled_timestamp) : null,
    }));

    return NextResponse.json({ auctions });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
