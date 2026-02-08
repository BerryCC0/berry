/**
 * Cycle Votes API Route
 * Returns vote weight summed by client_id for a given set of proposal IDs
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const proposalIdsParam = searchParams.get('proposalIds');

  if (!proposalIdsParam) {
    return NextResponse.json({ votes: [] });
  }

  const proposalIds = proposalIdsParam.split(',').map(Number).filter((n) => !isNaN(n));
  if (proposalIds.length === 0) {
    return NextResponse.json({ votes: [] });
  }

  try {
    const sql = ponderSql();

    const rows = await sql`
      SELECT v.client_id, COALESCE(SUM(v.votes), 0)::int as vote_count, c.name
      FROM ponder_live.votes v
      LEFT JOIN ponder_live.clients c ON v.client_id = c.client_id
      WHERE v.proposal_id = ANY(${proposalIds}) AND v.client_id IS NOT NULL
      GROUP BY v.client_id, c.name
      ORDER BY vote_count DESC
    `;

    return NextResponse.json({
      votes: rows.map((r: any) => ({
        clientId: r.client_id,
        name: r.name,
        voteCount: r.vote_count,
      })),
    });
  } catch (error) {
    console.error('[API] Failed to fetch cycle votes:', error);
    return NextResponse.json({ error: 'Failed to fetch cycle votes' }, { status: 500 });
  }
}
