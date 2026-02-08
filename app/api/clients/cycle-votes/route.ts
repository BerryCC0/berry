/**
 * Cycle Votes API Route
 * Returns vote weight summed by client_id for a given set of proposal IDs,
 * both aggregated and per-proposal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const proposalIdsParam = searchParams.get('proposalIds');

  if (!proposalIdsParam) {
    return NextResponse.json({ votes: [], votesByProposal: [] });
  }

  const proposalIds = proposalIdsParam.split(',').map(Number).filter((n) => !isNaN(n));
  if (proposalIds.length === 0) {
    return NextResponse.json({ votes: [], votesByProposal: [] });
  }

  try {
    const sql = ponderSql();

    // Run both queries in parallel
    const [aggregateRows, perProposalRows] = await Promise.all([
      // Aggregate vote weight per client across all given proposals
      sql`
        SELECT v.client_id, COALESCE(SUM(v.votes), 0)::int as vote_count, c.name
        FROM ponder_live.votes v
        LEFT JOIN ponder_live.clients c ON v.client_id = c.client_id
        WHERE v.proposal_id = ANY(${proposalIds}) AND v.client_id IS NOT NULL
        GROUP BY v.client_id, c.name
        ORDER BY vote_count DESC
      `,
      // Per-proposal, per-client vote weight breakdown
      sql`
        SELECT v.proposal_id, v.client_id, COALESCE(SUM(v.votes), 0)::int as vote_count, c.name
        FROM ponder_live.votes v
        LEFT JOIN ponder_live.clients c ON v.client_id = c.client_id
        WHERE v.proposal_id = ANY(${proposalIds}) AND v.client_id IS NOT NULL
        GROUP BY v.proposal_id, v.client_id, c.name
        ORDER BY v.proposal_id, vote_count DESC
      `,
    ]);

    return NextResponse.json({
      votes: aggregateRows.map((r: any) => ({
        clientId: r.client_id,
        name: r.name,
        voteCount: r.vote_count,
      })),
      votesByProposal: perProposalRows.map((r: any) => ({
        proposalId: r.proposal_id,
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
