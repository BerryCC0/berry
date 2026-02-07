/**
 * Voters API Route
 * Queries ponder_live.voters for delegate data
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const offset = parseInt(searchParams.get('offset') || '0');
  const sort = searchParams.get('sort') || 'power';

  try {
    const sql = ponderSql();

    // Sort mapping
    let orderBy = 'delegated_votes DESC';
    if (sort === 'votes') orderBy = 'total_votes DESC';
    if (sort === 'represented') orderBy = 'delegated_votes DESC'; // best proxy

    const rows = await sql`
      SELECT address, ens_name, delegated_votes, nouns_represented,
             total_votes, last_vote_at, first_seen_at
      FROM ponder_live.voters
      WHERE delegated_votes > 0
      ORDER BY ${sql.unsafe(orderBy)}
      LIMIT ${limit} OFFSET ${offset}
    `;

    return NextResponse.json({ voters: rows });
  } catch (error) {
    console.error('Failed to fetch voters:', error);
    return NextResponse.json({ error: 'Failed to fetch voters' }, { status: 500 });
  }
}
