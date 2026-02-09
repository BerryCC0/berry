/**
 * Current Cycle Auctions API Route
 * Returns auction data for the current reward cycle (auctions >= firstNounId)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ponderSql } from '@/app/lib/ponder-db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const firstNounId = searchParams.get('firstNounId');

  if (!firstNounId) {
    return NextResponse.json({ error: 'firstNounId required' }, { status: 400 });
  }

  try {
    const sql = ponderSql();
    const nounId = parseInt(firstNounId, 10);

    // Run queries in parallel: settled auctions in cycle, bids by client, winning bids by client
    const [auctions, bidsByClient, winsByClient] = await Promise.all([
      // All settled auctions in the current cycle
      sql`
        SELECT a.noun_id, a.winner, a.amount::text as amount, a.client_id,
               b_winning.client_id as winning_bid_client_id,
               c.name as client_name
        FROM ponder_live.auctions a
        LEFT JOIN ponder_live.auction_bids b_winning
          ON b_winning.noun_id = a.noun_id
          AND b_winning.bidder = a.winner
          AND b_winning.amount = a.amount
        LEFT JOIN ponder_live.clients c
          ON b_winning.client_id = c.client_id
        WHERE a.noun_id >= ${nounId} AND a.settled = true
        ORDER BY a.noun_id DESC
      `,
      // All bids by client in cycle (includes bids with no client)
      sql`
        SELECT b.client_id, c.name, COUNT(*)::int as bid_count,
               COALESCE(SUM(b.amount), 0)::text as bid_volume
        FROM ponder_live.auction_bids b
        LEFT JOIN ponder_live.clients c ON b.client_id = c.client_id
        WHERE b.noun_id >= ${nounId}
        GROUP BY b.client_id, c.name
        ORDER BY bid_count DESC
      `,
      // Winning bids by client in cycle (includes wins with no client)
      sql`
        SELECT b.client_id, c.name, COUNT(*)::int as win_count,
               COALESCE(SUM(b.amount), 0)::text as win_volume
        FROM ponder_live.auction_bids b
        INNER JOIN ponder_live.auctions a
          ON b.noun_id = a.noun_id AND b.bidder = a.winner AND b.amount = a.amount
        LEFT JOIN ponder_live.clients c ON b.client_id = c.client_id
        WHERE a.noun_id >= ${nounId} AND a.settled = true
        GROUP BY b.client_id, c.name
        ORDER BY win_count DESC
      `,
    ]);

    return NextResponse.json({
      auctions: auctions.map((a: any) => ({
        nounId: a.noun_id,
        winner: a.winner,
        amount: a.amount,
        winningBidClientId: a.winning_bid_client_id,
        clientName: a.client_name,
      })),
      bidsByClient: bidsByClient.map((r: any) => ({
        clientId: r.client_id ?? -1,
        name: r.name ?? 'No Client',
        bidCount: r.bid_count,
        bidVolume: r.bid_volume,
      })),
      winsByClient: winsByClient.map((r: any) => ({
        clientId: r.client_id ?? -1,
        name: r.name ?? 'No Client',
        winCount: r.win_count,
        winVolume: r.win_volume,
      })),
    });
  } catch (error) {
    console.error('[API] Failed to fetch cycle auctions:', error);
    return NextResponse.json({ error: 'Failed to fetch cycle auctions' }, { status: 500 });
  }
}
