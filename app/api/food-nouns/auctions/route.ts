/**
 * GET /api/food-nouns/auctions
 *
 * Returns settled Food Nouns auctions from the local Ponder index.
 * Response shape preserved for backwards compatibility with existing
 * frontend consumers that previously read these from Etherscan.
 */

import { NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

interface SettledAuction {
  nounId: string;
  winner: string;
  amount: string;
  blockNumber: string;
  txHash: string;
}

export async function GET() {
  try {
    const sql = ponderSql();
    // Bids carry the actual settle tx hash; the auction row tracks block_number
    // of the settle event. Pull the settle-tx hash via the winning bid where
    // available, falling back to empty when no bid was recorded (shouldn't
    // happen for settled auctions but keeps the response well-formed).
    const rows = await sql`
      SELECT a.noun_id, a.winner, a.amount, a.block_number,
             (
               SELECT b.tx_hash FROM ponder_live.food_auction_bids b
               WHERE b.noun_id = a.noun_id AND b.bidder = a.winner
               ORDER BY b.block_number DESC
               LIMIT 1
             ) AS tx_hash
      FROM ponder_live.food_auctions a
      WHERE a.settled = true
      ORDER BY a.noun_id DESC
    `;

    const auctions: SettledAuction[] = rows.map((r) => ({
      nounId: String(r.noun_id),
      winner: r.winner ?? '',
      amount: String(r.amount ?? '0'),
      blockNumber: String(r.block_number),
      txHash: r.tx_hash ?? '',
    }));

    return NextResponse.json({ auctions });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
