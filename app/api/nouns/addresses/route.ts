/**
 * Nouns Addresses API Route
 * GET /api/nouns/addresses - Get unique settlers and winners with ENS names
 * Used by Probe's OWNER and SETTLER filter dropdowns
 *
 * Queries Ponder's ponder_live schema
 */

import { NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    const sql = ponderSql();

    // Get unique settlers with ENS and count
    const settlers = await sql`
      SELECT
        LOWER(settled_by_address) as address,
        MAX(settled_by_ens) as ens,
        COUNT(*)::int as count
      FROM ponder_live.nouns
      WHERE settled_by_address IS NOT NULL
      GROUP BY LOWER(settled_by_address)
      ORDER BY count DESC
    `;

    // Get unique winners with ENS and count
    const winners = await sql`
      SELECT
        LOWER(winner_address) as address,
        MAX(winner_ens) as ens,
        COUNT(*)::int as count
      FROM ponder_live.nouns
      WHERE winner_address IS NOT NULL
      GROUP BY LOWER(winner_address)
      ORDER BY count DESC
    `;

    return NextResponse.json({ settlers, winners });
  } catch (error) {
    console.error('[API] Failed to fetch addresses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch addresses' },
      { status: 500 }
    );
  }
}
