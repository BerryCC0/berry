/**
 * Auction API Route
 * Queries ponder_live.auctions for auction data
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    const sql = ponderSql();

    if (id) {
      // Fetch specific auction by noun ID
      const [auctionRows, bidRows, nounRows] = await Promise.all([
        sql`
          SELECT noun_id, start_time, end_time, winner, amount,
                 settled, client_id, settler_address
          FROM ponder_live.auctions
          WHERE noun_id = ${parseInt(id)}
        `,
        sql`
          SELECT id, noun_id, bidder, amount, extended, client_id,
                 block_timestamp, tx_hash
          FROM ponder_live.auction_bids
          WHERE noun_id = ${parseInt(id)}
          ORDER BY amount DESC
        `,
        sql`
          SELECT id, background, body, accessory, head, glasses, owner
          FROM ponder_live.nouns
          WHERE id = ${parseInt(id)}
        `,
      ]);

      if (auctionRows.length === 0 && nounRows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      return NextResponse.json({
        auction: auctionRows[0] || null,
        bids: bidRows,
        noun: nounRows[0] || null,
      });
    }

    // Fetch current/latest auction
    const [auctionRows] = await Promise.all([
      sql`
        SELECT noun_id, start_time, end_time, winner, amount,
               settled, client_id, settler_address
        FROM ponder_live.auctions
        ORDER BY start_time DESC
        LIMIT 1
      `,
    ]);

    if (auctionRows.length === 0) {
      return NextResponse.json({ auction: null, bids: [], noun: null });
    }

    const auction = auctionRows[0];
    const nounId = auction.noun_id;

    const [bidRows, nounRows] = await Promise.all([
      sql`
        SELECT id, noun_id, bidder, amount, extended, client_id,
               block_timestamp, tx_hash
        FROM ponder_live.auction_bids
        WHERE noun_id = ${nounId}
        ORDER BY amount DESC
      `,
      sql`
        SELECT id, background, body, accessory, head, glasses, owner
        FROM ponder_live.nouns
        WHERE id = ${nounId}
      `,
    ]);

    return NextResponse.json({
      auction,
      bids: bidRows,
      noun: nounRows[0] || null,
    });
  } catch (error) {
    console.error('Failed to fetch auction:', error);
    return NextResponse.json({ error: 'Failed to fetch auction' }, { status: 500 });
  }
}
