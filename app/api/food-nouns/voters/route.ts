/**
 * GET /api/food-nouns/voters
 *
 * Returns Food Nouns delegates — anyone with non-zero voting power — plus
 * each delegate's owned-token count from food_nouns. Mirrors the pattern of
 * /api/voters for mainline Nouns: query the voters table directly, sort by
 * voting power desc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

interface VoterRow {
  address: string;
  owned: number;
  delegatedVotes: number;
  totalVotes: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const sql = ponderSql();
    const rows = await sql`
      SELECT v.address,
             v.delegated_votes,
             v.total_votes,
             (SELECT COUNT(*)::int
              FROM ponder_live.food_nouns
              WHERE owner = v.address) AS owned
      FROM ponder_live.food_voters v
      WHERE v.delegated_votes > 0
      ORDER BY v.delegated_votes DESC, v.address ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const voters: VoterRow[] = rows.map((r) => ({
      address: String(r.address),
      owned: Number(r.owned),
      delegatedVotes: Number(r.delegated_votes),
      totalVotes: Number(r.total_votes),
    }));

    return NextResponse.json({ voters });
  } catch (err) {
    console.error('Failed to fetch food voters:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
