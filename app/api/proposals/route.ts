/**
 * Proposals API Route
 * Queries ponder_live.proposals for governance data
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');
  const filter = searchParams.get('filter') || 'all';
  const sort = searchParams.get('sort') || 'newest';

  try {
    const sql = ponderSql();

    // Build filter condition
    let statusFilter = '';
    switch (filter) {
      case 'active':
        statusFilter = `AND status IN ('ACTIVE', 'OBJECTION_PERIOD')`;
        break;
      case 'pending':
        statusFilter = `AND status IN ('PENDING', 'UPDATABLE')`;
        break;
      case 'succeeded':
        statusFilter = `AND status IN ('SUCCEEDED', 'QUEUED')`;
        break;
      case 'defeated':
        statusFilter = `AND status IN ('DEFEATED', 'VETOED', 'CANCELLED')`;
        break;
      case 'executed':
        statusFilter = `AND status = 'EXECUTED'`;
        break;
    }

    // Build sort
    let orderBy = 'created_block DESC NULLS LAST';
    if (sort === 'oldest') orderBy = 'created_block ASC NULLS LAST';
    if (sort === 'ending_soon') orderBy = 'end_block ASC NULLS LAST';

    // Use raw query with dynamic filter/sort since we can't parameterize column names
    const rows = await sql`
      SELECT p.id, p.proposer, p.title, p.description, p.status,
             p.targets, p."values", p.signatures, p.calldatas,
             p.start_block, p.end_block, p.start_timestamp, p.end_timestamp,
             p.proposal_threshold, p.quorum_votes,
             p.for_votes, p.against_votes, p.abstain_votes,
             p.execution_eta, p.signers, p.update_period_end_block,
             p.objection_period_end_block, p.on_timelock_v_1,
             p.client_id, p.created_timestamp, p.created_block, p.tx_hash,
             e.name as proposer_ens
      FROM ponder_live.proposals p
      LEFT JOIN ponder_live.ens_names e ON LOWER(p.proposer) = LOWER(e.address)
      WHERE 1=1 ${statusFilter ? sql.unsafe(statusFilter) : sql``}
      ORDER BY ${sql.unsafe(orderBy)}
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count
    const countRows = await sql`
      SELECT COUNT(*) as total FROM ponder_live.proposals
      WHERE 1=1 ${statusFilter ? sql.unsafe(statusFilter) : sql``}
    `;

    return NextResponse.json({
      proposals: rows,
      total: parseInt(countRows[0]?.total || '0'),
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to fetch proposals:', error);
    return NextResponse.json({ error: 'Failed to fetch proposals' }, { status: 500 });
  }
}
