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
      SELECT id, proposer, title, description, status,
             targets, "values", signatures, calldatas,
             start_block, end_block, start_timestamp, end_timestamp,
             proposal_threshold, quorum_votes,
             for_votes, against_votes, abstain_votes,
             execution_eta, signers, update_period_end_block,
             objection_period_end_block, on_timelock_v_1,
             client_id, created_timestamp, created_block, tx_hash
      FROM ponder_live.proposals
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
