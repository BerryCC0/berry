/**
 * GET /api/nouns-v2/auctions/[id]
 *
 * Returns full detail for a single NounV2 auction:
 *   - auction: lifecycle row (winner, amount, settler, times, settled) — may be
 *     null for a minted noun that was never auctioned (e.g. founder reward).
 *   - noun:    trait seed + owner + slobber/burned flags (null if not minted).
 *   - bids:    every bid on that noun, highest first.
 *
 * Powers the V2 auction app's historical browsing (search / prev / next).
 */

import { NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const nounId = parseInt(id, 10);
  if (!Number.isInteger(nounId) || nounId < 0) {
    return NextResponse.json({ error: 'Invalid noun id' }, { status: 400 });
  }

  try {
    const sql = ponderSql();

    const [auctionRows, nounRows, bidRows] = await Promise.all([
      sql`
        SELECT
          a.noun_id,
          a.start_time,
          a.end_time,
          a.winner,
          a.amount,
          a.settled,
          a.settler_address,
          a.settled_timestamp
        FROM ponder_live.nouns_v2_auctions a
        WHERE a.noun_id = ${nounId}
        LIMIT 1
      `,
      sql`
        SELECT
          n.id,
          n.background,
          n.body,
          n.accessory,
          n.head,
          n.glasses,
          n.owner,
          n.is_slobber,
          n.burned
        FROM ponder_live.nouns_v2 n
        WHERE n.id = ${nounId}
        LIMIT 1
      `,
      sql`
        SELECT
          b.id,
          b.bidder,
          b.amount,
          b.extended,
          b.block_timestamp,
          b.tx_hash
        FROM ponder_live.nouns_v2_auction_bids b
        WHERE b.noun_id = ${nounId}
        ORDER BY b.amount DESC
      `,
    ]);

    const a = auctionRows[0];
    const n = nounRows[0];

    const auction = a
      ? {
          nounId: String(a.noun_id),
          startTime: String(a.start_time),
          endTime: String(a.end_time),
          winner: a.winner ?? null,
          amount: a.amount != null ? String(a.amount) : null,
          settled: Boolean(a.settled),
          settlerAddress: a.settler_address ?? null,
          settledTimestamp:
            a.settled_timestamp != null ? String(a.settled_timestamp) : null,
        }
      : null;

    const noun = n
      ? {
          id: String(n.id),
          background: Number(n.background),
          body: Number(n.body),
          accessory: Number(n.accessory),
          head: Number(n.head),
          glasses: Number(n.glasses),
          owner: n.owner ?? null,
          isSlobber: Boolean(n.is_slobber),
          burned: Boolean(n.burned),
        }
      : null;

    const bids = bidRows.map((b) => ({
      id: String(b.id),
      bidder: b.bidder,
      amount: String(b.amount),
      extended: Boolean(b.extended),
      blockTimestamp: String(b.block_timestamp),
      txHash: b.tx_hash,
    }));

    return NextResponse.json({ auction, noun, bids });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
