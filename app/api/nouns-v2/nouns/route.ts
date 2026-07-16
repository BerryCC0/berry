/**
 * GET /api/nouns-v2/nouns
 *
 * Returns every NounV2 token joined with its auction result (winner, winning
 * bid, settler). The V2 collection is small (tens of nouns), so the Probe
 * explorer fetches the whole set once and filters / sorts client-side.
 */

import { NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = ponderSql();
    const rows = await sql`
      SELECT
        n.id,
        n.background,
        n.body,
        n.accessory,
        n.head,
        n.glasses,
        n.owner,
        n.is_slobber,
        n.burned,
        a.winner,
        a.amount,
        a.settler_address,
        a.settled
      FROM ponder_live.nouns_v2 n
      LEFT JOIN ponder_live.nouns_v2_auctions a ON a.noun_id = n.id
      ORDER BY n.id DESC
    `;

    const nouns = rows.map((r) => ({
      id: Number(r.id),
      background: Number(r.background),
      body: Number(r.body),
      accessory: Number(r.accessory),
      head: Number(r.head),
      glasses: Number(r.glasses),
      owner: r.owner ?? null,
      isSlobber: Boolean(r.is_slobber),
      burned: Boolean(r.burned),
      winner: r.winner ?? null,
      amount: r.amount != null ? String(r.amount) : null,
      settlerAddress: r.settler_address ?? null,
      settled: Boolean(r.settled),
    }));

    return NextResponse.json({ nouns, total: nouns.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
